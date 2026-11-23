import { findOrder, getEvents } from "@/lib/db";
import { str } from "@/lib/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const orderNo = str(body?.order_no, 20);
  const email = str(body?.email, 200);
  if (!orderNo || !email) return Response.json({ error: "order_no and email required" }, { status: 400 });

  const order = await findOrder(orderNo, email);
  // Same response for "wrong email" and "no such order" — don't leak which.
  if (!order) return Response.json({ error: "not found" }, { status: 404 });

  const events = await getEvents(order.id);
  return Response.json({
    order: {
      order_no: order.order_no,
      customer_name: order.customer_name,
      status: order.status,
      tracking_no: order.tracking_no,
      total: order.total,
      shipping: order.shipping,
      mode: order.mode,
      created_at: order.created_at,
      items: order.items,
    },
    events: events.map((e) => ({ status: e.status, note: e.note, created_at: e.created_at })),
  });
}
