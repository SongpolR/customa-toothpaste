import { listThreads } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/server";

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  const threads = await listThreads();
  // tokens are the customer's secret — never send them to the browser
  return Response.json({ threads: threads.map(({ token, ...t }) => (void token, t)) });
}
