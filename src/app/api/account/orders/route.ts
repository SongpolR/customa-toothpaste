import { getEvents, listOrdersForUser } from "@/lib/db";
import { getUser, signInRequired } from "@/lib/server";

// The signed-in customer's orders (newest first) with their status timelines.
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return signInRequired();
  const orders = await listOrdersForUser(user.id, user.email);
  const withEvents = await Promise.all(
    orders.slice(0, 50).map(async (o) => ({
      id: o.id,
      order_no: o.order_no,
      status: o.status,
      tracking_no: o.tracking_no,
      total: o.total,
      shipping: o.shipping,
      mode: o.mode,
      is_refill: !!o.parent_order_id,
      created_at: o.created_at,
      items: o.items,
      events: (await getEvents(o.id)).map((e) => ({ status: e.status, note: e.note, created_at: e.created_at })),
    })),
  );
  return Response.json({ orders: withEvents });
}
