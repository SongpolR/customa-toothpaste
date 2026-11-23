"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Formula } from "@/lib/formula";
import { useT, type DictKey } from "@/lib/i18n";
import { OrderDetail } from "@/components/OrderDetail";

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

function TrackInner() {
  const { t } = useT();
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

          <div className="mt-8">
            <OrderDetail order={data.order} events={data.events} />
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
