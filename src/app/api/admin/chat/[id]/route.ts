import { addMessage, getMessages, getThread, updateThread } from "@/lib/db";
import { adminChannel, broadcast, isAdmin, str, threadChannel, unauthorized } from "@/lib/server";

export async function GET(req: Request, ctx: RouteContext<"/api/admin/chat/[id]">) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  const thread = await getThread(id);
  if (!thread) return Response.json({ error: "not found" }, { status: 404 });
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  if (thread.unread_admin) await updateThread(id, { unread_admin: 0 });
  const { token, ...safe } = thread;
  void token; // never expose the customer secret
  return Response.json({ thread: { ...safe, unread_admin: 0 }, messages: await getMessages(id, after) });
}

export async function POST(req: Request, ctx: RouteContext<"/api/admin/chat/[id]">) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  const thread = await getThread(id);
  if (!thread) return Response.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const text = str(body?.body, 2000);
  if (!text) return Response.json({ error: "empty" }, { status: 400 });
  const msg = await addMessage(id, "admin", text);
  await Promise.all([
    broadcast(threadChannel(thread.id, thread.token), "message", msg),
    broadcast(adminChannel(), "message", msg),
  ]);
  return Response.json({ message: msg });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/chat/[id]">) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (body?.status !== "open" && body?.status !== "closed") return Response.json({ error: "bad status" }, { status: 400 });
  await updateThread(id, { status: body.status });
  return Response.json({ ok: true });
}
