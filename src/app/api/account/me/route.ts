import { getUser, isAdminEmail, signInRequired } from "@/lib/server";

// What the signed-in customer may see beyond their own data (staff console link).
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return signInRequired();
  return Response.json({ admin: isAdminEmail(user.email) });
}
