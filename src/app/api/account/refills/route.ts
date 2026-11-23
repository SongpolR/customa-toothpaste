import type Stripe from "stripe";
import { listOrdersForUser } from "@/lib/db";
import { getUser, signInRequired, stripe } from "@/lib/server";

/** next charge date, wherever this Stripe API version keeps it */
function periodEnd(sub: Stripe.Subscription): number | null {
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  return sub.items?.data?.[0]?.current_period_end ?? legacy ?? null;
}

// Refill subscriptions the signed-in customer started, with their live Stripe state.
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return signInRequired();
  const orders = await listOrdersForUser(user.id, user.email);
  const parents = orders.filter((o) => o.mode === "subscription" && !o.parent_order_id && o.stripe_subscription_id);
  const s = stripe();
  const refills = await Promise.all(
    parents.map(async (o) => {
      let state: { status: string; cancel_at_period_end: boolean; next_charge: number | null } | null = null;
      if (s) {
        try {
          const sub = await s.subscriptions.retrieve(o.stripe_subscription_id!);
          state = { status: sub.status, cancel_at_period_end: sub.cancel_at_period_end, next_charge: periodEnd(sub) };
        } catch {
          state = { status: "missing", cancel_at_period_end: false, next_charge: null };
        }
      }
      const plan = o.items.find((i) => i.plan !== "once")?.plan ?? "2m";
      return {
        id: o.id,
        order_no: o.order_no,
        created_at: o.created_at,
        plan,
        items: o.items.filter((i) => i.plan !== "once"),
        refills_delivered: orders.filter((x) => x.parent_order_id === o.id).length,
        ...state,
      };
    }),
  );
  return Response.json({ refills, stripe: !!s });
}
