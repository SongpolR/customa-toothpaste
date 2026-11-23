"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart, useChatUI, useLang } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function Nav() {
  const { t } = useT();
  const path = usePathname();
  const { lang, setLang } = useLang();
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const chatOpen = useChatUI((s) => s.open);
  const chatUnread = useChatUI((s) => s.unread);
  const toggleChat = useChatUI((s) => s.toggle);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }

  if (path.startsWith("/admin")) return null;

  const links = [
    { href: "/compose", label: t("nav.compose") },
    { href: "/quiz", label: t("nav.quiz") },
    { href: "/track", label: t("nav.track") },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        scrolled || path !== "/" ? "bg-paper/85 backdrop-blur-md border-b border-line" : ""
      }`}
    >
      <nav className="mx-auto max-w-[1400px] h-16 px-5 md:px-14 flex items-center justify-between label-text text-[11.5px] tracking-[0.18em] uppercase">
        <Link href="/" className="text-[15px] tracking-[0.42em] font-semibold" aria-label="Customa home">
          CUSTOMA
        </Link>
        <div className="hidden md:flex items-center gap-6 lg:gap-9">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`whitespace-nowrap hover:opacity-100 ${path === l.href ? "opacity-100 underline underline-offset-8" : "opacity-70"}`}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4 md:gap-5 lg:gap-6">
          <button
            onClick={() => setLang(lang === "th" ? "en" : "th")}
            className="whitespace-nowrap opacity-80 hover:opacity-100"
            aria-label="Switch language"
          >
            <span className={lang === "th" ? "font-semibold" : "opacity-50"}>TH</span>
            <span className="opacity-40"> / </span>
            <span className={lang === "en" ? "font-semibold" : "opacity-50"}>EN</span>
          </button>
          {/* support chat lives in the header so it never covers the page */}
          <button
            onClick={toggleChat}
            className={`relative flex items-center gap-2 uppercase ${chatOpen ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
            aria-label={t("nav.chat")}
            aria-expanded={chatOpen}
            aria-controls="customa-chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 5h16v11H9l-5 4z" strokeLinejoin="round" />
            </svg>
            <span className={`hidden lg:inline ${chatOpen ? "underline underline-offset-8" : ""}`}>{t("nav.chat")}</span>
            {chatUnread > 0 && !chatOpen && (
              <span className="absolute -top-1.5 left-3 min-w-4 h-4 px-1 rounded-full bg-ink text-paper text-[9px] tracking-normal inline-flex items-center justify-center">
                {chatUnread}
              </span>
            )}
          </button>
          <Link href="/cart" className="flex items-center gap-2" aria-label={t("nav.cart")}>
            <span className="hidden sm:inline whitespace-nowrap">{t("nav.cart")}</span>
            <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 border border-ink text-[11px] tracking-normal">
              {count}
            </span>
          </Link>
          <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            <span className="block w-5 h-px bg-ink mb-1.5" />
            <span className="block w-5 h-px bg-ink" />
          </button>
        </div>
      </nav>
      {open && (
        <div className="md:hidden border-t border-line bg-paper px-5 py-4 flex flex-col gap-4 label-text text-[12px] tracking-[0.18em] uppercase">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
