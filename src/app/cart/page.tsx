"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FREE_SHIPPING_FROM, SIZES, byId } from "@/lib/catalog";
import { cartTotals, fmtTHB, formulaNo, herbLine, linePrice, unitPrice, type Plan } from "@/lib/formula";
import { useT } from "@/lib/i18n";
import { useAuth, useCart, useComposer } from "@/lib/store";
import { accountsEnabled, authFetch, signInWithGoogle } from "@/lib/auth-client";
import { LabelCard } from "@/components/ui";

const STRIPE_ON = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

function CartInner() {
  const { t, lang } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const { lines, update, remove } = useCart();
  const load = useComposer((s) => s.load);
  const totals = cartTotals(lines);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const user = useAuth((s) => s.user);
  // signed in: start from the Google account's name and email (still editable)
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill once the session is known
    setName((n) => n || user.name);
    setEmail((e) => e || user.email);
  }, [user]);

  const intervals = new Set(lines.filter((l) => l.plan !== "once").map((l) => l.plan));
  const mixed = intervals.size > 1;

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // with the session token, so the order is linked to the account
      const res = await authFetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines, customer: { name, email, phone } }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="pt-28 pb-24 mx-auto w-full max-w-[1300px] px-5 md:px-14">
      <h1 className="display text-5xl md:text-7xl">{t("cart.title")}</h1>
      {params.get("cancelled") && (
        <p className="mt-4 label-text text-[12px] opacity-70">
          {lang === "th" ? "ยกเลิกการชำระเงินแล้ว ตะกร้ายังอยู่ครบ" : "Payment cancelled — your cart is still here."}
        </p>
      )}

      {lines.length === 0 ? (
        <div className="mt-16 border border-line p-12 text-center">
          <p className="display text-3xl">{t("cart.empty")}</p>
          <Link href="/compose" className="btn-primary mt-8">{t("hero.cta")} →</Link>
        </div>
      ) : (
        <div className="mt-12 grid lg:grid-cols-[1fr_400px] gap-12 items-start">
          <ul className="border-t border-line">
            {lines.map((l) => {
              const unit = linePrice(l);
              const full = unitPrice(l.formula);
              return (
                <li key={l.id} className="border-b border-line py-7 grid grid-cols-[96px_1fr] sm:grid-cols-[130px_1fr] gap-5 sm:gap-7">
                  <div className="w-full">
                    <LabelCard f={l.formula} compact />
                  </div>
                  <div className="min-w-0">
                    <div className="flex justify-between gap-4">
                      <div className="min-w-0">
                        <p className="label-text text-[11px] opacity-55">N°{formulaNo(l.formula)} · {byId(SIZES, l.formula.size)?.grams} g</p>
                        <h2 className="label-text text-[16px] font-semibold uppercase tracking-[0.1em] break-words">{l.formula.name}</h2>
                        <p className="text-[13px] opacity-70 mt-1">{herbLine(l.formula)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="display text-2xl">{fmtTHB(unit * l.qty)}</p>
                        {unit !== full && <p className="label-text text-[11px] line-through opacity-45">{fmtTHB(full * l.qty)}</p>}
                      </div>
                    </div>

                    <fieldset className="mt-4">
                      <legend className="field-label mb-2">{t("cart.plan")}</legend>
                      <div className="flex flex-wrap gap-2">
                        {(["once", "2m", "3m"] as Plan[]).map((p) => (
                          <button
                            key={p}
                            type="button"
                            className="chip px-3 py-2 label-text text-[11px]"
                            data-active={l.plan === p}
                            onClick={() => update(l.id, { plan: p })}
                          >
                            {t(`cart.${p}`)}
                          </button>
                        ))}
                      </div>
                      {l.plan !== "once" && (
                        <label className="mt-3 flex items-center gap-2 text-[13px]">
                          <input type="checkbox" checked={l.returnTube} onChange={(e) => update(l.id, { returnTube: e.target.checked })} className="accent-[color:var(--ink)]" />
                          {t("cart.return")}
                        </label>
                      )}
                    </fieldset>

                    <div className="mt-4 flex items-center gap-5 label-text text-[11px] tracking-[0.15em] uppercase">
                      <div className="flex items-center border border-line">
                        <button type="button" className="px-3 py-1.5" onClick={() => update(l.id, { qty: l.qty - 1 })} aria-label="Decrease">−</button>
                        <span className="px-2 tabular-nums">{l.qty}</span>
                        <button type="button" className="px-3 py-1.5" onClick={() => update(l.id, { qty: l.qty + 1 })} aria-label="Increase">+</button>
                      </div>
                      <button
                        type="button"
                        className="underline underline-offset-4 opacity-70 hover:opacity-100"
                        onClick={() => {
                          load(structuredClone(l.formula), l.id);
                          router.push("/compose");
                        }}
                      >
                        {t("cart.edit")}
                      </button>
                      <button type="button" className="underline underline-offset-4 opacity-70 hover:opacity-100" onClick={() => remove(l.id)}>
                        {t("cart.remove")}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <form onSubmit={pay} className="paper-card !p-7 lg:sticky lg:top-24 space-y-6">
            <dl className="space-y-2 label-text text-[13px]">
              <div className="flex justify-between"><dt className="opacity-70">{t("cart.subtotal")}</dt><dd>{fmtTHB(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="opacity-70">{t("cart.shipping")}</dt><dd>{totals.shipping ? fmtTHB(totals.shipping) : t("cart.free")}</dd></div>
              {totals.subtotal < FREE_SHIPPING_FROM && <p className="text-[11px] opacity-55">{t("cart.freeFrom")}</p>}
              <div className="rule my-3" />
              <div className="flex justify-between items-baseline"><dt>{t("cart.total")}</dt><dd className="display text-4xl">{fmtTHB(totals.total)}</dd></div>
            </dl>

            {user ? (
              <p className="text-[12.5px] opacity-70">{t("cart.signedInAs").replace("{email}", user.email)}</p>
            ) : (
              accountsEnabled() && (
                <button
                  type="button"
                  onClick={() => signInWithGoogle("/cart")}
                  className="label-text text-[11.5px] underline underline-offset-4 opacity-75 hover:opacity-100 text-left"
                >
                  {t("cart.signInHint")} →
                </button>
              )
            )}

            <div className="space-y-4">
              <label className="block"><span className="field-label">{t("cart.name")}</span>
                <input className="field" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </label>
              <label className="block"><span className="field-label">{t("cart.email")}</span>
                <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </label>
              <label className="block"><span className="field-label">{t("cart.phone")}</span>
                <input className="field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </label>
            </div>

            {mixed && (
              <p className="text-[13px] text-[color:var(--danger)]">
                {lang === "th" ? "สินค้าแบบสมัครรับในออเดอร์เดียวกันต้องใช้รอบเดียวกัน (2 หรือ 3 เดือน)" : "Refills in one order must share the same interval."}
              </p>
            )}
            {error && <p className="text-[13px] text-[color:var(--danger)]">{error}</p>}

            <button className="btn-primary w-full" disabled={busy || mixed}>
              {busy ? t("common.loading") : STRIPE_ON ? t("cart.checkout") : t("cart.demoPay")}
            </button>
            <p className="label-text text-[10.5px] opacity-55 leading-relaxed">
              {STRIPE_ON
                ? lang === "th"
                  ? "ชำระผ่าน Stripe (โหมดทดสอบ) — ใช้บัตร 4242 4242 4242 4242"
                  : "Secure checkout by Stripe (test mode) — use card 4242 4242 4242 4242."
                : lang === "th"
                  ? "ยังไม่ได้ตั้งค่า Stripe — ระบบจะจำลองการชำระเงินให้"
                  : "Stripe is not configured — payment will be simulated."}
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense>
      <CartInner />
    </Suspense>
  );
}
