"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BASES, BOOSTERS, BOX_PAPERS, BOX_SHAPES, CAPS, HERBS, MAX_HERBS, SIZES, TUBE_PAPERS } from "@/lib/catalog";
import { formulaNo, fmtTHB, suggestName, unitPrice, type Formula } from "@/lib/formula";
import { useT, type DictKey } from "@/lib/i18n";
import { useAuth, useCart, useComposer } from "@/lib/store";
import { accountsEnabled, authFetch, signInWithGoogle } from "@/lib/auth-client";
import { LabelCard, PasteSwatch, ProfileRadar } from "../ui";
import type { View } from "./Preview";

const Preview = dynamic(() => import("./Preview"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center label-text text-xs opacity-50">loading 3D…</div>,
});

type Step = "formula" | "tube" | "box" | "words";
const STEPS: { id: Step; key: DictKey; view: View }[] = [
  { id: "formula", key: "c.step.formula", view: "tube" },
  { id: "tube", key: "c.step.tube", view: "tube" },
  { id: "box", key: "c.step.box", view: "box" },
  { id: "words", key: "c.step.words", view: "both" },
];

export default function Composer() {
  const { t, l, lang } = useT();
  const c = useComposer();
  const f = c.formula;
  const cart = useCart();
  const [step, setStep] = useState<Step>("formula");
  const [view, setView] = useState<View>("tube");
  const [boxOpen, setBoxOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "busy" | "copied" | "error">("idle");
  const [shareUrl, setShareUrl] = useState("");
  const user = useAuth((s) => s.user);
  const [saveState, setSaveState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  const goStep = (s: Step) => {
    setStep(s);
    setView(STEPS.find((x) => x.id === s)!.view);
  };

  const price = unitPrice(f);
  const stepIdx = STEPS.findIndex((s) => s.id === step);

  const addToCart = () => {
    if (c.editingLineId && cart.lines.some((x) => x.id === c.editingLineId)) {
      cart.replace(c.editingLineId, f);
      c.load(f, null);
    } else {
      cart.add(structuredClone(f));
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2400);
  };

  const share = async () => {
    setShareState("busy");
    try {
      const res = await fetch("/api/formulas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formula: f }),
      });
      if (!res.ok) throw new Error();
      const { slug } = await res.json();
      const url = `${location.origin}/f/${slug}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* clipboard may be blocked; the link is still shown */
      }
      setShareState("copied");
    } catch {
      setShareState("error");
    }
  };

  // keep the formula in the customer's account (signs in first; the composer
  // state survives the Google redirect because it is persisted locally)
  const saveToAccount = async () => {
    if (!user) {
      await signInWithGoogle("/compose");
      return;
    }
    setSaveState("busy");
    const res = await authFetch("/api/account/formulas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formula: f }),
    }).catch(() => null);
    setSaveState(res?.ok ? "saved" : "error");
    if (res?.ok) setTimeout(() => setSaveState("idle"), 2400);
  };

  return (
    <div className="pt-16 flex-1 grid lg:grid-cols-[minmax(0,1.25fr)_minmax(420px,1fr)]">
      {/* ---------- live preview ---------- */}
      <div className="relative h-[52svh] lg:h-[calc(100svh-4rem)] lg:sticky lg:top-16 border-b lg:border-b-0 lg:border-r border-line overflow-hidden">
        <Preview f={f} view={view} boxOpen={boxOpen} />
        <div className="absolute top-4 left-4 md:top-6 md:left-8 label-text text-[11px] tracking-[0.2em] uppercase">
          <p className="opacity-60">N°{formulaNo(f)}</p>
          <p className="text-[15px] tracking-[0.12em] font-semibold mt-1">{f.name || "Untitled"}</p>
        </div>
        <div className="absolute top-4 right-4 md:top-6 md:right-8 flex items-center gap-3">
          <PasteSwatch f={f} size={34} />
        </div>
        <div className="absolute bottom-4 inset-x-4 md:bottom-6 md:inset-x-8 flex flex-wrap items-center justify-between gap-3 label-text text-[10.5px] tracking-[0.18em] uppercase">
          <div className="flex border border-ink bg-paper/70 backdrop-blur">
            {(["tube", "box", "both"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-2 ${view === v ? "bg-ink text-paper" : ""}`}
                aria-pressed={view === v}
              >
                {t(`c.view.${v}` as DictKey)}
              </button>
            ))}
          </div>
          {view !== "tube" && (
            <button onClick={() => setBoxOpen((o) => !o)} className="px-3 py-2 border border-ink bg-paper/70 backdrop-blur">
              {boxOpen ? (lang === "th" ? "ปิดกล่อง" : "Close box") : lang === "th" ? "เปิดกล่อง" : "Open box"}
            </button>
          )}
          <span className="opacity-50 hidden md:inline">{t("c.drag")}</span>
        </div>
      </div>

      {/* ---------- controls ---------- */}
      <div className="flex flex-col min-h-0">
        <div className="sticky top-16 z-10 bg-paper/95 backdrop-blur border-b border-line">
          <div className="flex label-text text-[11px] tracking-[0.18em] uppercase">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goStep(s.id)}
                className={`flex-1 py-4 border-b-2 transition-colors ${step === s.id ? "border-ink" : "border-transparent opacity-55 hover:opacity-90"}`}
              >
                <span className="opacity-50 mr-1.5">{i + 1}</span>
                {t(s.key)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 md:px-10 py-8 flex-1 space-y-10">
          {step === "formula" && (
            <>
              <Group title={t("c.base")}>
                <div className="grid grid-cols-2 gap-2">
                  {BASES.map((b) => (
                    <button key={b.id} className="chip p-3 text-left" data-active={f.base === b.id} onClick={() => c.set({ base: b.id })}>
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-line" style={{ background: b.color }} />
                        <span className="label-text text-[12px] font-semibold">{b.name.en}</span>
                      </span>
                      <span className="block text-[12.5px] opacity-70 mt-1">{l(b.note)}</span>
                      <span className="block label-text text-[11px] mt-1 opacity-60">{b.price ? `+${fmtTHB(b.price)}` : "—"}</span>
                    </button>
                  ))}
                </div>
              </Group>

              <Group title={t("c.herbs")} hint={`${f.herbs.length}/${MAX_HERBS} · ${t("c.herbs.hint")}`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {HERBS.map((h) => {
                    const pick = f.herbs.find((x) => x.id === h.id);
                    const full = !pick && f.herbs.length >= MAX_HERBS;
                    return (
                      <button
                        key={h.id}
                        className="chip p-3 text-left disabled:opacity-40"
                        data-active={!!pick}
                        disabled={full}
                        onClick={() => c.cycleHerb(h.id)}
                        aria-label={`${h.name.en} ${pick ? t(`lvl.${pick.level}` as DictKey) : ""}`}
                      >
                        <span className="flex justify-between label-text text-[10px] opacity-55">
                          <span>N°{String(h.no).padStart(2, "0")}</span>
                          <span className="tracking-[0.2em]">
                            {[1, 2, 3].map((n) => (
                              <span key={n} className={pick && pick.level >= n ? "opacity-100" : "opacity-25"}>●</span>
                            ))}
                          </span>
                        </span>
                        <span className="block label-text text-[12px] font-semibold mt-1.5">{h.name.en}</span>
                        <span className="block text-[12.5px] opacity-75">{h.name.th}</span>
                        <span className="block text-[11.5px] opacity-60 mt-1 leading-snug">{l(h.benefit)}</span>
                      </button>
                    );
                  })}
                </div>
              </Group>

              <Group title={t("c.boosters")}>
                <div className="grid grid-cols-2 gap-2">
                  {BOOSTERS.map((b) => (
                    <button key={b.id} className="chip p-3 text-left" data-active={f.boosters.includes(b.id)} onClick={() => c.toggleBooster(b.id)}>
                      <span className="label-text text-[12px] font-semibold">{b.name.en}</span>
                      <span className="block text-[12px] opacity-70 mt-0.5">{l(b.note)}</span>
                      <span className="block label-text text-[11px] mt-1 opacity-60">{b.price ? `+${fmtTHB(b.price)}` : "—"}</span>
                    </button>
                  ))}
                </div>
              </Group>

              <Group title={t("c.size")}>
                <div className="grid grid-cols-2 gap-2">
                  {SIZES.map((s) => (
                    <button key={s.id} className="chip p-3 text-left" data-active={f.size === s.id} onClick={() => c.set({ size: s.id })}>
                      <span className="display text-3xl">{s.grams} g</span>
                      <span className="block label-text text-[11px] opacity-60">{fmtTHB(s.price)}</span>
                    </button>
                  ))}
                </div>
              </Group>

              <Group title={t("c.profile")}>
                <div className="flex items-center gap-6">
                  <div className="w-[230px] shrink-0">
                    <ProfileRadar f={f} />
                  </div>
                  <div className="text-[13px] opacity-80 space-y-2">
                    <PasteSwatch f={f} />
                    <p>{lang === "th" ? "สีเนื้อยาสีฟันโดยประมาณ" : "Approximate paste colour"}</p>
                  </div>
                </div>
              </Group>
            </>
          )}

          {step === "tube" && (
            <>
              <Group title={t("c.paper")}>
                <Swatches items={TUBE_PAPERS} value={f.tubePaper} onChange={(id) => c.set({ tubePaper: id })} />
              </Group>
              <Group title={t("c.cap")}>
                <div className="grid grid-cols-3 gap-2">
                  {CAPS.map((cap) => (
                    <button key={cap.id} className="chip p-3 text-left" data-active={f.cap === cap.id} onClick={() => c.set({ cap: cap.id })}>
                      <span className="block w-8 h-8 rounded-full border border-line mb-2" style={{ background: cap.color }} />
                      <span className="label-text text-[11.5px] font-semibold">{l(cap.name)}</span>
                      <span className="block label-text text-[11px] opacity-60">{cap.price ? `+${fmtTHB(cap.price)}` : "—"}</span>
                    </button>
                  ))}
                </div>
              </Group>
              <p className="text-[13px] opacity-70 leading-relaxed">
                {lang === "th"
                  ? "หลอดกระดาษ FSC เคลือบด้านในด้วยไบโอพอลิเมอร์จากอ้อย ทิ้งรวมกับกระดาษรีไซเคิลได้"
                  : "FSC paperboard with a sugarcane biopolymer lining. Recycle it with paper."}
              </p>
            </>
          )}

          {step === "box" && (
            <>
              <Group title={t("c.shape")}>
                <div className="grid grid-cols-3 gap-2">
                  {BOX_SHAPES.map((s) => (
                    <button key={s.id} className="chip p-3 text-left" data-active={f.boxShape === s.id} onClick={() => c.set({ boxShape: s.id })}>
                      <BoxIcon shape={s.id} />
                      <span className="label-text text-[11.5px] font-semibold block mt-2">{l(s.name)}</span>
                      <span className="block text-[11.5px] opacity-65 leading-snug">{l(s.note)}</span>
                      <span className="block label-text text-[11px] mt-1 opacity-60">{s.price ? `+${fmtTHB(s.price)}` : "—"}</span>
                    </button>
                  ))}
                </div>
              </Group>
              <Group title={t("c.paper")}>
                <Swatches items={BOX_PAPERS} value={f.boxPaper} onChange={(id) => c.set({ boxPaper: id })} />
              </Group>
            </>
          )}

          {step === "words" && (
            <>
              <Group title={t("c.name")}>
                <div className="flex gap-3 items-end">
                  <input className="field" maxLength={24} value={f.name} onChange={(e) => c.set({ name: e.target.value })} placeholder="Forest Mint" />
                  <button className="label-text text-[10.5px] tracking-[0.18em] uppercase underline underline-offset-4 shrink-0 pb-3" onClick={() => c.set({ name: suggestName(f) })}>
                    {lang === "th" ? "สุ่มชื่อ" : "Suggest"}
                  </button>
                </div>
                <Counter v={f.name} max={24} />
              </Group>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-8">
                <Group title={t("c.forName")}>
                  <input className="field" maxLength={22} value={f.tubeText.forName} onChange={(e) => c.setTubeText({ forName: e.target.value })} placeholder="Songpol" />
                  <Counter v={f.tubeText.forName} max={22} />
                </Group>
                <Group title={t("c.note")}>
                  <input className="field" maxLength={32} value={f.tubeText.note} onChange={(e) => c.setTubeText({ note: e.target.value })} placeholder="smile more" />
                  <Counter v={f.tubeText.note} max={32} />
                </Group>
              </div>
              <Group title={t("c.boxTitle")}>
                <input className="field" maxLength={24} value={f.boxText.title} onChange={(e) => c.setBoxText({ title: e.target.value })} placeholder="happy birthday" />
                <Counter v={f.boxText.title} max={24} />
              </Group>
              <Group title={t("c.boxMessage")}>
                <textarea className="field resize-none" rows={3} maxLength={120} value={f.boxText.message} onChange={(e) => c.setBoxText({ message: e.target.value })} placeholder={lang === "th" ? "ข้อความถึงคนพิเศษ…" : "a few words for someone…"} />
                <Counter v={f.boxText.message} max={120} />
              </Group>
              {/* side by side from tablet up; on phones two cards would be ~160px wide and Thai text breaks mid-word */}
              <div className="grid gap-6 sm:grid-cols-2 sm:gap-3">
                <div className="min-w-0">
                  <p className="field-label mb-2">{t("c.view.tube")}</p>
                  <LabelCard f={f} />
                </div>
                <div className="min-w-0">
                  <p className="field-label mb-2">{t("c.view.box")}</p>
                  <LabelCard f={f} kind="box" />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-between pt-2">
            <button className="btn-ghost" disabled={stepIdx === 0} onClick={() => goStep(STEPS[stepIdx - 1].id)}>
              ← {t("c.back")}
            </button>
            {stepIdx < STEPS.length - 1 ? (
              <button className="btn-ghost" onClick={() => goStep(STEPS[stepIdx + 1].id)}>
                {t("c.next")} →
              </button>
            ) : (
              <button className="label-text text-[11px] tracking-[0.18em] uppercase opacity-60 hover:opacity-100" onClick={() => c.reset()}>
                {t("c.reset")}
              </button>
            )}
          </div>
        </div>

        {/* ---------- price bar ---------- */}
        <div className="sticky bottom-0 bg-paper/95 backdrop-blur border-t border-line px-5 md:px-10 py-4">
          {/* phones: price + add to cart on one row, save/share underneath */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="mr-auto">
              <p className="field-label">{lang === "th" ? "ราคาต่อหลอด" : "Per tube"}</p>
              <p className="display text-3xl leading-none mt-1">{fmtTHB(price)}</p>
            </div>
            <div className="order-last w-full flex gap-3 sm:order-none sm:w-auto">
              {accountsEnabled() && (
                <button
                  className="btn-ghost !px-4 flex-1 sm:flex-none whitespace-nowrap"
                  onClick={saveToAccount}
                  disabled={saveState === "busy" || f.herbs.length === 0}
                  title={user ? undefined : t("c.signInToSave")}
                >
                  {saveState === "saved" ? t("c.saved") : saveState === "busy" ? "…" : t("c.save")}
                </button>
              )}
              <button className="btn-ghost !px-4 flex-1 sm:flex-none whitespace-nowrap" onClick={share} disabled={shareState === "busy"}>
                {shareState === "copied" ? t("c.copied") : t("c.share")}
              </button>
            </div>
            <button className="btn-primary whitespace-nowrap" onClick={addToCart} disabled={f.herbs.length === 0}>
              {added ? t("c.added") : t("c.add")}
            </button>
          </div>
          {added && (
            <p className="label-text text-[11px] mt-2">
              <Link href="/cart" className="underline underline-offset-4">{lang === "th" ? "ไปที่ตะกร้า →" : "Go to cart →"}</Link>
            </p>
          )}
          {shareUrl && shareState === "copied" && (
            <p className="label-text text-[11px] mt-2 break-all opacity-70">{shareUrl}</p>
          )}
          {saveState === "saved" && (
            <p className="label-text text-[11px] mt-2">
              <Link href="/account" className="underline underline-offset-4">{lang === "th" ? "ดูในบัญชี →" : "See it in your account →"}</Link>
            </p>
          )}
          {saveState === "error" && (
            <p className="label-text text-[11px] mt-2 text-[color:var(--danger)]">
              {lang === "th" ? "บันทึกไม่สำเร็จ ลองอีกครั้ง" : "Couldn't save. Try again."}
            </p>
          )}
          {shareState === "error" && (
            <p className="label-text text-[11px] mt-2 text-[color:var(--danger)]">
              {lang === "th" ? "แชร์ไม่สำเร็จ ลองอีกครั้ง" : "Couldn't save the formula. Try again."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h3 className="field-label">{title}</h3>
        {hint && <span className="label-text text-[10.5px] opacity-55 text-right">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Counter({ v, max }: { v: string; max: number }) {
  return <p className="label-text text-[10px] opacity-45 text-right mt-1">{v.length}/{max}</p>;
}

function Swatches({
  items,
  value,
  onChange,
}: {
  items: { id: string; name: { en: string; th: string }; color: string; fiber: string; price: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { l } = useT();
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {items.map((p) => (
        <button key={p.id} className="chip p-2 text-left" data-active={value === p.id} onClick={() => onChange(p.id)}>
          <span
            className="block aspect-[4/5] w-full mb-2 relative overflow-hidden"
            style={{ background: p.color }}
          >
            <span
              className="absolute inset-0 opacity-50"
              style={{ backgroundImage: `radial-gradient(${p.fiber} 0.7px, transparent 0.7px)`, backgroundSize: "6px 8px" }}
            />
          </span>
          <span className="label-text text-[10.5px] leading-tight block">{l(p.name)}</span>
          <span className="label-text text-[10px] opacity-55">{p.price ? `+฿${p.price}` : "—"}</span>
        </button>
      ))}
    </div>
  );
}

function BoxIcon({ shape }: { shape: Formula["boxShape"] }) {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      {shape === "tuck" && (
        <>
          <path d="M16 10h16v32H16z" />
          <path d="M16 10l4-6h12l-4 6" />
        </>
      )}
      {shape === "sleeve" && (
        <>
          <path d="M15 14h18v28H15z" />
          <path d="M17 6h14v12H17z" strokeDasharray="2 2" />
        </>
      )}
      {shape === "cylinder" && (
        <>
          <ellipse cx="24" cy="12" rx="10" ry="3" />
          <path d="M14 12v28c0 1.7 4.5 3 10 3s10-1.3 10-3V12" />
          <path d="M14 18c0 1.7 4.5 3 10 3s10-1.3 10-3" opacity=".5" />
        </>
      )}
    </svg>
  );
}
