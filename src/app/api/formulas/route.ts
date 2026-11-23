import { getFormula, saveFormula } from "@/lib/db";
import { sanitizeFormula } from "@/lib/formula";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.formula) return Response.json({ error: "formula required" }, { status: 400 });
  const formula = sanitizeFormula(body.formula);
  if (formula.herbs.length === 0) return Response.json({ error: "pick at least one herb" }, { status: 400 });
  const slug = await saveFormula(formula);
  return Response.json({ slug });
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug || !/^[a-z0-9]{4,12}$/.test(slug)) return Response.json({ error: "bad slug" }, { status: 400 });
  const formula = await getFormula(slug);
  if (!formula) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ formula });
}
