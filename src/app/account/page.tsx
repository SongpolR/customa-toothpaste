"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fmtTHB, herbLine, type Formula } from "@/lib/formula";
import { useT, type DictKey } from "@/lib/i18n";
import { useAuth, useChatUI, useComposer, type AccountUser } from "@/lib/store";
import { accountsEnabled, authFetch, signInWithGoogle, signOut } from "@/lib/auth-client";
import { OrderDetail, useDateFmt, type OrderEventView, type OrderView } from "@/components/OrderDetail";
import { PasteSwatch } from "@/components/ui";

export default function AccountPage() {
  const { user, ready } = useAuth();
  return (
    <div className="pt-28 pb-24 mx-auto w-full max-w-5xl px-5">
      {!ready ? <p className="label-text text-[12px] opacity-50">…</p> : user ? <SignedIn user={user} /> : <SignedOut />}
    </div>
  );
}

/* Signed out -------------------------------------------------------- */

function GoogleButton({ returnTo = "/account" }: { returnTo?: string }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-ghost !bg-white !normal-case !tracking-normal gap-3"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signInWithGoogle(returnTo);
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      <span className="text-[14px]">{busy ? "…" : t("acct.google")}</span>
    </button>
  );
}

function SignedOut() {
  const { t } = useT();
  const perks: DictKey[] = ["acct.perks1", "acct.perks2", "acct.perks3", "acct.perks4"];
  return (
    <>
      <h1 className="display text-5xl md:text-7xl">{t("acct.title")}</h1>
      <div className="mt-10 grid md:grid-cols-[1.2fr_1fr] gap-12 items-start">
        <div>
          <p className="text-[17px] leading-relaxed opacity-85 max-w-md">{t("acct.intro")}</p>
          <ul className="mt-8 space-y-3">
            {perks.map((k, i) => (
              <li key={k} className="flex gap-4 text-[15px]">
                <span className="label-text text-[11px] opacity-50 pt-1">0{i + 1}</span>
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-card border border-line p-7 flex flex-col gap-5">
          {accountsEnabled() ? <GoogleButton /> : <p className="text-[14px] opacity-75">{t("acct.noSupabase")}</p>}
          <Link href="/track" className="label-text text-[12px] underline underline-offset-4 opacity-75 hover:opacity-100">
            {t("acct.guestTrack")} →
          </Link>
        </div>
      </div>
    </>
  );
}

/* Signed in --------------------------------------------------------- */

type Tab = "orders" | "refills" | "formulas" | "help";
const TABS: Tab[] = ["orders", "refills", "formulas", "help"];

function SignedIn({ user }: { user: AccountUser }) {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("orders");
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-center gap-5">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- Google avatar URL, tiny
            <img src={user.avatar} alt="" width={64} height={64} className="w-16 h-16 rounded-full border border-line" referrerPolicy="no-referrer" />
          ) : (
            <span className="w-16 h-16 rounded-full bg-ink text-paper grid place-items-center text-2xl">{user.name.slice(0, 1).toUpperCase()}</span>
          )}
          <div>
            <h1 className="display text-4xl md:text-5xl">{user.name}</h1>
            <p className="label-text text-[12px] opacity-60 mt-1">{user.email}</p>
          </div>
        </div>
        <button className="btn-ghost" onClick={() => signOut()}>{t("acct.signOut")}</button>
      </div>

      <nav className="mt-12 flex gap-6 md:gap-10 border-b border-line overflow-x-auto" aria-label={t("acct.title")}>
        {TABS.map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`label-text text-[12px] tracking-[0.18em] uppercase pb-3 -mb-px whitespace-nowrap border-b ${tab === k ? "border-ink" : "border-transparent opacity-55 hover:opacity-90"}`}
            aria-current={tab === k ? "page" : undefined}
          >
            {t(`acct.tab.${k}` as DictKey)}
          </button>
        ))}
      </nav>

      <div className="mt-10">
        {tab === "orders" && <Orders />}
        {tab === "refills" && <Refills />}
        {tab === "formulas" && <Formulas />}
        {tab === "help" && <Help />}
      </div>
    </>
  );
}

/** GET an account endpoint once on mount (and on reload()). */
function useAccountData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    const r = await authFetch(url).catch(() => null);
    if (!r?.ok) {
      setError(true);
      return;
    }
    setData(await r.json());
  }, [url]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    load();
  }, [load]);
  return { data, error, reload: load };
}

function Loading({ error }: { error: boolean }) {
  const { t } = useT();
  return <p className="label-text text-[12px] opacity-60">{error ? t("acct.loadError") : "…"}</p>;
}

/* Orders */

type AccountOrder = OrderView & { id: string; created_at: string; is_refill: boolean; mode: string; events: OrderEventView[] };

function Orders() {
  const { t } = useT();
  const fmt = useDateFmt();
  const { data, error } = useAccountData<{ orders: AccountOrder[] }>("/api/account/orders");
  const [open, setOpen] = useState<string | null>(null);
  if (!data) return <Loading error={error} />;
  return (
    <>
      <p className="text-[13px] opacity-60 mb-6">{t("acct.emailNote")}</p>
      {data.orders.length === 0 ? (
        <p className="opacity-70">{t("acct.noOrders")}</p>
      ) : (
        <ul className="border-t border-line">
          {data.orders.map((o) => (
            <li key={o.id} className="border-b border-line">
              <button
                className="w-full py-5 grid grid-cols-[1fr_auto] md:grid-cols-[150px_1fr_160px_110px] gap-x-6 gap-y-1 items-baseline text-left"
                onClick={() => setOpen(open === o.id ? null : o.id)}
                aria-expanded={open === o.id}
              >
                <span className="label-text text-[13px] tracking-[0.12em]">{o.order_no}</span>
                <span className="text-[14px] md:order-none order-3 col-span-2 md:col-span-1 opacity-80">
                  {o.items.map((i) => `${i.formula.name} × ${i.qty}`).join(", ")}
                  {o.is_refill && <span className="ml-2 label-text text-[10px] uppercase tracking-[0.15em] border border-line px-1.5 py-0.5">{t("acct.refill")}</span>}
                </span>
                <span className="label-text text-[12px] uppercase tracking-[0.12em]">{t(`status.${o.status}` as DictKey)}</span>
                <span className="label-text text-[13px] text-right hidden md:block">{fmtTHB(o.total)}</span>
                <span className="label-text text-[11px] opacity-50 order-4 col-span-2 md:col-span-4">{fmt(o.created_at, false)}</span>
              </button>
              {open === o.id && (
                <div className="pb-10 pt-2">
                  <OrderDetail order={o} events={o.events} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* Refills */

type Refill = {
  id: string;
  order_no: string;
  plan: string;
  items: { formula: Formula; qty: number }[];
  refills_delivered: number;
  status?: string;
  cancel_at_period_end?: boolean;
  next_charge?: number | null;
};

function Refills() {
  const { t } = useT();
  const fmt = useDateFmt();
  const { data, error, reload } = useAccountData<{ refills: Refill[]; stripe: boolean }>("/api/account/refills");
  const [busy, setBusy] = useState<string | null>(null);
  // stopping asks once, inline (no browser dialog)
  const [confirming, setConfirming] = useState<string | null>(null);
  if (!data) return <Loading error={error} />;
  if (data.refills.length === 0) return <p className="opacity-70">{t("acct.noRefills")}</p>;

  const act = async (r: Refill, action: "cancel" | "resume") => {
    setConfirming(null);
    setBusy(r.id);
    await authFetch(`/api/account/refills/${r.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await reload();
    setBusy(null);
  };

  return (
    <ul className="grid md:grid-cols-2 gap-5">
      {data.refills.map((r) => {
        const ended = r.status === "canceled" || r.status === "missing" || r.status === "incomplete_expired";
        const state = ended ? t("acct.ended") : r.cancel_at_period_end ? t("acct.stopping") : t("acct.active");
        const date = r.next_charge ? fmt(new Date(r.next_charge * 1000).toISOString(), false) : null;
        return (
          <li key={r.id} className="bg-card border border-line p-6 flex flex-col gap-4">
            <div className="flex justify-between items-baseline gap-4">
              <span className="label-text text-[12px] tracking-[0.12em]">{r.order_no}</span>
              <span className={`label-text text-[11px] uppercase tracking-[0.15em] ${ended ? "opacity-50" : ""}`}>{state}</span>
            </div>
            {r.items.map((i, n) => (
              <div key={n} className="flex items-center gap-4">
                <PasteSwatch f={i.formula} size={36} />
                <div>
                  <p className="text-[16px]">{i.formula.name} × {i.qty}</p>
                  <p className="text-[12.5px] opacity-60">{herbLine(i.formula)}</p>
                </div>
              </div>
            ))}
            <dl className="grid grid-cols-2 gap-y-1 text-[13px]">
              <dt className="opacity-60">{t("acct.every").replace("{n}", r.plan === "3m" ? "3" : "2")}</dt>
              <dd className="text-right">
                {date && !ended && (
                  <>
                    <span className="opacity-60">{r.cancel_at_period_end ? t("acct.endsOn") : t("acct.next")}: </span>
                    {date}
                  </>
                )}
              </dd>
              <dt className="opacity-60">{t("acct.delivered")}</dt>
              <dd className="text-right">{r.refills_delivered}</dd>
            </dl>
            {data.stripe && !ended && confirming === r.id && (
              <div className="border border-ink p-4 flex flex-col gap-3">
                <p className="text-[13px]">{t("acct.stopConfirm")}</p>
                <div className="flex gap-3">
                  <button className="btn-primary flex-1" onClick={() => act(r, "cancel")}>{t("acct.stop")}</button>
                  <button className="btn-ghost flex-1" onClick={() => setConfirming(null)}>{t("acct.resume")}</button>
                </div>
              </div>
            )}
            {data.stripe && !ended && confirming !== r.id && (
              <button
                className={r.cancel_at_period_end ? "btn-primary" : "btn-ghost"}
                disabled={busy === r.id}
                onClick={() => (r.cancel_at_period_end ? act(r, "resume") : setConfirming(r.id))}
              >
                {busy === r.id ? "…" : r.cancel_at_period_end ? t("acct.resume") : t("acct.stop")}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* Saved formulas */

function Formulas() {
  const { t } = useT();
  const router = useRouter();
  const load = useComposer((s) => s.load);
  const { data, error, reload } = useAccountData<{ formulas: { id: string; formula: Formula; created_at: string }[] }>(
    "/api/account/formulas",
  );
  const [confirming, setConfirming] = useState<string | null>(null);
  if (!data) return <Loading error={error} />;
  if (data.formulas.length === 0) return <p className="opacity-70">{t("acct.noFormulas")}</p>;
  return (
    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {data.formulas.map(({ id, formula }) => (
        <li key={id} className="bg-card border border-line p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <PasteSwatch f={formula} size={40} />
            <div className="min-w-0">
              <p className="text-[17px] truncate">{formula.name}</p>
              <p className="text-[12.5px] opacity-60">{herbLine(formula)}</p>
            </div>
          </div>
          {formula.tubeText.forName && <p className="label-text text-[11px] opacity-60">for {formula.tubeText.forName}</p>}
          <div className="mt-auto flex gap-3">
            <button
              className="btn-primary flex-1"
              onClick={() => {
                load(formula);
                router.push("/compose");
              }}
            >
              {t("acct.open")}
            </button>
            <button
              className={confirming === id ? "btn-primary" : "btn-ghost"}
              title={confirming === id ? t("acct.deleteConfirm") : undefined}
              onClick={async () => {
                // first click arms, second click deletes
                if (confirming !== id) {
                  setConfirming(id);
                  return;
                }
                setConfirming(null);
                await authFetch(`/api/account/formulas/${id}`, { method: "DELETE" });
                reload();
              }}
            >
              {confirming === id ? t("acct.deleteConfirm") : t("acct.delete")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* Help */

function Help() {
  const { t } = useT();
  const openChat = useChatUI((s) => s.setOpen);
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="bg-card border border-line p-7 flex flex-col gap-4">
        <p className="text-[18px]">{t("acct.helpChat")}</p>
        <p className="text-[13.5px] opacity-70">{t("acct.helpChatNote")}</p>
        <button className="btn-primary mt-auto" onClick={() => openChat(true)}>{t("nav.chat")}</button>
      </div>
      <div className="bg-card border border-line p-7 flex flex-col gap-4">
        <p className="text-[18px]">{t("track.title")}</p>
        <p className="text-[13.5px] opacity-70">{t("acct.guestTrack")}</p>
        <Link href="/track" className="btn-ghost mt-auto">{t("track.find")}</Link>
      </div>
    </div>
  );
}
