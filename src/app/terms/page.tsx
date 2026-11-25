import type { Metadata } from "next";
import Link from "next/link";
import { LIEU } from "@/lib/catalog";

export const metadata: Metadata = { title: "Terms — Customa" };

// Short terms of use (linked from Google's sign-in consent screen). Bilingual, demo store.
export default function TermsPage() {
  return (
    <article className="pt-28 pb-24 mx-auto w-full max-w-3xl px-5 space-y-10 text-[15px] leading-relaxed">
      <header>
        <p className="label-text text-[11px] tracking-[0.3em] uppercase opacity-60">Customa · {LIEU}</p>
        <h1 className="display text-5xl md:text-6xl mt-4">
          {/* keep compound words whole when the title wraps on phones */}
          <span className="whitespace-nowrap">ข้อกำหนด</span>
          <wbr />
          <span className="whitespace-nowrap">การใช้งาน</span>
        </h1>
        <p className="display text-2xl opacity-60 mt-1">Terms of use</p>
      </header>

      <Section th="เว็บไซต์เดโม" en="A demo store">
        <li>Customa เป็นร้านค้าตัวอย่างเพื่อสาธิตระบบ ไม่มีการผลิตหรือจัดส่งสินค้าจริง — Customa is a demonstration store; no products are made or shipped.</li>
        <li>การชำระเงินอยู่ในโหมดทดสอบของ Stripe ใช้บัตรทดสอบได้เท่านั้น ไม่มีการเรียกเก็บเงินจริง — Payments run in Stripe test mode with test cards only; nothing is charged.</li>
      </Section>

      <Section th="บัญชีผู้ใช้" en="Your account">
        <li>เข้าสู่ระบบด้วยบัญชี Google ของคุณเอง และดูแลการเข้าถึงบัญชีนั้น — Sign in with your own Google account and keep it secure.</li>
        <li>เราอาจลบข้อมูลทดสอบหรือปิดบริการเดโมได้โดยไม่ต้องแจ้งล่วงหน้า — We may clear demo data or close the demo without notice.</li>
      </Section>

      <Section th="การใช้งานที่เหมาะสม" en="Fair use">
        <li>ห้ามใช้เว็บไซต์เพื่อส่งสแปม เจาะระบบ หรือรบกวนผู้ใช้อื่น — Don&apos;t use the site to spam, attack it or disrupt others.</li>
        <li>ข้อความบนฉลากต้องไม่ละเมิดผู้อื่น — Label text must not infringe on or harass anyone.</li>
      </Section>

      <Section th="ข้อมูลส่วนบุคคล" en="Personal data">
        <li>
          ดูรายละเอียดได้ที่ <Link href="/privacy" className="underline underline-offset-4">นโยบายความเป็นส่วนตัว</Link> — See the{" "}
          <Link href="/privacy" className="underline underline-offset-4">privacy policy</Link>.
        </li>
      </Section>

      <p className="label-text text-[11px] opacity-50">Last updated: November 2026</p>
    </article>
  );
}

function Section({ th, en, children }: { th: string; en: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[19px] font-medium">
        {th} <span className="opacity-50 font-normal">· {en}</span>
      </h2>
      <ul className="mt-3 list-disc pl-5 space-y-2 opacity-85">{children}</ul>
    </section>
  );
}
