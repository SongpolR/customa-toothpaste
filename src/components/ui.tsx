"use client";

import { BASES, BOX_PAPERS, LIEU, SIZES, TUBE_PAPERS, byId } from "@/lib/catalog";
import { PROFILE_KEYS, formulaNo, herbLine, pasteColor, profileOf, type Formula } from "@/lib/formula";
import { useT } from "@/lib/i18n";

/** Flat HTML rendering of the Le Labo-style tube label. */
export function LabelCard({ f, compact = false, kind = "tube" }: { f: Formula; compact?: boolean; kind?: "tube" | "box" }) {
  const paper = kind === "tube" ? byId(TUBE_PAPERS, f.tubePaper) : byId(BOX_PAPERS, f.boxPaper);
  const size = byId(SIZES, f.size);
  const base = byId(BASES, f.base);
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  return (
    <div className={`label-text ${compact ? "p-2" : "p-4"}`} style={{ background: paper?.color }}>
      <div className={`bg-[#f6f3ea] text-ink ${compact ? "px-2.5 py-2 text-[8px]" : "px-5 py-4 text-[11px]"} leading-snug shadow-[2px_3px_0_rgba(0,0,0,0.08)]`}>
        <div className="flex justify-between items-baseline">
          <span className={`font-semibold ${compact ? "tracking-[0.25em]" : "tracking-[0.4em]"}`}>CUSTOMA</span>
          <span>N°{formulaNo(f)}</span>
        </div>
        <div className="h-px bg-ink my-1.5" />
        <div className={`font-semibold uppercase ${compact ? "text-[11px]" : "text-[19px]"} leading-tight break-words`}>
          {f.name || "Untitled"}
        </div>
        <div className="opacity-70">{kind === "box" && f.boxText.title ? f.boxText.title : "toothpaste · dentifrice"}</div>
        <div className="h-px bg-ink my-1.5" />
        {kind === "box" && f.boxText.message ? (
          <p className="whitespace-pre-wrap break-words">{f.boxText.message}</p>
        ) : (
          <>
            <p>{herbLine(f) || "no herbs — pure base"}</p>
            {!compact && <p className="opacity-65">base: {base?.name.en.toLowerCase()}</p>}
          </>
        )}
        {!compact && (
          <>
            <div className="h-px bg-ink/50 my-1.5" />
            <dl className="grid grid-cols-[52px_1fr] gap-y-0.5">
              <dt className="opacity-60">for</dt>
              <dd className="break-words">{f.tubeText.forName || "—"}</dd>
              <dt className="opacity-60">date</dt>
              <dd>{date}</dd>
              <dt className="opacity-60">lieu</dt>
              <dd>{LIEU}</dd>
            </dl>
            {kind === "tube" && f.tubeText.note && <p className="mt-1 opacity-85 break-words">“{f.tubeText.note}”</p>}
            <div className="flex justify-between mt-2 opacity-90">
              <span>{size?.grams} g</span>
              <span>paper · plastic-free</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function PasteSwatch({ f, size = 44 }: { f: Formula; size?: number }) {
  const c = pasteColor(f);
  return (
    <span
      aria-hidden
      className="inline-block rounded-full border border-line"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.85), transparent 35%), ${c}`,
        boxShadow: "inset -3px -4px 8px rgba(0,0,0,0.12)",
      }}
    />
  );
}

/** Six-axis taste profile radar. */
export function ProfileRadar({ f, size = 220 }: { f: Formula; size?: number }) {
  const { t } = useT();
  const p = profileOf(f);
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 34;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / PROFILE_KEYS.length - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const poly = PROFILE_KEYS.map((k, i) => pt(i, R * Math.max(0.06, p[k])).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img" aria-label={t("c.profile")}>
      {[0.33, 0.66, 1].map((k) => (
        <polygon
          key={k}
          points={PROFILE_KEYS.map((_, i) => pt(i, R * k).join(",")).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
        />
      ))}
      {PROFILE_KEYS.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.12} />;
      })}
      <polygon points={poly} fill={pasteColor(f)} fillOpacity={0.55} stroke="currentColor" strokeWidth={1.2} style={{ transition: "all .4s" }} />
      {PROFILE_KEYS.map((k, i) => {
        const [x, y] = pt(i, R + 18);
        return (
          <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="label-text" fontSize={9.5} fill="currentColor" opacity={0.75}>
            {t(`p.${k}` as const).toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

export function SectionNo({ no, children }: { no: string; children: React.ReactNode }) {
  return (
    <p className="label-text text-[11px] tracking-[0.3em] uppercase opacity-60 mb-4">
      N°{no} ——— {children}
    </p>
  );
}
