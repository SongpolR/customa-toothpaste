import { addMessage, createThread } from "@/lib/db";
import { adminChannel, broadcast, getUser, isEmail, str, threadChannel } from "@/lib/server";

// Start a support conversation.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  // signed in: name/email come from the Google account
  const user = await getUser(req);
  const name = str(body?.name, 60) || (user?.name ?? "").slice(0, 60);
  const email = user?.email || str(body?.email, 200);
  const orderNo = str(body?.order_no, 20).toUpperCase() || null;
  const message = str(body?.message, 2000);
  if (!name || !isEmail(email) || !message)
    return Response.json({ error: "name, valid email and message required" }, { status: 400 });

  const thread = await createThread({ name, email, order_no: orderNo, user_id: user?.id ?? null });
  const first = await addMessage(thread.id, "customer", message);
  const lang = body?.lang === "en" ? "en" : "th";
  const auto = await addMessage(
    thread.id,
    "system",
    lang === "th"
      ? "ได้รับข้อความแล้ว ทีมงาน Customa จะตอบกลับในไม่กี่นาที (เวลาทำการ 9:00–18:00)"
      : "Got it — someone from the Customa lab will reply in a few minutes (9:00–18:00 ICT).",
  );
  await broadcast(adminChannel(), "thread", { thread_id: thread.id });

  return Response.json({
    id: thread.id,
    token: thread.token,
    channel: threadChannel(thread.id, thread.token),
    messages: [first, auto],
  });
}
