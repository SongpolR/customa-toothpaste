"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useT, type DictKey } from "@/lib/i18n";
import type { Progress } from "./HeroScene";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

type Panel = { from: number; to: number; title: DictKey; body?: DictKey; side: "left" | "right" | "bottom"; no: string };

// Timings match the acts in HeroScene.tsx.
const PANELS: Panel[] = [
  { from: 0.08, to: 0.2, title: "hero.s2.title", body: "hero.s2.body", side: "left", no: "01" },
  { from: 0.215, to: 0.29, title: "hero.s3.title", body: "hero.s3.body", side: "left", no: "02" },
  { from: 0.49, to: 0.575, title: "hero.s4.title", body: "hero.s4.body", side: "left", no: "03" },
  { from: 0.61, to: 0.7, title: "hero.s5.title", body: "hero.s5.body", side: "left", no: "04" },
  { from: 0.79, to: 0.86, title: "hero.s6.title", body: "hero.s6.body", side: "left", no: "05" },
  { from: 0.885, to: 0.935, title: "hero.s7.title", body: "hero.s7.body", side: "bottom", no: "06" },
  { from: 0.955, to: 1.2, title: "hero.s8.title", body: "hero.s8.body", side: "left", no: "07" },
];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export default function Hero() {
  const { t } = useT();
  const section = useRef<HTMLElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const bar = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const [progress] = useState<Progress>(() => ({ target: 0, current: 0 }));

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduce ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    const onTick = (time: number) => {
      lenis?.raf(time * 1000);
      progress.current += (progress.target - progress.current) * (reduce ? 1 : 0.09);
      const p = progress.current;
      // DOM overlays follow the same smoothed progress as the 3D scene
      if (intro.current) {
        const k = 1 - clamp01((p - 0.02) / 0.05);
        intro.current.style.opacity = String(k);
        intro.current.style.transform = `translate3d(0, ${(1 - k) * -40}px, 0)`;
        intro.current.style.pointerEvents = k > 0.5 ? "auto" : "none";
      }
      if (cue.current) cue.current.style.opacity = String(1 - clamp01(p / 0.04));
      PANELS.forEach((panel, i) => {
        const el = panels.current[i];
        if (!el) return;
        const fadeIn = clamp01((p - panel.from) / 0.02);
        const fadeOut = 1 - clamp01((p - (panel.to - 0.02)) / 0.02);
        const k = Math.min(fadeIn, fadeOut);
        el.style.opacity = String(k);
        el.style.transform = `translate3d(0, ${(1 - k) * 30}px, 0)`;
        el.style.pointerEvents = k > 0.5 ? "auto" : "none";
      });
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (pct.current) pct.current.textContent = String(Math.round(p * 100)).padStart(3, "0");
    };
    lenis?.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        progress.target = self.progress;
      },
    });
    return () => {
      st.kill();
      gsap.ticker.remove(onTick);
      lenis?.destroy();
    };
  }, [progress]);

  return (
    <section ref={section} className="relative h-[1300vh]" aria-label="Customa product story">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <div className="absolute inset-0 hero-vignette" />
        <HeroScene progress={progress} />

        {/* intro headline */}
        <div ref={intro} className="absolute inset-x-0 bottom-[12vh] md:bottom-auto md:top-1/2 md:-translate-y-1/2 px-6 md:px-14 max-w-[1400px] mx-auto">
          <div className="md:max-w-[46%]">
            <p className="label-text text-[11px] tracking-[0.35em] uppercase opacity-70 mb-5">{t("hero.kicker")}</p>
            <h1 className="display text-[13vw] md:text-[6.2vw] leading-[0.92] whitespace-pre-line">{t("hero.title")}</h1>
            <p className="mt-6 text-base md:text-lg max-w-md opacity-80">{t("hero.sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/compose" className="btn-primary">{t("hero.cta")} →</Link>
              <Link href="/quiz" className="btn-ghost">{t("hero.cta2")}</Link>
            </div>
          </div>
        </div>

        {/* story panels */}
        {PANELS.map((panel, i) => (
          <div
            key={panel.no}
            ref={(el) => {
              panels.current[i] = el;
            }}
            style={{ opacity: 0 }}
            className={
              panel.side === "bottom"
                ? // a compact caption under the subject, so a centred close-up stays clear
                  "absolute bottom-[6vh] left-1/2 -translate-x-1/2 w-[min(92vw,640px)]"
                : `absolute bottom-[9vh] md:bottom-auto md:top-1/2 md:-translate-y-1/2 px-6 md:px-14 w-full md:w-auto md:max-w-[420px] ${
                    panel.side === "left" ? "left-0" : "right-0"
                  }`
            }
          >
            {panel.side === "bottom" ? (
              <div className="paper-card !px-6 !py-4 text-center bg-card/90 backdrop-blur-sm">
                <p className="label-text text-[10px] tracking-[0.3em] mb-2 opacity-60">N°{panel.no} ———</p>
                <h2 className="display text-2xl md:text-4xl leading-tight">{t(panel.title).replace("\n", " ")}</h2>
                {panel.body && <p className="mt-2 text-[13px] md:text-[14px] leading-relaxed opacity-80">{t(panel.body)}</p>}
              </div>
            ) : (
            <div className="paper-card md:bg-transparent md:border-0 md:shadow-none md:p-0">
              <p className="label-text text-[11px] tracking-[0.3em] mb-4 opacity-60">N°{panel.no} ———</p>
              <h2 className="display text-4xl md:text-6xl leading-[0.95] whitespace-pre-line">{t(panel.title)}</h2>
              {panel.body && <p className="mt-5 text-[15px] leading-relaxed opacity-80">{t(panel.body)}</p>}
              {panel.no === "07" && (
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/compose" className="btn-primary">{t("hero.cta")} →</Link>
                  <Link href="/quiz" className="btn-ghost">{t("hero.cta2")}</Link>
                </div>
              )}
            </div>
            )}
          </div>
        ))}

        {/* scroll cue */}
        <div ref={cue} className="absolute left-1/2 -translate-x-1/2 bottom-6 hidden md:flex flex-col items-center gap-2 label-text text-[10px] tracking-[0.3em] uppercase opacity-60">
          <span>{t("hero.scroll")}</span>
          <span className="scroll-line" />
        </div>

        {/* progress meter */}
        <div className="absolute right-6 md:right-14 bottom-6 flex items-center gap-3 label-text text-[11px]">
          <span ref={pct}>000</span>
          <div className="w-24 md:w-40 h-px bg-[color:var(--ink)]/20 overflow-hidden">
            <div ref={bar} className="h-full bg-[color:var(--ink)] origin-left" style={{ transform: "scaleX(0)" }} />
          </div>
          <span>100</span>
        </div>
      </div>
    </section>
  );
}
