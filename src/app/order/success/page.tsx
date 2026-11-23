"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fmtTHB } from "@/lib/formula";
import { useT } from "@/lib/i18n";
import { useCart } from "@/lib/store";

type Summary = { order_no: string; email: string; status: string; total: number; mode: string; items: { name: string; qty: number; plan: string }[] };

function SuccessInner() {
  const { t, lang } = useT();
  const params = useSearchParams();
  const clear = useCart((s) => s.clear);
  const [order, setOrder] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const sid = params.get("session_id");
    const oid = params.get("order");
    const q = sid ? `session_id=${encodeURIComponent(sid)}` : oid ? `order=${encodeURIComponent(oid)}` : "";
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/selection
      setError("Missing order reference");
      return;
    }
    fetch(`/api/checkout/confirm?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.order) {
          setOrder(d.order);
          if (d.order.status !== "pending_payment") clear();
        } else setError(d.error ?? "Not found");
      })
      .catch(() => setError("Network error"));
  }, [params, clear]);

  return (
    <div className="pt-32 pb-24 mx-auto w-full max-w-3xl px-5">
      {!order && !error && <p className="label-text text-sm opacity-60">{t("ok.checking")}</p>}
      {error && <p className="label-text text-sm text-[color:var(--danger)]">{error}</p>}
      {order && (
        <div>
          <p className="label-text text-[11px] tracking-[0.3em] uppercase opacity-60">N°{order.order_no}</p>
          <h1 className="display text-5xl md:text-7xl mt-4 leading-[0.95]">{t("ok.title")}</h1>
          <p className="mt-8 opacity-80">{t("ok.body")}</p>
          <div className="mt-4 inline-block border border-ink px-6 py-4 label-text text-2xl tracking-[0.2em]">{order.order_no}</div>
          {params.get("demo") && (
            <p className="mt-4 label-text text-[11px] opacity-60">
              {lang === "th" ? "* เดโม: การชำระเงินนี้เป็นการจำลอง" : "* Demo: this payment was simulated."}
            </p>
          )}
          <ul className="mt-10 border-t border-line label-text text-[13px]">
            {order.items.map((i, n) => (
              <li key={n} className="flex justify-between border-b border-line py-3">
                <span className="uppercase tracking-[0.08em]">{i.name} × {i.qty}</span>
                <span className="opacity-60">{t(`cart.${i.plan}` as "cart.once")}</span>
              </li>
            ))}
            <li className="flex justify-between py-3"><span>{t("cart.total")}</span><span>{fmtTHB(order.total)}</span></li>
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={`/track?no=${order.order_no}&email=${encodeURIComponent(order.email)}`} className="btn-primary">
              {t("ok.track")} →
            </Link>
            <Link href="/compose" className="btn-ghost">{t("hero.cta")}</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
