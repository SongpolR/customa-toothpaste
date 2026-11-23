"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BASES, BOOSTERS, BOX_PAPERS, BOX_SHAPES, CAPS, HERBS, SIZES, TUBE_PAPERS, byId } from "@/lib/catalog";
import { fmtTHB, formulaNo, type Formula } from "@/lib/formula";
import { listen } from "@/lib/supabase-browser";
import { LabelCard } from "../ui";

type Status = "pending_payment" | "paid" | "mixing" | "packing" | "shipped" | "delivered" | "cancelled";
type Item = { formula: Formula; qty: number; plan: string; returnTube: boolean; unit: number };
type Order = {
  id: string;
  order_no: string;
  email: string;
  customer_name: string;
  phone: string | null;
  items: Item[];
  subtotal: number;
  shipping: number;
  total: number;
  mode: string;
  status: Status;
  tracking_no: string | null;
  shipping_address: Record<string, unknown> | null;
  parent_order_id: string | null;
  created_at: string;
};
type Event = { id: number; status: string; note: string | null; created_at: string };
type Thread = { id: string; name: string; email: string; order_no: string | null; status: "open" | "closed"; unread_admin: number; last_message: string | null; last_message_at: string };
type Msg = { id: number; sender: "customer" | "admin" | "system"; body: string; created_at: string };
type Session = { admin: boolean; channel?: string; backend?: string; payments?: string };

const STATUS_LABEL: Record<Status, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  mixing: "Compounding",
  packing: "Packing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const NEXT: Partial<Record<Status, Status>> = { paid: "mixing", mixing: "packing", packing: "shipped", shipped: "delivered" };
const STATUS_TONE: Record<Status, string> = {
  pending_payment: "border-dashed opacity-60",
  paid: "bg-[#efe6c9]",
  mixing: "bg-[#e2ead6]",
  packing: "bg-[#dfe6ec]",
  shipped: "bg-ink text-paper",
  delivered: "bg-[#c9d6b8]",
  cancelled: "line-through opacity-50",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/admin/session");
    setSession(await r.json());
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/selection
    refresh();
  }, [refresh]);

  if (!session) return <div className="p-10 label-text text-sm opacity-60">Loading…</div>;
  if (!session.admin) return <Login onDone={refresh} />;
  return <Console session={session} onLogout={refresh} />;
}

/* ------------------------------------------------------------------ */

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen grid place-items-center px-5">
      <form
        className="paper-card !p-10 w-full max-w-sm space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
          setBusy(false);
          if (r.ok) onDone();
          else setErr("Wrong password");
        }}
      >
        <div>
          <p className="keep-tracking label-text text-[13px] tracking-[0.4em] font-semibold">CUSTOMA</p>
          <p className="label-text text-[11px] tracking-[0.2em] uppercase opacity-60 mt-1">Lab console</p>
        </div>
        <label className="block">
          <span className="field-label">Password</span>
          <input className="field" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
        </label>
        {err && <p className="text-[12px] text-[color:var(--danger)]">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "…" : "Enter"}</button>
        <p className="label-text text-[10.5px] opacity-50">Set ADMIN_PASSWORD in .env.local. Local dev default: “customa”.</p>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Console({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tab, setTab] = useState<"orders" | "support">("orders");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [tick, setTick] = useState(0);

  const loadThreads = useCallback(async () => {
    const r = await fetch("/api/admin/chat");
    if (r.status === 401) return onLogout();
    const d = await r.json();
    setThreads(d.threads ?? []);
  }, [onLogout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/selection
    loadThreads();
    const iv = setInterval(loadThreads, 8000);
    const stopA = session.channel ? listen(session.channel, "message", () => { loadThreads(); setTick((x) => x + 1); }) : () => {};
    const stopB = session.channel ? listen(session.channel, "thread", () => loadThreads()) : () => {};
    return () => {
      clearInterval(iv);
      stopA();
      stopB();
    };
  }, [loadThreads, session.channel]);

  const unread = threads.reduce((n, t) => n + t.unread_admin, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-card">
        <div className="px-5 md:px-8 h-14 flex items-center gap-6 label-text text-[11px] tracking-[0.18em] uppercase">
          <span className="keep-tracking text-[13px] tracking-[0.4em] font-semibold">CUSTOMA</span>
          <span className="opacity-50 hidden sm:inline">Lab console</span>
          <nav className="flex gap-1 ml-4">
            {(["orders", "support"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 ${tab === t ? "bg-ink text-paper" : "opacity-70 hover:opacity-100"}`}>
                {t === "orders" ? "Orders" : "Support"}
                {t === "support" && unread > 0 && <span className="ml-2 inline-flex w-5 h-5 items-center justify-center rounded-full bg-[color:var(--danger)] text-paper text-[10px]">{unread}</span>}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden md:inline opacity-50">{session.backend} · {session.payments}</span>
            <Link href="/" className="opacity-70 hover:opacity-100">Site ↗</Link>
            <button
              className="opacity-70 hover:opacity-100"
              onClick={async () => {
                await fetch("/api/admin/session", { method: "DELETE" });
                onLogout();
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      {tab === "orders" ? <Orders onAuthLost={onLogout} /> : <Support threads={threads} reloadThreads={loadThreads} tick={tick} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Orders                                                               */
/* ------------------------------------------------------------------ */

function Orders({ onAuthLost }: { onAuthLost: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ revenue: 0, ordersToday: 0, toCompound: 0, tubes: 0 });
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/orders?status=${status}&q=${encodeURIComponent(q)}`);
    if (r.status === 401) return onAuthLost();
    const d = await r.json();
    setOrders(d.orders ?? []);
    setStats(d.stats);
  }, [status, q, onAuthLost]);

  useEffect(() => {
    const id = setTimeout(load, 200);
    const iv = setInterval(load, 10000);
    return () => {
      clearTimeout(id);
      clearInterval(iv);
    };
  }, [load]);

  return (
    <div className="flex-1 grid xl:grid-cols-[1fr_520px] min-h-0">
      <div className="p-5 md:p-8 min-w-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line">
          {[
            ["Revenue", fmtTHB(stats.revenue)],
            ["Orders today", stats.ordersToday],
            ["To compound", stats.toCompound],
            ["Tubes sold", stats.tubes],
          ].map(([k, v]) => (
            <div key={k} className="bg-paper p-5">
              <p className="field-label">{k}</p>
              <p className="display text-4xl mt-2">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-2 items-center label-text text-[11px] tracking-[0.12em] uppercase">
          {["", "pending_payment", "paid", "mixing", "packing", "shipped", "delivered", "cancelled"].map((s) => (
            <button key={s || "all"} className="chip px-3 py-1.5" data-active={status === s} onClick={() => setStatus(s)}>
              {s ? STATUS_LABEL[s as Status] : "All"}
            </button>
          ))}
          <input className="field !w-56 ml-auto !py-1.5 normal-case tracking-normal" placeholder="Search order / name / email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="mt-5 overflow-x-auto border border-line">
          <table className="w-full text-left label-text text-[12.5px]">
            <thead className="bg-card">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-normal field-label">
                <th>Order</th><th>Placed</th><th>Customer</th><th>Tubes</th><th>Total</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center opacity-50">No orders yet. Place one from the site to see it here.</td></tr>
              )}
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  className={`border-t border-line cursor-pointer hover:bg-card [&>td]:px-4 [&>td]:py-3 ${selected === o.id ? "bg-card" : ""}`}
                >
                  <td className="font-semibold tracking-[0.08em]">
                    {o.order_no}
                    {o.mode === "subscription" && <span className="ml-2 opacity-50" title="Refill subscription">↻</span>}
                    {o.parent_order_id && <span className="ml-1 opacity-50 text-[10px]">refill</span>}
                  </td>
                  <td className="opacity-70 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                  <td className="min-w-40"><span className="block">{o.customer_name}</span><span className="opacity-55 text-[11px]">{o.email}</span></td>
                  <td>{o.items.reduce((n, i) => n + i.qty, 0)}</td>
                  <td>{fmtTHB(o.total)}</td>
                  <td><span className={`inline-block border border-line px-2 py-1 text-[10.5px] uppercase tracking-[0.1em] whitespace-nowrap ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="border-t xl:border-t-0 xl:border-l border-line bg-card min-h-0 xl:h-[calc(100vh-3.5rem)] xl:sticky xl:top-0 overflow-y-auto">
        {selected ? (
          <OrderDetail id={selected} onChanged={load} onClose={() => setSelected(null)} />
        ) : (
          <div className="p-10 label-text text-[12px] opacity-50">Select an order to see its compounding sheet.</div>
        )}
      </aside>
    </div>
  );
}

/** Production recipe: herb share by level, boosters at fixed dosage. */
function recipe(f: Formula) {
  const rows: { name: string; pct: number }[] = [];
  for (const h of f.herbs) rows.push({ name: `${byId(HERBS, h.id)?.name.en} extract`, pct: h.level * 1.2 });
  const dose: Record<string, number> = { xylitol: 10, nha: 10, fluoride: 0.22, coconut: 3 };
  for (const b of f.boosters) rows.push({ name: byId(BOOSTERS, b)?.name.en ?? b, pct: dose[b] ?? 1 });
  const used = rows.reduce((s, r) => s + r.pct, 0);
  rows.unshift({ name: `${byId(BASES, f.base)?.name.en} + glycerin + water`, pct: 100 - used });
  return rows;
}

function OrderDetail({ id, onChanged, onClose }: { id: string; onChanged: () => void; onClose: () => void }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setOrder(d.order);
        setEvents(d.events ?? []);
        setTracking(d.order?.tracking_no ?? "");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    const r = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    setBusy(false);
    if (d.order) {
      setOrder(d.order);
      setEvents(d.events);
      setNote("");
      onChanged();
    }
  };

  const address = useMemo(() => {
    const a = order?.shipping_address as { address?: Record<string, string>; name?: string } | null;
    if (!a?.address) return null;
    const x = a.address;
    return [a.name, x.line1, x.line2, [x.city, x.state, x.postal_code].filter(Boolean).join(" "), x.country].filter(Boolean).join("\n");
  }, [order]);

  if (!order) return <div className="p-8 label-text text-[12px] opacity-50">Loading…</div>;
  const next = NEXT[order.status];

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="field-label">{fmtDate(order.created_at)} · {order.mode}</p>
          <h2 className="label-text text-2xl font-semibold tracking-[0.12em] mt-1">{order.order_no}</h2>
          <p className="text-[13px] mt-1">{order.customer_name} · {order.email}{order.phone ? ` · ${order.phone}` : ""}</p>
        </div>
        <button onClick={onClose} className="label-text text-[18px] opacity-60 hover:opacity-100" aria-label="Close">×</button>
      </div>

      {/* status control */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`border border-line px-2.5 py-1.5 label-text text-[11px] uppercase tracking-[0.1em] ${STATUS_TONE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
          {next && (
            <button className="btn-primary !py-2 !px-3" disabled={busy} onClick={() => patch({ status: next, note: note || undefined, tracking_no: next === "shipped" ? tracking : undefined })}>
              Mark {STATUS_LABEL[next]} →
            </button>
          )}
          {order.status === "pending_payment" && (
            <button className="btn-ghost !py-2 !px-3" disabled={busy} onClick={() => patch({ status: "paid", note: "Marked paid manually" })}>Mark paid</button>
          )}
          {order.status !== "cancelled" && order.status !== "delivered" && (
            <button className="label-text text-[10.5px] uppercase tracking-[0.15em] underline underline-offset-4 opacity-60 hover:opacity-100 ml-auto" disabled={busy} onClick={() => confirm("Cancel this order?") && patch({ status: "cancelled", note: note || "Cancelled by staff" })}>
              Cancel order
            </button>
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <label><span className="field-label">Tracking no.</span>
            <input className="field" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="TH0123456789" />
          </label>
          <button className="btn-ghost !py-2 !px-3" disabled={busy || tracking === (order.tracking_no ?? "")} onClick={() => patch({ tracking_no: tracking })}>Save</button>
        </div>
        <label className="block"><span className="field-label">Note for timeline (customer sees it)</span>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Mixed by Fon, batch 23-11" />
        </label>
        {note && <button className="btn-ghost !py-2 !px-3" disabled={busy} onClick={() => patch({ note })}>Add note</button>}
      </div>

      {address && (
        <div>
          <p className="field-label mb-2">Ship to</p>
          <pre className="label-text text-[12.5px] whitespace-pre-wrap">{address}</pre>
        </div>
      )}

      {/* compounding sheets */}
      <div className="space-y-6">
        <p className="field-label">Compounding sheets</p>
        {order.items.map((it, n) => {
          const f = it.formula;
          return (
            <div key={n} className="border border-line bg-paper p-4 space-y-4">
              <div className="flex justify-between label-text text-[12px]">
                <span className="font-semibold tracking-[0.08em] uppercase">N°{formulaNo(f)} {f.name} × {it.qty}</span>
                <span className="opacity-60">{it.plan === "once" ? "one-time" : `refill ${it.plan}`}{it.returnTube ? " · tube return" : ""}</span>
              </div>
              <table className="w-full label-text text-[12px]">
                <tbody>
                  {recipe(f).map((r) => (
                    <tr key={r.name} className="border-t border-line">
                      <td className="py-1.5">{r.name}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.pct.toFixed(2)}%</td>
                      <td className="py-1.5 text-right tabular-nums opacity-60 w-20">{((r.pct / 100) * (byId(SIZES, f.size)?.grams ?? 100)).toFixed(1)} g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 label-text text-[11.5px]">
                <dt className="opacity-55">Tube</dt><dd>{byId(TUBE_PAPERS, f.tubePaper)?.name.en} · {CAPS.find((c) => c.id === f.cap)?.name.en}</dd>
                <dt className="opacity-55">Box</dt><dd>{BOX_SHAPES.find((s) => s.id === f.boxShape)?.name.en} · {byId(BOX_PAPERS, f.boxPaper)?.name.en}</dd>
              </dl>
              <div className="grid grid-cols-2 gap-3">
                <LabelCard f={f} />
                <LabelCard f={f} kind="box" />
              </div>
            </div>
          );
        })}
        <p className="label-text text-[12px] flex justify-between"><span>Subtotal {fmtTHB(order.subtotal)} · Shipping {fmtTHB(order.shipping)}</span><span className="font-semibold">{fmtTHB(order.total)}</span></p>
      </div>

      <div>
        <p className="field-label mb-3">Timeline</p>
        <ol className="border-l border-line pl-5 space-y-3">
          {[...events].reverse().map((e) => (
            <li key={e.id} className="relative label-text text-[12px]">
              <span className="absolute -left-[24px] top-1.5 w-2 h-2 rounded-full bg-ink" />
              <span className="uppercase tracking-[0.1em]">{STATUS_LABEL[e.status as Status] ?? e.status}</span>
              {e.note && <span className="block opacity-75 normal-case">{e.note}</span>}
              <span className="block opacity-45">{fmtDate(e.created_at)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Support                                                              */
/* ------------------------------------------------------------------ */

function Support({ threads, reloadThreads, tick }: { threads: Thread[]; reloadThreads: () => void; tick: number }) {
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");

  const loadConversation = useCallback(async (id: string) => {
    const r = await fetch(`/api/admin/chat/${id}`);
    const d = await r.json();
    setThread(d.thread);
    setMsgs(d.messages ?? []);
  }, []);

  useEffect(() => {
    if (!active) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/selection
    loadConversation(active).then(reloadThreads);
    const iv = setInterval(() => loadConversation(active), 5000);
    return () => clearInterval(iv);
  }, [active, tick, loadConversation, reloadThreads]);

  const QUICK = [
    "สวัสดีค่ะ ขอบคุณที่ติดต่อ Customa นะคะ",
    "ขอเลขออเดอร์ด้วยค่ะ เดี๋ยวตรวจสอบให้เลยค่ะ",
    "ออเดอร์ของคุณกำลังผสมอยู่ค่ะ จะจัดส่งภายใน 48 ชม.",
    "Thanks for reaching out! Could you share your order number?",
  ];

  const send = async (body: string) => {
    if (!active || !body.trim()) return;
    setText("");
    const r = await fetch(`/api/admin/chat/${active}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
    const d = await r.json();
    if (d.message) setMsgs((m) => (m.some((x) => x.id === d.message.id) ? m : [...m, d.message]));
    reloadThreads();
  };

  return (
    <div className="flex-1 grid md:grid-cols-[340px_1fr] min-h-0 h-[calc(100vh-3.5rem)]">
      <ul className="border-r border-line overflow-y-auto">
        {threads.length === 0 && <li className="p-8 label-text text-[12px] opacity-50">No conversations yet. Open the chat on the site to start one.</li>}
        {threads.map((t) => (
          <li key={t.id}>
            <button onClick={() => setActive(t.id)} className={`w-full text-left px-5 py-4 border-b border-line hover:bg-card ${active === t.id ? "bg-card" : ""}`}>
              <div className="flex justify-between gap-2 label-text text-[12px]">
                <span className={`font-semibold truncate ${t.status === "closed" ? "opacity-50" : ""}`}>{t.name}</span>
                <span className="opacity-50 shrink-0">{fmtDate(t.last_message_at)}</span>
              </div>
              <p className="text-[12.5px] opacity-70 truncate mt-1">{t.last_message}</p>
              <div className="flex gap-2 mt-1.5 label-text text-[10px] uppercase tracking-[0.1em]">
                {t.order_no && <span className="border border-line px-1.5">{t.order_no}</span>}
                {t.status === "closed" && <span className="opacity-50">closed</span>}
                {t.unread_admin > 0 && <span className="bg-[color:var(--danger)] text-paper px-1.5">{t.unread_admin} new</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {thread ? (
        <div className="flex flex-col min-h-0">
          <div className="px-6 py-4 border-b border-line flex items-center gap-4">
            <div className="mr-auto">
              <p className="label-text text-[13px] font-semibold">{thread.name}</p>
              <p className="text-[12px] opacity-65">{thread.email}{thread.order_no ? ` · ${thread.order_no}` : ""}</p>
            </div>
            <button
              className="btn-ghost !py-2 !px-3"
              onClick={async () => {
                await fetch(`/api/admin/chat/${thread.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: thread.status === "open" ? "closed" : "open" }) });
                loadConversation(thread.id);
                reloadThreads();
              }}
            >
              {thread.status === "open" ? "Mark resolved" : "Reopen"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "customer" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[70%] px-4 py-2.5 text-[14px] whitespace-pre-wrap break-words ${m.sender === "admin" ? "bg-ink text-paper" : m.sender === "system" ? "border border-dashed border-line label-text text-[11.5px] opacity-70" : "bg-card border border-line"}`}>
                  {m.body}
                  <span className="block label-text text-[9.5px] opacity-50 mt-1">{fmtDate(m.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 pt-3 flex gap-2 overflow-x-auto">
            {QUICK.map((q) => (
              <button key={q} className="chip px-3 py-1.5 text-[12px] whitespace-nowrap" onClick={() => setText(q)}>{q.slice(0, 34)}…</button>
            ))}
          </div>
          <form
            className="flex p-4 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <input className="field flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply…" aria-label="Reply" />
            <button className="btn-primary" disabled={!text.trim()}>Send</button>
          </form>
        </div>
      ) : (
        <div className="grid place-items-center label-text text-[12px] opacity-50">Pick a conversation.</div>
      )}
    </div>
  );
}
