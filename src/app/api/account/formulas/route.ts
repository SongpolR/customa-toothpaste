import { addSavedFormula, listSavedFormulas } from "@/lib/db";
import { sanitizeFormula } from "@/lib/formula";
import { getUser, signInRequired } from "@/lib/server";

// Formulas the signed-in customer keeps in their account.
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return signInRequired();
  const formulas = await listSavedFormulas(user.id);
  return Response.json({ formulas: formulas.map((f) => ({ id: f.id, name: f.name, formula: f.config, created_at: f.created_at })) });
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return signInRequired();
  const body = await req.json().catch(() => null);
  const formula = sanitizeFormula(body?.formula);
  if (formula.herbs.length === 0) return Response.json({ error: "pick at least one herb" }, { status: 400 });
  if ((await listSavedFormulas(user.id)).length >= 50) return Response.json({ error: "limit reached" }, { status: 400 });
  const saved = await addSavedFormula(user.id, formula);
  return Response.json({ id: saved.id });
}
