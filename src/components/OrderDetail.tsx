"use client";

import { fmtTHB, herbLine, type Formula } from "@/lib/formula";
import { useT, type DictKey } from "@/lib/i18n";

// Status bar, tracking number, timeline and items of one order.
// Shared by /track (guests) and /account (signed-in customers).

export type OrderView = {
  order_no: string;
  status: string;
  tracking_no: string | null;
  total: number;
  items: { formula: Formula; qty: number; plan: string }[];
};
export type OrderEventView = { status: string; note: string | null; created_at: string };

const FLOW = ["paid", "mixing", "packing", "shipped", "delivered"];

export function useDateFmt() {
  const { lang } = useT();
  return (iso: string, withTime = true) =>
    new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-GB", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

export function OrderProgress({ status }: { status: string }) {
  const { t } = useT();
  const idx = FLOW.indexOf(status);
  if (status === "cancelled") return <p className="mt-6 opacity-70">{t("status.cancelled")}</p>;
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Order progress">
      {FLOW.map((s, i) => (
        <li key={s} className="flex flex-col gap-2">
          <span className={`h-1 ${i <= idx ? "bg-ink" : "bg-line"} transition-colors`} />
          <span className={`label-text text-[10px] sm:text-[11px] tracking-[0.12em] uppercase ${i <= idx ? "" : "opacity-40"}`}>
            {t(`status.${s}` as DictKey)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function OrderDetail({ order, events }: { order: OrderView; events: OrderEventView[] }) {
  const { t, lang } = useT();
  const fmt = useDateFmt();
  return (
    <>
      <OrderProgress status={order.status} />

      {order.tracking_no && (
        <p className="mt-8 label-text text-[13px]">
          {t("track.tracking")}: <span className="font-semibold tracking-[0.15em]">{order.tracking_no}</span>
        </p>
      )}

      <div className="mt-10 grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="field-label mb-4">{lang === "th" ? "ไทม์ไลน์" : "Timeline"}</h2>
          <ol className="border-l border-line pl-6 space-y-5">
            {[...events].reverse().map((e, i) => (
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
            {order.items.map((i, n) => (
              <li key={n} className="border-b border-line py-3">
                <p className="label-text text-[13px] uppercase tracking-[0.08em]">{i.formula.name} × {i.qty}</p>
                <p className="text-[12.5px] opacity-65">{herbLine(i.formula)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 label-text text-[13px] flex justify-between"><span>{t("cart.total")}</span><span>{fmtTHB(order.total)}</span></p>
        </div>
      </div>
    </>
  );
}
