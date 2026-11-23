import { ALL_STATUSES, listOrders, stats } from "@/lib/db";
import { isAdmin, str, unauthorized } from "@/lib/server";

export async function GET(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const q = str(url.searchParams.get("q"), 60);
  const [orders, s] = await Promise.all([
    listOrders({ status: ALL_STATUSES.includes(status as never) ? status : undefined, q: q || undefined }),
    stats(),
  ]);
  return Response.json({ orders, stats: s });
}
