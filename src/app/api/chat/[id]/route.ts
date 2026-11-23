import { timingSafeEqual } from "node:crypto";
import { addMessage, getMessages, getThread } from "@/lib/db";
import { adminChannel, broadcast, str, threadChannel } from "@/lib/server";

async function authThread(id: string, token: string | null) {
  if (!token || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const thread = await getThread(id);
  if (!thread) return null;
  const a = Buffer.from(thread.token);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b) ? thread : null;
}

export async function GET(req: Request, ctx: RouteContext<"/api/chat/[id]">) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const thread = await authThread(id, url.searchParams.get("token"));
  if (!thread) return Response.json({ error: "not found" }, { status: 404 });
  const after = Number(url.searchParams.get("after") ?? 0) || 0;
  const messages = await getMessages(thread.id, after);
  return Response.json({ messages, status: thread.status, channel: threadChannel(thread.id, thread.token) });
}

export async function POST(req: Request, ctx: RouteContext<"/api/chat/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const thread = await authThread(id, typeof body?.token === "string" ? body.token : null);
  if (!thread) return Response.json({ error: "not found" }, { status: 404 });
  const text = str(body?.body, 2000);
  if (!text) return Response.json({ error: "empty message" }, { status: 400 });
  const msg = await addMessage(thread.id, "customer", text);
  await Promise.all([
    broadcast(threadChannel(thread.id, thread.token), "message", msg),
    broadcast(adminChannel(), "message", msg),
  ]);
  return Response.json({ message: msg });
}
