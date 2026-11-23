import { deleteSavedFormula } from "@/lib/db";
import { getUser, signInRequired } from "@/lib/server";

export async function DELETE(req: Request, ctx: RouteContext<"/api/account/formulas/[id]">) {
  const user = await getUser(req);
  if (!user) return signInRequired();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "not found" }, { status: 404 });
  await deleteSavedFormula(user.id, id); // scoped to this user, so others' ids do nothing
  return Response.json({ ok: true });
}
