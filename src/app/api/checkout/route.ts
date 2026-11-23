import type Stripe from "stripe";
import { createOrder, markPaid, updateOrder, type OrderItem } from "@/lib/db";
import { cartTotals, formulaNo, herbLine, linePrice, sanitizeFormula, sanitizePlan } from "@/lib/formula";
import { SIZES, byId } from "@/lib/catalog";
import { demoPaymentsAllowed, getUser, isEmail, siteUrl, str, stripe } from "@/lib/server";

type InLine = { formula: unknown; qty: unknown; plan: unknown; returnTube: unknown };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const rawLines: InLine[] = Array.isArray(body?.lines) ? body.lines.slice(0, 20) : [];
  const name = str(body?.customer?.name, 80);
  const email = str(body?.customer?.email, 200);
  const phone = str(body?.customer?.phone, 30) || null;

  if (!rawLines.length) return Response.json({ error: "Cart is empty" }, { status: 400 });
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!isEmail(email)) return Response.json({ error: "A valid email is required" }, { status: 400 });

  // Re-price everything on the server from the catalog.
  const items: OrderItem[] = rawLines.map((l) => {
    const formula = sanitizeFormula(l.formula);
    const plan = sanitizePlan(l.plan);
    const returnTube = plan !== "once" && l.returnTube === true;
    const qty = Math.min(20, Math.max(1, Math.round(Number(l.qty) || 1)));
    return { formula, qty, plan, returnTube, unit: linePrice({ formula, plan, returnTube }) };
  });
  if (items.some((i) => i.formula.herbs.length === 0))
    return Response.json({ error: "Every formula needs at least one herb" }, { status: 400 });

  const plans = new Set(items.filter((i) => i.plan !== "once").map((i) => i.plan));
  if (plans.size > 1)
    return Response.json(
      { error: "Refills in one order must share the same interval (2 or 3 months)." },
      { status: 400 },
    );
  const mode: "payment" | "subscription" = plans.size ? "subscription" : "payment";
  const totals = cartTotals(items.map((i, n) => ({ ...i, id: String(n) })));

  const s = stripe();
  if (!s && !demoPaymentsAllowed()) {
    return Response.json({ error: "Payments are not configured (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }

  // signed-in customers get the order in their account (guests can still check out)
  const user = await getUser(req);
  const order = await createOrder({
    user_id: user?.id ?? null,
    email,
    customer_name: name,
    phone,
    items,
    mode,
    ...totals,
  });

  const origin = siteUrl(req);

  // ---- Demo mode: no Stripe keys in development → simulate a payment.
  if (!s) {
    await markPaid(order.id, { note: "Demo payment (simulated — Stripe not configured)" });
    return Response.json({ url: `${origin}/order/success?order=${order.id}&demo=1` });
  }

  const interval = (p: string) => (p === "2m" ? 2 : 3);
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((i) => ({
    quantity: i.qty,
    price_data: {
      currency: "thb",
      unit_amount: i.unit * 100,
      product_data: {
        name: `Customa N°${formulaNo(i.formula)} ${i.formula.name} — ${byId(SIZES, i.formula.size)?.grams ?? 100} g`,
        description: [herbLine(i.formula, ", "), i.returnTube ? "incl. tube-return discount" : ""]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 300) || "Custom toothpaste",
      },
      ...(i.plan !== "once" ? { recurring: { interval: "month" as const, interval_count: interval(i.plan) } } : {}),
    },
  }));
  if (totals.shipping > 0) {
    line_items.push({
      quantity: 1,
      price_data: { currency: "thb", unit_amount: totals.shipping * 100, product_data: { name: "Plastic-free shipping" } },
    });
  }

  try {
    const session = await s.checkout.sessions.create({
      mode,
      line_items,
      customer_email: email,
      client_reference_id: order.id,
      metadata: { order_id: order.id, order_no: order.order_no },
      ...(mode === "subscription"
        ? { subscription_data: { metadata: { order_id: order.id, order_no: order.order_no } } }
        : { payment_intent_data: { metadata: { order_id: order.id, order_no: order.order_no } } }),
      shipping_address_collection: { allowed_countries: ["TH"] },
      phone_number_collection: { enabled: !phone },
      success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?cancelled=1`,
      locale: "auto",
    });
    await updateOrder(order.id, { stripe_session_id: session.id });
    return Response.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    await updateOrder(order.id, { status: "cancelled" });
    return Response.json({ error: msg }, { status: 502 });
  }
}
