"use client";

import Link from "next/link";
import { BOX_PAPERS, HERBS, LIEU, TUBE_PAPERS } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import { SectionNo } from "./ui";

export default function HomeSections() {
  const { t, l, lang } = useT();
  const steps = [
    { no: "01", title: t("home.step1"), body: t("home.step1.b") },
    { no: "02", title: t("home.step2"), body: t("home.step2.b") },
    { no: "03", title: t("home.step3"), body: t("home.step3.b") },
  ];
  return (
    <div className="relative z-10 bg-paper">
      {/* marquee */}
      <div className="border-y border-line overflow-hidden py-4 label-text text-[12px] tracking-[0.35em] uppercase">
        <div className="marquee gap-12 pr-12">
          {[...HERBS, ...HERBS].map((h, i) => (
            <span key={i} className="whitespace-nowrap opacity-70">
              N°{String(h.no).padStart(2, "0")} {h.name.en} <span className="opacity-40">·</span> <em className="normal-case tracking-normal">{h.latin}</em>
            </span>
          ))}
        </div>
      </div>

      {/* how it works */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-14 py-24 md:py-36">
        <SectionNo no="05">{t("home.how")}</SectionNo>
        <div className="grid md:grid-cols-3 gap-px bg-line border border-line">
          {steps.map((s) => (
            <div key={s.no} className="bg-paper p-8 md:p-10 min-h-[260px] flex flex-col">
              <span className="label-text text-[11px] opacity-50">{s.no}</span>
              <h3 className="display text-3xl md:text-4xl mt-auto">{s.title}</h3>
              <p className="mt-4 text-[15px] opacity-75 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* herb library */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-14 pb-24 md:pb-36">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <SectionNo no="06">{t("home.herbs")}</SectionNo>
            <h2 className="display text-5xl md:text-7xl leading-none">{lang === "th" ? "สมุนไพร 12 ชนิด" : "Twelve botanicals"}</h2>
          </div>
          <Link href="/compose" className="btn-ghost hidden md:inline-flex">{t("hero.cta")} →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-line border border-line">
          {HERBS.map((h) => (
            <div key={h.id} className="bg-paper p-5 flex flex-col gap-3 group">
              <div className="flex justify-between label-text text-[10px] opacity-55">
                <span>N°{String(h.no).padStart(2, "0")}</span>
                <span className="w-3 h-3 rounded-full border border-line" style={{ background: h.leaf }} />
              </div>
              <div className="aspect-square rounded-full mx-auto w-3/4 transition-transform duration-500 group-hover:scale-105"
                style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.7), transparent 40%), ${h.color}` }} />
              <div>
                <p className="label-text text-[12px] tracking-[0.12em] uppercase font-semibold">{h.name.en}</p>
                <p className="text-[13px] opacity-70">{h.name.th} · <em>{h.latin}</em></p>
                <p className="text-[13px] mt-2 opacity-80">{l(h.benefit)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* papers */}
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-[1400px] px-5 md:px-14 py-24 md:py-32 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="label-text text-[11px] tracking-[0.3em] uppercase opacity-60 mb-4">N°07 ——— {lang === "th" ? "วัสดุ" : "Materials"}</p>
            <h2 className="display text-5xl md:text-7xl leading-[0.95]">{t("hero.s2.title")}</h2>
            <p className="mt-6 max-w-md opacity-75 leading-relaxed">{t("hero.s2.body")}</p>
            <div className="mt-10 grid grid-cols-3 gap-6 label-text">
              <div><div className="display text-5xl">0 g</div><div className="text-[10px] tracking-[0.2em] uppercase opacity-60 mt-2">{lang === "th" ? "พลาสติก" : "plastic"}</div></div>
              <div><div className="display text-5xl">94%</div><div className="text-[10px] tracking-[0.2em] uppercase opacity-60 mt-2">{lang === "th" ? "กระดาษ FSC" : "FSC paper"}</div></div>
              <div><div className="display text-5xl">12 wk</div><div className="text-[10px] tracking-[0.2em] uppercase opacity-60 mt-2">{lang === "th" ? "ย่อยสลาย" : "to compost"}</div></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[...TUBE_PAPERS, ...BOX_PAPERS].slice(0, 9).map((p, i) => (
              <div key={i} className="aspect-[3/4] relative overflow-hidden" style={{ background: p.color }}>
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `radial-gradient(${p.fiber} 0.6px, transparent 0.6px)`, backgroundSize: "7px 9px" }} />
                <span className="absolute bottom-2 left-2 right-2 label-text text-[9px] tracking-[0.15em] uppercase" style={{ color: p.id === "ink" ? "#efebe3" : "#1d1c1a" }}>
                  {l(p.name)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* refill */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-14 py-24 md:py-36 grid md:grid-cols-[1.2fr_1fr] gap-12 items-end">
        <div>
          <SectionNo no="08">Refill</SectionNo>
          <h2 className="display text-6xl md:text-8xl leading-[0.9]">{t("home.refill.title")}</h2>
        </div>
        <div>
          <p className="text-lg opacity-80 leading-relaxed">{t("home.refill.body")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/compose" className="btn-primary">{t("hero.cta")} →</Link>
            <Link href="/quiz" className="btn-ghost">{t("hero.cta2")}</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1400px] px-5 md:px-14 py-10 flex flex-col md:flex-row gap-4 justify-between label-text text-[11px] tracking-[0.18em] uppercase opacity-70">
          <span>CUSTOMA LABORATORY · {LIEU}</span>
          <span>{t("common.demo")}</span>
          <Link href="/admin" className="hover:opacity-100">Staff</Link>
        </div>
      </footer>
    </div>
  );
}
