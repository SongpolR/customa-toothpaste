import type Stripe from "stripe";
import { addEvent, createOrder, findOrderByStripeRef, findOrderBySubscription, markPaid } from "@/lib/db";
import { cartTotals } from "@/lib/formula";
import { stripe } from "@/lib/server";

// Stripe → Customa. Forward locally with:
//   stripe listen --forward-to localhost:3000/api/webhooks/stripe

export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return Response.json({ error: "webhook not configured" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(raw, sig ?? "", secret);
  } catch (e) {
    return Response.json({ error: `bad signature: ${(e as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id ?? session.client_reference_id;
      const paid = session.payment_status === "paid" || session.mode === "subscription";
      if (orderId && paid) {
        const shipping =
          (session as unknown as { collected_information?: { shipping_details?: unknown } }).collected_information
            ?.shipping_details ?? session.customer_details;
        await markPaid(orderId, {
          sessionId: session.id,
          subscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          address: (shipping as Record<string, unknown>) ?? null,
          note: "Payment received (Stripe)",
        });
      }
      break;
    }

    case "invoice.paid": {
      // Renewals of a refill subscription → create a new order to compound.
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
      if (invoice.billing_reason !== "subscription_cycle") break;
      const subId =
        invoice.parent?.subscription_details?.subscription ??
        (typeof invoice.subscription === "string" ? invoice.subscription : null);
      if (!subId) break;
      const parent = await findOrderBySubscription(typeof subId === "string" ? subId : subId.id);
      if (!parent) break;
      // Stripe retries webhooks: one refill order per invoice, however often it arrives
      if (await findOrderByStripeRef(invoice.id!)) break;
      const items = parent.items.filter((i) => i.plan !== "once");
      const { subtotal } = cartTotals(items.map((i, n) => ({ ...i, id: String(n) })));
      // Record what Stripe actually charged. Shipping was a one-time line on the
      // first invoice, so refills carry no shipping charge.
      const paid = Math.round((invoice.amount_paid ?? 0) / 100) || subtotal;
      const refill = await createOrder({
        email: parent.email,
        customer_name: parent.customer_name,
        phone: parent.phone,
        items,
        mode: "subscription",
        status: "paid",
        parent_order_id: parent.id,
        stripe_subscription_id: parent.stripe_subscription_id,
        stripe_session_id: invoice.id,
        subtotal: paid,
        shipping: 0,
        total: paid,
      });
      await addEvent(refill.id, "paid", `Refill of ${parent.order_no}`);
      break;
    }
  }

  return Response.json({ received: true });
}
