import { addEvent, getOrder, ownsOrder } from "@/lib/db";
import { getUser, signInRequired, stripe } from "@/lib/server";

// Stop refills at the end of the current period, or undo that.
export async function POST(req: Request, ctx: RouteContext<"/api/account/refills/[id]">) {
  const user = await getUser(req);
  if (!user) return signInRequired();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "cancel" && action !== "resume") return Response.json({ error: "bad action" }, { status: 400 });

  const order = /^[0-9a-f-]{36}$/.test(id) ? await getOrder(id) : null;
  if (!order || !ownsOrder(order, user.id, user.email) || !order.stripe_subscription_id || order.parent_order_id)
    return Response.json({ error: "not found" }, { status: 404 });
  const s = stripe();
  if (!s) return Response.json({ error: "Payments are not configured" }, { status: 503 });

  const sub = await s.subscriptions.update(order.stripe_subscription_id, { cancel_at_period_end: action === "cancel" });
  await addEvent(
    order.id,
    order.status,
    action === "cancel" ? "Refills set to stop after the current period (by customer)" : "Refills resumed (by customer)",
  );
  return Response.json({ status: sub.status, cancel_at_period_end: sub.cancel_at_period_end });
}
