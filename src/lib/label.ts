"use client";

// Canvas drawing for paper textures and Le Labo–style typewriter labels.
// The same functions feed the 3D tube/box materials in the hero and the
// live composer preview, so what customers see is what gets printed.

import { BASES, BOX_PAPERS, LIEU, SIZES, TUBE_PAPERS, byId, type PaperFinish } from "./catalog";
import { formulaNo, herbLine, type Formula } from "./formula";

export const INK = "#1d1c1a";
export const LABEL_BG = "#f6f3ea";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cachedFamily: string | null = null;
/** Font family set by next/font on <html> (see layout.tsx). */
export function labelFamily(): string {
  if (cachedFamily) return cachedFamily;
  if (typeof window === "undefined") return "monospace";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-label").trim();
  cachedFamily = v ? `${v}, "IBM Plex Sans Thai", monospace` : "monospace";
  return cachedFamily;
}

export async function ensureLabelFont() {
  if (typeof document === "undefined") return;
  const fam = labelFamily();
  try {
    await Promise.all([
      document.fonts.load(`400 32px ${fam}`),
      document.fonts.load(`600 32px ${fam}`),
      document.fonts.load(`400 32px ${fam}`, "ทดสอบ"),
    ]);
  } catch {
    /* fall back to whatever is available */
  }
}

/* ------------------------------------------------------------------ */
/* Paper                                                               */
/* ------------------------------------------------------------------ */

const paperCache = new Map<string, HTMLCanvasElement>();

/** Paint a paper background. Results are cached per paper/size/seed, so labels can
 *  be redrawn on every keystroke (composer) or typed letter (hero) without stutter. */
export function paintPaper(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  paper: PaperFinish,
  seed = 1,
) {
  const key = `${paper.id}|${paper.color}|${w}x${h}|${seed}`;
  let cached = paperCache.get(key);
  if (!cached) {
    cached = document.createElement("canvas");
    cached.width = w;
    cached.height = h;
    paintPaperRaw(cached.getContext("2d")!, w, h, paper, seed);
    if (paperCache.size > 16) paperCache.delete(paperCache.keys().next().value!);
    paperCache.set(key, cached);
  }
  ctx.drawImage(cached, 0, 0);
}

function paintPaperRaw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  paper: PaperFinish,
  seed: number,
) {
  const rand = rng(seed);
  ctx.fillStyle = paper.color;
  ctx.fillRect(0, 0, w, h);

  // soft mottling
  for (let i = 0; i < 60; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 40 + rand() * 160;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.5;
    g.addColorStop(0, light ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // grain
  const grains = Math.floor((w * h) / 90);
  for (let i = 0; i < grains; i++) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  // fibres
  ctx.strokeStyle = paper.fiber;
  ctx.lineCap = "round";
  const fibres = Math.floor((w * h) / 2600);
  for (let i = 0; i < fibres; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const len = 4 + rand() * 18;
    const a = rand() * Math.PI * 2;
    ctx.globalAlpha = 0.15 + rand() * 0.35;
    ctx.lineWidth = 0.6 + rand() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(a + 0.6) * len * 0.5,
      y + Math.sin(a + 0.6) * len * 0.5,
      x + Math.cos(a) * len,
      y + Math.sin(a) * len,
    );
    ctx.stroke();
  }
  // seed paper flecks
  if (paper.id === "seed") {
    for (let i = 0; i < (w * h) / 5000; i++) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = ["#6b5a3a", "#8b7b4f", "#4f5b33", "#a08a5c"][Math.floor(rand() * 4)];
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 2 + rand() * 3, 1.2 + rand() * 2, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ */
/* Typewriter helpers                                                  */
/* ------------------------------------------------------------------ */

function font(size: number, weight = 400) {
  return `${weight} ${size}px ${labelFamily()}`;
}

// Thai has no spaces between words, so break opportunities come from the
// browser's word segmenter (dictionary based) rather than from spaces.
const WORDS = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("th", { granularity: "word" }) : null;
const CHARS = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("th", { granularity: "grapheme" }) : null;
const OPENS = /[“‘(\[«]$/; // never end a line on these
const CLOSES = /^[”’)\]»,.!?;:…ๆฯ]/; // never start a line with these

function graphemes(s: string): string[] {
  return CHARS ? Array.from(CHARS.segment(s), (x) => x.segment) : [...s];
}

/** Pieces of text a line may break between: words, spaces and punctuation glued to their word. */
function breakUnits(text: string): string[] {
  const raw = WORDS ? Array.from(WORDS.segment(text), (x) => x.segment) : text.split(/(\s+)/).filter(Boolean);
  const out: string[] = [];
  for (const seg of raw) {
    const prev = out[out.length - 1];
    // a non-breaking space keeps its neighbours together
    if (prev !== undefined && (prev.endsWith(" ") || seg.startsWith(" ") || OPENS.test(prev) || CLOSES.test(seg))) {
      out[out.length - 1] = prev + seg;
    } else out.push(seg);
  }
  return out;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const fits = (s: string) => ctx.measureText(s).width <= maxW;
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (const unit of breakUnits(para)) {
      const blank = /^[ \t]+$/.test(unit);
      if (!line && blank) continue; // no leading spaces on a new line
      if (fits((line + unit).trimEnd())) {
        line += unit;
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = "";
      if (blank) continue;
      if (fits(unit)) {
        line = unit;
        continue;
      }
      // a single word wider than the label: break it between characters
      for (const g of graphemes(unit)) {
        if (line && !fits(line + g)) {
          lines.push(line);
          line = "";
        }
        line += g;
      }
    }
    if (line.trim()) lines.push(line.trimEnd());
  }
  return lines;
}

/** First `max` lines; if text was cut, end the last line with an ellipsis that still fits. */
function clampLines(ctx: CanvasRenderingContext2D, lines: string[], max: number, maxW: number): string[] {
  if (lines.length <= max) return lines;
  const out = lines.slice(0, max);
  let last = graphemes(out[max - 1].trimEnd());
  while (last.length && ctx.measureText(last.join("") + "…").width > maxW) last = last.slice(0, -1);
  out[max - 1] = last.join("").trimEnd() + "…";
  return out;
}

/** Largest font size (stepping down) at which text wraps into at most `max` lines. Leaves ctx.font set. */
function fitLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, max: number, size: number, minSize: number, weight = 400) {
  for (let s = size; s > minSize; s -= 4) {
    ctx.font = font(s, weight);
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= max) return { lines, size: s };
  }
  ctx.font = font(minSize, weight);
  return { lines: clampLines(ctx, wrap(ctx, text, maxW), max, maxW), size: minSize };
}

/** letter-spaced text, Le Labo headers are widely tracked */
function tracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: "left" | "center" = "left") {
  const chars = [...text];
  const width = chars.reduce((s, c) => s + ctx.measureText(c).width + spacing, -spacing);
  let cx = align === "center" ? x - width / 2 : x;
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
}

function rule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, lw = 2) {
  ctx.fillRect(x, y, w, lw);
}

const DATE_FMT = (d = new Date()) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

/* ------------------------------------------------------------------ */
/* Tube wrap — W = circumference, H = length (top of canvas = crimp)   */
/* ------------------------------------------------------------------ */

// The canvas wraps the body: width = circumference (2π·0.42 ≈ 2.64 units),
// height = length (3.1 units). Pixels must be square on the tube or the type
// gets stretched, so h = w · 3.1 / 2.64.
export const TUBE_TEX = { w: 2048, h: 2400 };

/** Vertical centre of the "for / date / lieu" block, as a fraction from the cap end (v). */
export const TUBE_FIELDS_V = 1 - 1370 / TUBE_TEX.h;

export function drawTube(canvas: HTMLCanvasElement, f: Formula) {
  const { w, h } = TUBE_TEX;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const paper = byId(TUBE_PAPERS, f.tubePaper) ?? TUBE_PAPERS[0];
  paintPaper(ctx, w, h, paper, 7);

  const dark = paper.id === "ink";
  // heat-seal crimp ribs at the top
  ctx.fillStyle = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  for (let i = 0; i < 7; i++) ctx.fillRect(0, 16 + i * 14, w, 5);

  // label sticker, centred on the front (u = 0.5), in the round part of the body
  const lw = 680;
  const lh = 1200;
  const lx = w / 2 - lw / 2;
  const ly = 700;
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fillRect(lx + 5, ly + 7, lw, lh);
  ctx.fillStyle = LABEL_BG;
  ctx.fillRect(lx, ly, lw, lh);
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";

  const pad = 54;
  const ix = lx + pad;
  const iw = lw - pad * 2;
  let y = ly + 100;

  ctx.font = font(46, 600);
  tracked(ctx, "CUSTOMA", ix, y, 18);
  ctx.font = font(32);
  ctx.textAlign = "right";
  ctx.fillText(`N°${formulaNo(f)}`, ix + iw, y);
  ctx.textAlign = "left";
  y += 34;
  rule(ctx, ix, y, iw, 3);
  y += 118;

  // long names (Thai or Latin) shrink until they fit on two lines
  const name = fitLines(ctx, (f.name || "Untitled").toUpperCase(), iw, 2, 80, 52, 600);
  for (const line of name.lines) {
    ctx.fillText(line, ix, y);
    y += Math.round(name.size * 1.12);
  }
  y -= 34;
  ctx.font = font(32);
  ctx.fillText("toothpaste · dentifrice", ix, y + 22);
  y += 64;
  rule(ctx, ix, y, iw, 3);
  y += 70;

  ctx.font = font(36);
  const herbs = herbLine(f) || "no herbs — pure base";
  for (const line of clampLines(ctx, wrap(ctx, herbs, iw), 3, iw)) {
    ctx.fillText(line, ix, y);
    y += 50;
  }
  const base = byId(BASES, f.base);
  ctx.font = font(30);
  ctx.globalAlpha = 0.7;
  ctx.fillText(`base: ${base?.name.en.toLowerCase() ?? ""}`, ix, y);
  ctx.globalAlpha = 1;
  y += 34;
  rule(ctx, ix, y, iw, 2);
  y += 72;

  ctx.font = font(36);
  // value column may wrap to a second line (long names, Thai text)
  const field = (k: string, v: string) => {
    ctx.globalAlpha = 0.65;
    ctx.fillText(k, ix, y);
    ctx.globalAlpha = 1;
    const lines = clampLines(ctx, wrap(ctx, v, iw - 170), 2, iw - 170);
    lines.forEach((line, i) => ctx.fillText(line, ix + 170, y + i * 46));
    y += 56 + (lines.length - 1) * 46;
  };
  field("for", f.tubeText.forName ? f.tubeText.forName : "—");
  field("date", DATE_FMT());
  field("lieu", LIEU);
  if (f.tubeText.note) {
    ctx.font = font(32);
    ctx.globalAlpha = 0.85;
    for (const line of clampLines(ctx, wrap(ctx, `“${f.tubeText.note}”`, iw), 2, iw)) {
      ctx.fillText(line, ix, y);
      y += 44;
    }
    ctx.globalAlpha = 1;
  }

  // bottom strip
  ctx.font = font(30);
  const size = byId(SIZES, f.size);
  rule(ctx, ix, ly + lh - 104, iw, 2);
  ctx.fillText(`${size?.grams ?? 100} g`, ix, ly + lh - 52);
  ctx.textAlign = "right";
  ctx.fillText("paper tube · plastic-free", ix + iw, ly + lh - 52);
  ctx.textAlign = "left";

  // small vertical text on the back of the tube
  ctx.save();
  ctx.fillStyle = dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)";
  ctx.font = font(30);
  ctx.translate(140, h - 300);
  ctx.rotate(-Math.PI / 2);
  tracked(ctx, "CUSTOMA LABORATORY · COMPOUNDED TO ORDER", 0, 0, 8);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Box front panel                                                     */
/* ------------------------------------------------------------------ */

export const BOX_TEX = { w: 640, h: 1600 };

export function drawBoxFront(canvas: HTMLCanvasElement, f: Formula, w = BOX_TEX.w, h = BOX_TEX.h) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const paper = byId(BOX_PAPERS, f.boxPaper) ?? BOX_PAPERS[0];
  paintPaper(ctx, w, h, paper, 11);
  const dark = paper.id === "ink";

  // Le Labo label block
  const m = 56;
  const lw = w - m * 2;
  const lx = m;
  const ly = 260;
  const lh = 900;
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(lx + 4, ly + 6, lw, lh);
  ctx.fillStyle = LABEL_BG;
  ctx.fillRect(lx, ly, lw, lh);
  ctx.fillStyle = INK;

  const ix = lx + 40;
  const iw = lw - 80;
  let y = ly + 80;
  ctx.font = font(34, 600);
  tracked(ctx, "CUSTOMA", w / 2, y, 14, "center");
  y += 30;
  rule(ctx, ix, y, iw);
  y += 90;
  ctx.font = font(30);
  ctx.textAlign = "center";
  ctx.fillText(`N°${formulaNo(f)}`, w / 2, y);
  y += 82;
  const name = fitLines(ctx, (f.name || "Untitled").toUpperCase(), iw, 2, 52, 36, 600);
  for (const line of name.lines) {
    ctx.fillText(line, w / 2, y);
    y += Math.round(name.size * 1.15);
  }
  y += 10;
  ctx.font = font(24);
  ctx.globalAlpha = 0.7;
  const titleLines = clampLines(ctx, wrap(ctx, f.boxText.title || "toothpaste · dentifrice", iw), 2, iw);
  titleLines.forEach((line, i) => ctx.fillText(line, w / 2, y + i * 32));
  ctx.globalAlpha = 1;
  y += 40 + (titleLines.length - 1) * 32;
  rule(ctx, ix, y, iw, 1.5);
  y += 60;

  ctx.font = font(26);
  const msg = f.boxText.message || herbLine(f, ", ");
  for (const line of clampLines(ctx, wrap(ctx, msg, iw), 6, iw)) {
    ctx.fillText(line, w / 2, y);
    y += 38;
  }
  ctx.textAlign = "left";

  ctx.font = font(22);
  const size = byId(SIZES, f.size);
  ctx.fillText(`${size?.grams ?? 100} g`, ix, ly + lh - 40);
  ctx.textAlign = "right";
  ctx.fillText(DATE_FMT(), ix + iw, ly + lh - 40);
  ctx.textAlign = "left";
  rule(ctx, ix, ly + lh - 80, iw, 1.5);

  // footer printed straight onto the paper
  ctx.fillStyle = dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)";
  ctx.font = font(20);
  ctx.textAlign = "center";
  tracked(ctx, "FOLDED, NOT GLUED", w / 2, h - 170, 5, "center");
  tracked(ctx, "100% PAPER · COMPOSTABLE", w / 2, h - 130, 5, "center");
  if (paper.id === "seed") tracked(ctx, "PLANT ME — I GROW WILDFLOWERS", w / 2, h - 90, 4, "center");
  ctx.textAlign = "left";

  ctx.font = font(22);
  tracked(ctx, LIEU, w / 2, 150, 10, "center");
}

/** Plain paper panel for the other faces of the box. */
export function drawPaper(canvas: HTMLCanvasElement, paperId: string, kind: "tube" | "box", w = 512, h = 512) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const list = kind === "tube" ? TUBE_PAPERS : BOX_PAPERS;
  paintPaper(ctx, w, h, byId(list, paperId) ?? list[0], 3);
}
