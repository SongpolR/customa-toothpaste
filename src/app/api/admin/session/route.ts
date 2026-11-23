import { hasSupabase } from "@/lib/db";
import { adminChannel, checkAdminPassword, clearAdminSession, getUser, isAdmin, isAdminEmail, setAdminSession, stripe } from "@/lib/server";

export async function GET() {
  const admin = await isAdmin();
  return Response.json({
    admin,
    ...(admin
      ? {
          channel: adminChannel(),
          backend: hasSupabase() ? "supabase" : "local",
          payments: stripe() ? "stripe" : "demo",
        }
      : {}),
  });
}

export async function POST(req: Request) {
  // Staff signed in with Google (listed in ADMIN_EMAILS) get the console session directly.
  const user = await getUser(req);
  if (user) {
    if (!isAdminEmail(user.email)) return Response.json({ error: "not staff" }, { status: 403 });
    await setAdminSession();
    return Response.json({ ok: true });
  }
  // Fallback: console password (local demo, or no Supabase)
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  // small fixed delay to blunt brute-force attempts
  await new Promise((r) => setTimeout(r, 400));
  if (!checkAdminPassword(password)) return Response.json({ error: "wrong password" }, { status: 401 });
  await setAdminSession();
  return Response.json({ ok: true });
}

export async function DELETE() {
  await clearAdminSession();
  return Response.json({ ok: true });
}
