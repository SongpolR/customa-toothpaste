import { ALL_STATUSES, addEvent, getEvents, getOrder, updateOrder, type Order, type OrderStatus } from "@/lib/db";
import { isAdmin, str, unauthorized } from "@/lib/server";

export async function GET(_req: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  const order = await getOrder(id);
  if (!order) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ order, events: await getEvents(id) });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  const order = await getOrder(id);
  if (!order) return Response.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const patch: Partial<Order> = {};
  const status = body?.status as OrderStatus | undefined;
  if (status !== undefined) {
    if (!ALL_STATUSES.includes(status)) return Response.json({ error: "bad status" }, { status: 400 });
    patch.status = status;
  }
  if (typeof body?.tracking_no === "string") patch.tracking_no = str(body.tracking_no, 40) || null;
  const note = str(body?.note, 300) || null;

  // capture before updating — the local store mutates the order object in place
  const prevStatus = order.status;
  const prevTracking = order.tracking_no;
  const updated = Object.keys(patch).length ? await updateOrder(id, patch) : order;
  const statusChanged = !!patch.status && patch.status !== prevStatus;
  const trackingChanged = !!patch.tracking_no && patch.tracking_no !== prevTracking;
  if (statusChanged || note || trackingChanged) {
    await addEvent(id, updated.status, note ?? (trackingChanged ? `Tracking: ${patch.tracking_no}` : null));
  }
  return Response.json({ order: updated, events: await getEvents(id) });
}
