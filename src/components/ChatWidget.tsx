"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";
import { listen } from "@/lib/supabase-browser";
import { useChatUI } from "@/lib/store";

type Msg = { id: number; sender: "customer" | "admin" | "system"; body: string; created_at: string };
type Session = { id: string; token: string; channel: string };

const KEY = "customa-chat";

function readSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

export default function ChatWidget() {
  const { t, lang } = useT();
  const path = usePathname();
  // opened from the chat button in the header (Nav), so it never covers the page
  const open = useChatUI((s) => s.open);
  const setOpen = useChatUI((s) => s.setOpen);
  const addUnread = useChatUI((s) => s.addUnread);
  const [session, setSession] = useState<Session | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [form, setForm] = useState({ name: "", email: "", order_no: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Messages are merged against a ref, not inside a setState updater: React may
  // run updaters twice, which double-counted unread replies and updated the
  // header (another component) during render.
  const msgsRef = useRef<Msg[]>([]);
  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return;
    const prev = msgsRef.current;
    const seen = new Set(prev.map((m) => m.id));
    const fresh = incoming.filter((m) => !seen.has(m.id));
    if (!fresh.length) return;
    // history loaded on page open is not "new"; only count replies that arrive later
    if (!openRef.current && prev.length > 0) addUnread(fresh.filter((m) => m.sender !== "customer").length);
    const all = [...prev, ...fresh].sort((a, b) => a.id - b.id);
    msgsRef.current = all;
    lastId.current = all[all.length - 1].id;
    setMsgs(all);
  }, [addUnread]);

  useEffect(() => {
    // localStorage is read after mount so server and client markup match
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(readSession());
  }, []);

  // poll (always) + realtime (when Supabase is configured)
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const poll = async () => {
      const r = await fetch(`/api/chat/${session.id}?token=${encodeURIComponent(session.token)}&after=${lastId.current}`);
      if (r.status === 404) {
        localStorage.removeItem(KEY);
        setSession(null);
        return;
      }
      const d = await r.json();
      if (alive && d.messages) merge(d.messages);
    };
    poll();
    const iv = setInterval(poll, open ? 4000 : 15000);
    const stop = listen(session.channel, "message", (m) => merge([m as Msg]));
    return () => {
      alive = false;
      clearInterval(iv);
      stop();
    };
  }, [session, open, merge]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [open, msgs]);

  // Esc closes the panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (path.startsWith("/admin")) return null;

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, message: text, lang }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(d.error ?? "Error");
      return;
    }
    const s = { id: d.id, token: d.token, channel: d.channel };
    localStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
    merge(d.messages);
    setText("");
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !text.trim()) return;
    const body = text;
    setText("");
    const r = await fetch(`/api/chat/${session.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: session.token, body }),
    });
    const d = await r.json();
    if (d.message) merge([d.message]);
  };

  return (
    <>
      {open && (
        <div
          id="customa-chat"
          role="dialog"
          aria-label={t("chat.title")}
          // drops down from the header's chat button
          className="fixed z-[70] top-[72px] right-3 left-3 sm:left-auto md:right-8 sm:w-[380px] h-[min(560px,calc(100svh-96px))] bg-card border border-ink flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-[fadein_.3s_ease]"
        >
          <div className="px-5 py-4 border-b border-line flex items-start justify-between gap-4">
            <div>
              <p className="label-text text-[12px] tracking-[0.25em] uppercase font-semibold">{t("chat.title")}</p>
              <p className="text-[12.5px] opacity-70 mt-1">{t("chat.hello")}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-[20px] leading-none opacity-60 hover:opacity-100 -mt-0.5"
              aria-label={lang === "th" ? "ปิดแชท" : "Close chat"}
            >
              ×
            </button>
          </div>

          {!session ? (
            <form onSubmit={start} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <label className="block"><span className="field-label">{t("cart.name")}</span>
                <input className="field" required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="block"><span className="field-label">{t("cart.email")}</span>
                <input className="field" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="block"><span className="field-label">{t("chat.orderOpt")}</span>
                <input className="field uppercase" maxLength={20} value={form.order_no} onChange={(e) => setForm({ ...form, order_no: e.target.value })} placeholder="CU-XXXXX" />
              </label>
              <label className="block"><span className="field-label">{t("chat.placeholder")}</span>
                <textarea className="field resize-none" rows={3} required maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
              </label>
              {error && <p className="text-[12px] text-[color:var(--danger)]">{error}</p>}
              <button className="btn-primary w-full" disabled={busy}>{busy ? "…" : t("chat.start")}</button>
            </form>
          ) : (
            <>
              <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-live="polite">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "customer" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 text-[13.5px] leading-snug whitespace-pre-wrap break-words ${
                        m.sender === "customer"
                          ? "bg-ink text-paper"
                          : m.sender === "system"
                            ? "border border-dashed border-line label-text text-[11.5px] opacity-75"
                            : "bg-paper border border-line"
                      }`}
                    >
                      {m.sender === "admin" && <span className="block label-text text-[9.5px] tracking-[0.2em] uppercase opacity-55 mb-1">Customa lab</span>}
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="border-t border-line flex">
                <input
                  className="flex-1 bg-transparent px-4 py-3.5 text-[14px] outline-none"
                  value={text}
                  maxLength={2000}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("chat.placeholder")}
                  aria-label={t("chat.placeholder")}
                />
                <button className="px-5 label-text text-[11px] tracking-[0.2em] uppercase border-l border-line" disabled={!text.trim()}>
                  {t("chat.send")}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
