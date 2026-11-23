import { hasSupabase } from "@/lib/db";
import { adminChannel, checkAdminPassword, clearAdminSession, isAdmin, setAdminSession, stripe } from "@/lib/server";

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
