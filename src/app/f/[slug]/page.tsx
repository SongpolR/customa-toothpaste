import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFormula } from "@/lib/db";
import { formulaNo, herbLine } from "@/lib/formula";
import SharedFormula from "./SharedFormula";

export async function generateMetadata({ params }: PageProps<"/f/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const f = /^[a-z0-9]{4,12}$/.test(slug) ? await getFormula(slug) : null;
  if (!f) return { title: "Customa" };
  return {
    title: `N°${formulaNo(f)} ${f.name} — Customa`,
    description: `A Customa toothpaste formula: ${herbLine(f, ", ")}.`,
  };
}

export default async function SharedFormulaPage({ params }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  if (!/^[a-z0-9]{4,12}$/.test(slug)) notFound();
  const formula = await getFormula(slug);
  if (!formula) notFound();
  return <SharedFormula formula={formula} />;
}
