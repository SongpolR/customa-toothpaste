import type { Metadata } from "next";
import { LIEU } from "@/lib/catalog";

export const metadata: Metadata = { title: "Privacy — Customa" };

// Plain privacy notice (linked from Google's sign-in consent screen). Bilingual, demo store.
export default function PrivacyPage() {
  return (
    <article className="pt-28 pb-24 mx-auto w-full max-w-3xl px-5 space-y-10 text-[15px] leading-relaxed">
      <header>
        <p className="label-text text-[11px] tracking-[0.3em] uppercase opacity-60">Customa · {LIEU}</p>
        <h1 className="display text-5xl md:text-6xl mt-4">นโยบายความเป็นส่วนตัว</h1>
        <p className="display text-2xl opacity-60 mt-1">Privacy policy</p>
        <p className="mt-6 opacity-75">
          Customa เป็นร้านค้าเดโม การชำระเงินทั้งหมดอยู่ในโหมดทดสอบของ Stripe ไม่มีการเรียกเก็บเงินจริง —
          Customa is a demo store; all payments run in Stripe test mode and no real money is charged.
        </p>
      </header>

      <Section th="ข้อมูลที่เราเก็บ" en="What we store">
        <li>เมื่อเข้าสู่ระบบด้วย Google: ชื่อ อีเมล และรูปโปรไฟล์ — Signing in with Google: your name, email and profile picture.</li>
        <li>ออเดอร์: ชื่อ อีเมล เบอร์โทร ที่อยู่จัดส่ง และสูตรที่สั่ง — Orders: name, email, phone, shipping address and the formulas ordered.</li>
        <li>สูตรที่บันทึก และข้อความแชทกับทีมงาน — Saved formulas and support chat messages.</li>
        <li>ข้อมูลบัตรถูกกรอกและเก็บโดย Stripe เท่านั้น เราไม่เห็นเลขบัตร — Card details are entered at and kept by Stripe; we never see card numbers.</li>
      </Section>

      <Section th="เราใช้ข้อมูลเพื่อ" en="How we use it">
        <li>ผสม จัดส่ง และแจ้งสถานะออเดอร์ รวมถึงการส่งซ้ำตามรอบ — To compound, ship and update you on orders, including refills.</li>
        <li>แสดงออเดอร์และสูตรของคุณในหน้าบัญชี และตอบแชท — To show your orders and formulas in your account and answer your chats.</li>
        <li>เราไม่ขายหรือแบ่งปันข้อมูลเพื่อการโฆษณา — We do not sell your data or share it for advertising.</li>
      </Section>

      <Section th="ผู้ให้บริการที่เกี่ยวข้อง" en="Services we rely on">
        <li>Supabase (ฐานข้อมูลและการเข้าสู่ระบบ — database and sign-in)</li>
        <li>Stripe (การชำระเงิน — payments)</li>
        <li>Vercel (โฮสต์เว็บไซต์ — hosting)</li>
        <li>Google (เข้าสู่ระบบ — sign-in)</li>
      </Section>

      <Section th="สิทธิ์ของคุณ" en="Your choices">
        <li>ขอดู แก้ไข หรือลบข้อมูลได้ทุกเมื่อผ่านแชทในเว็บไซต์ — Ask to see, correct or delete your data any time via the site chat.</li>
        <li>ออกจากระบบได้จากหน้าบัญชี และยกเลิกสิทธิ์ของ Customa ได้ที่ myaccount.google.com/permissions — Sign out from your account page; revoke Customa&apos;s access at myaccount.google.com/permissions.</li>
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
