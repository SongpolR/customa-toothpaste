import {
  BASES,
  BOOSTERS,
  BOX_PAPERS,
  BOX_SHAPES,
  CAPS,
  FREE_SHIPPING_FROM,
  HERBS,
  MAX_HERBS,
  RETURN_TUBE_DISCOUNT,
  SHIPPING_THB,
  SIZES,
  SUBSCRIPTION_DISCOUNT,
  TUBE_PAPERS,
  byId,
  type BoxShape,
  type Profile,
} from "./catalog";

export type Level = 1 | 2 | 3;
export type HerbPick = { id: string; level: Level };

export type Formula = {
  name: string;
  base: string;
  herbs: HerbPick[];
  boosters: string[];
  size: "50" | "100";
  tubePaper: string;
  cap: string;
  boxShape: BoxShape;
  boxPaper: string;
  tubeText: { forName: string; note: string };
  boxText: { title: string; message: string };
};

export type Plan = "once" | "2m" | "3m";

export type CartLine = {
  id: string;
  formula: Formula;
  qty: number;
  plan: Plan;
  returnTube: boolean;
};

export const defaultFormula = (): Formula => ({
  name: "Forest Mint",
  base: "calcium",
  herbs: [
    { id: "mint", level: 3 },
    { id: "clove", level: 1 },
    { id: "neem", level: 2 },
  ],
  boosters: ["xylitol"],
  size: "100",
  tubePaper: "kraft",
  cap: "bamboo",
  boxShape: "tuck",
  boxPaper: "kraft",
  tubeText: { forName: "", note: "" },
  boxText: { title: "", message: "" },
});

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */

export const PROFILE_KEYS: (keyof Profile)[] = ["fresh", "herbal", "spicy", "sweet", "whitening", "gum"];

export function profileOf(f: Formula): Profile {
  const p: Profile = { fresh: 0, herbal: 0, spicy: 0, sweet: 0, whitening: 0, gum: 0 };
  const add = (src: Partial<Profile>, w: number) => {
    for (const k of PROFILE_KEYS) p[k] += (src[k] ?? 0) * w;
  };
  const base = byId(BASES, f.base);
  if (base) add(base.profile, 1);
  for (const h of f.herbs) {
    const herb = byId(HERBS, h.id);
    if (herb) add(herb.profile, h.level / 2);
  }
  for (const b of f.boosters) {
    const boost = byId(BOOSTERS, b);
    if (boost) add(boost.profile, 1);
  }
  // normalise to 0..1 for the radar chart
  for (const k of PROFILE_KEYS) p[k] = Math.min(1, p[k] / 5);
  return p;
}

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** Paste color = base color tinted by each herb, weighted by its level. */
export function pasteColor(f: Formula): string {
  const base = byId(BASES, f.base) ?? BASES[0];
  let [r, g, b] = hexToRgb(base.color);
  let w = base.id === "charcoal" ? 12 : 3;
  [r, g, b] = [r * w, g * w, b * w];
  for (const h of f.herbs) {
    const herb = byId(HERBS, h.id);
    if (!herb) continue;
    const [hr, hg, hb] = hexToRgb(herb.color);
    r += hr * h.level;
    g += hg * h.level;
    b += hb * h.level;
    w += h.level;
  }
  return rgbToHex(r / w, g / w, b / w);
}

/** Stable 2-digit formula number, like a perfume "N°07". */
export function formulaNo(f: Formula): string {
  const key = [f.base, ...f.herbs.map((h) => h.id + h.level), ...f.boosters].join("|");
  let hash = 7;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return String((hash % 98) + 1).padStart(2, "0");
}

/** Suggest a poetic name from the dominant herbs. */
export function suggestName(f: Formula): string {
  const sorted = [...f.herbs].sort((a, b) => b.level - a.level);
  const top = sorted[0] ? byId(HERBS, sorted[0].id) : undefined;
  const second = sorted[1] ? byId(HERBS, sorted[1].id) : undefined;
  const moods: Record<string, string> = {
    mint: "Mint",
    clove: "Clove",
    turmeric: "Gold",
    neem: "Forest",
    guava: "Orchard",
    salt: "Tide",
    cinnamon: "Ember",
    licorice: "Honeyroot",
    lemongrass: "Citrus",
    ginger: "Fire",
    mangosteen: "Queen",
    greentea: "Matcha",
  };
  if (!top) return "Blank Page";
  if (!second) return `Pure ${moods[top.id] ?? top.name.en}`;
  return `${moods[second.id] ?? second.name.en} ${moods[top.id] ?? top.name.en}`;
}

/* ------------------------------------------------------------------ */
/* Pricing (shared by client preview and server checkout)             */
/* ------------------------------------------------------------------ */

export function unitPrice(f: Formula): number {
  let price = byId(SIZES, f.size)?.price ?? SIZES[1].price;
  price += byId(BASES, f.base)?.price ?? 0;
  for (const h of f.herbs) price += (byId(HERBS, h.id)?.price ?? 0) * h.level;
  for (const b of f.boosters) price += byId(BOOSTERS, b)?.price ?? 0;
  price += byId(TUBE_PAPERS, f.tubePaper)?.price ?? 0;
  price += CAPS.find((c) => c.id === f.cap)?.price ?? 0;
  price += BOX_SHAPES.find((s) => s.id === f.boxShape)?.price ?? 0;
  price += byId(BOX_PAPERS, f.boxPaper)?.price ?? 0;
  return price;
}

/** Price of a single unit after subscription / tube-return discounts. */
export function linePrice(line: Pick<CartLine, "formula" | "plan" | "returnTube">): number {
  let p = unitPrice(line.formula);
  if (line.plan !== "once") {
    p = Math.round(p * (1 - SUBSCRIPTION_DISCOUNT));
    if (line.returnTube) p -= RETURN_TUBE_DISCOUNT;
  }
  return Math.max(p, 20);
}

export function cartTotals(lines: CartLine[]) {
  const subtotal = lines.reduce((s, l) => s + linePrice(l) * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_THB;
  return { subtotal, shipping, total: subtotal + shipping };
}

/* ------------------------------------------------------------------ */
/* Validation — never trust a formula coming from the browser         */
/* ------------------------------------------------------------------ */

const clean = (v: unknown, max: number) =>
  typeof v === "string"
    ? v.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, max)
    : "";

export function sanitizeFormula(input: unknown): Formula {
  const d = defaultFormula();
  const x = (input ?? {}) as Partial<Formula>;
  const seen = new Set<string>();
  const herbs: HerbPick[] = [];
  for (const h of Array.isArray(x.herbs) ? x.herbs : []) {
    if (!h || typeof h.id !== "string" || seen.has(h.id) || !byId(HERBS, h.id)) continue;
    const level = Math.min(3, Math.max(1, Math.round(Number(h.level) || 1))) as Level;
    seen.add(h.id);
    herbs.push({ id: h.id, level });
    if (herbs.length >= MAX_HERBS) break;
  }
  const boosters = (Array.isArray(x.boosters) ? x.boosters : []).filter(
    (b, i, arr): b is string => typeof b === "string" && !!byId(BOOSTERS, b) && arr.indexOf(b) === i,
  );
  return {
    name: clean(x.name, 24) || suggestName({ ...d, herbs }),
    base: typeof x.base === "string" && byId(BASES, x.base) ? x.base : d.base,
    herbs,
    boosters,
    size: x.size === "50" ? "50" : "100",
    tubePaper: typeof x.tubePaper === "string" && byId(TUBE_PAPERS, x.tubePaper) ? x.tubePaper : d.tubePaper,
    cap: CAPS.some((c) => c.id === x.cap) ? (x.cap as string) : d.cap,
    boxShape: BOX_SHAPES.some((s) => s.id === x.boxShape) ? (x.boxShape as BoxShape) : d.boxShape,
    boxPaper: typeof x.boxPaper === "string" && byId(BOX_PAPERS, x.boxPaper) ? x.boxPaper : d.boxPaper,
    tubeText: { forName: clean(x.tubeText?.forName, 22), note: clean(x.tubeText?.note, 32) },
    boxText: { title: clean(x.boxText?.title, 24), message: clean(x.boxText?.message, 120) },
  };
}

export const sanitizePlan = (p: unknown): Plan => (p === "2m" || p === "3m" ? p : "once");

export const herbLine = (f: Formula, sep = " · ") =>
  f.herbs
    .map((h) => byId(HERBS, h.id)?.name.en.toLowerCase())
    .filter(Boolean)
    .join(sep);

export const fmtTHB = (n: number) => "฿" + n.toLocaleString("en-US");
