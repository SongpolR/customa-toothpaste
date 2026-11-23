import { latestThreadForUser } from "@/lib/db";
import { getUser, signInRequired, threadChannel } from "@/lib/server";

// The signed-in customer's latest support conversation, so chat follows them across devices.
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return signInRequired();
  const t = await latestThreadForUser(user.id);
  if (!t) return Response.json({ thread: null });
  return Response.json({ thread: { id: t.id, token: t.token, channel: threadChannel(t.id, t.token) } });
}
