"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fmtTHB, herbLine, type Formula } from "@/lib/formula";
import { useT, type DictKey } from "@/lib/i18n";

type Tracked = {
  order: {
    order_no: string;
    customer_name: string;
    status: string;
    tracking_no: string | null;
    total: number;
    mode: string;
    created_at: string;
    items: { formula: Formula; qty: number; plan: string }[];
  };
  events: { status: string; note: string | null; created_at: string }[];
};

const FLOW = ["paid", "mixing", "packing", "shipped", "delivered"];

function TrackInner() {
  const { t, lang } = useT();
  const params = useSearchParams();
  const [no, setNo] = useState(params.get("no") ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [data, setData] = useState<Tracked | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const find = useCallback(async (orderNo: string, em: string) => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/orders/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_no: orderNo, email: em }),
    });
    setBusy(false);
    if (!res.ok) {
      setData(null);
      setError(t("track.notFound"));
      return;
    }
    setData(await res.json());
  }, [t]);

  useEffect(() => {
    const n = params.get("no");
    const e = params.get("email");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/selection
    if (n && e) find(n, e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idx = data ? FLOW.indexOf(data.order.status) : -1;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="pt-28 pb-24 mx-auto w-full max-w-4xl px-5">
      <h1 className="display text-5xl md:text-7xl">{t("track.title")}</h1>
      <form
        className="mt-10 grid sm:grid-cols-[1fr_1.4fr_auto] gap-5 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          find(no, email);
        }}
      >
        <label><span className="field-label">{t("track.orderNo")}</span>
          <input className="field uppercase" required value={no} onChange={(e) => setNo(e.target.value)} placeholder="CU-XXXXX" />
        </label>
        <label><span className="field-label">{t("cart.email")}</span>
          <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button className="btn-primary" disabled={busy}>{busy ? "…" : t("track.find")}</button>
      </form>
      {error && <p className="mt-6 label-text text-[13px] text-[color:var(--danger)]">{error}</p>}

      {data && (
        <div className="mt-14">
          <div className="flex flex-wrap justify-between gap-4 items-baseline">
            <p className="label-text text-[13px] tracking-[0.2em]">{data.order.order_no}</p>
            <p className="display text-3xl">{t(`status.${data.order.status}` as DictKey)}</p>
          </div>

          {data.order.status === "cancelled" ? (
            <p className="mt-6 opacity-70">{t("status.cancelled")}</p>
          ) : (
            <ol className="mt-8 grid grid-cols-5 gap-2" aria-label="Order progress">
              {FLOW.map((s, i) => (
                <li key={s} className="flex flex-col gap-2">
                  <span className={`h-1 ${i <= idx ? "bg-ink" : "bg-line"} transition-colors`} />
                  <span className={`label-text text-[10px] sm:text-[11px] tracking-[0.12em] uppercase ${i <= idx ? "" : "opacity-40"}`}>
                    {t(`status.${s}` as DictKey)}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {data.order.tracking_no && (
            <p className="mt-8 label-text text-[13px]">
              {t("track.tracking")}: <span className="font-semibold tracking-[0.15em]">{data.order.tracking_no}</span>
            </p>
          )}

          <div className="mt-12 grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="field-label mb-4">{lang === "th" ? "ไทม์ไลน์" : "Timeline"}</h2>
              <ol className="border-l border-line pl-6 space-y-5">
                {[...data.events].reverse().map((e, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[29px] top-1.5 w-2 h-2 rounded-full bg-ink" />
                    <p className="label-text text-[12px] uppercase tracking-[0.12em]">{t(`status.${e.status}` as DictKey)}</p>
                    {e.note && <p className="text-[13px] opacity-75">{e.note}</p>}
                    <p className="label-text text-[11px] opacity-50">{fmt(e.created_at)}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h2 className="field-label mb-4">{lang === "th" ? "รายการ" : "Items"}</h2>
              <ul className="border-t border-line">
                {data.order.items.map((i, n) => (
                  <li key={n} className="border-b border-line py-3">
                    <p className="label-text text-[13px] uppercase tracking-[0.08em]">{i.formula.name} × {i.qty}</p>
                    <p className="text-[12.5px] opacity-65">{herbLine(i.formula)}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 label-text text-[13px] flex justify-between"><span>{t("cart.total")}</span><span>{fmtTHB(data.order.total)}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense>
      <TrackInner />
    </Suspense>
  );
}
