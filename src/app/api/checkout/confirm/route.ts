import { getOrder, markPaid, type Order } from "@/lib/db";
import { stripe } from "@/lib/server";

// Called by the success page. Verifies the Checkout Session directly with
// Stripe, so orders get marked paid even when no webhook is forwarded locally.

const summary = (o: Order) => ({
  order_no: o.order_no,
  email: o.email,
  status: o.status,
  total: o.total,
  mode: o.mode,
  items: o.items.map((i) => ({ name: i.formula.name, qty: i.qty, plan: i.plan })),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const orderId = url.searchParams.get("order");

  if (sessionId) {
    const s = stripe();
    if (!s) return Response.json({ error: "Stripe not configured" }, { status: 503 });
    let session;
    try {
      session = await s.checkout.sessions.retrieve(sessionId);
    } catch {
      return Response.json({ error: "Unknown session" }, { status: 404 });
    }
    const id = session.metadata?.order_id ?? session.client_reference_id;
    if (!id) return Response.json({ error: "No order on session" }, { status: 404 });
    let order = await getOrder(id);
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
    const paid = session.payment_status === "paid" || (session.mode === "subscription" && session.status === "complete");
    if (paid) {
      const shipping =
        (session as unknown as { collected_information?: { shipping_details?: unknown } }).collected_information
          ?.shipping_details ?? session.customer_details;
      order =
        (await markPaid(order.id, {
          sessionId: session.id,
          subscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          address: (shipping as Record<string, unknown>) ?? null,
        })) ?? order;
    }
    return Response.json({ order: summary(order) });
  }

  if (orderId && /^[0-9a-f-]{36}$/.test(orderId)) {
    const order = await getOrder(orderId);
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
    return Response.json({ order: summary(order) });
  }
  return Response.json({ error: "session_id or order required" }, { status: 400 });
}
