import Link from "next/link";

// Shown for unknown URLs and notFound() (e.g. a shared formula link that no longer exists).
// Server component, so it is bilingual in one go rather than following the language toggle.
export default function NotFound() {
  return (
    <div className="pt-32 pb-24 mx-auto w-full max-w-3xl px-5 flex-1">
      <p className="label-text text-[11px] tracking-[0.3em] uppercase opacity-60">N°404</p>
      <h1 className="display text-5xl md:text-7xl mt-4">ไม่พบหน้านี้</h1>
      <p className="display text-2xl md:text-3xl opacity-60 mt-2">Page not found</p>
      <p className="mt-8 text-[15px] opacity-80 max-w-md">
        ลิงก์อาจหมดอายุหรือพิมพ์ผิด — The link may have expired or been mistyped.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">หน้าแรก · Home</Link>
        <Link href="/compose" className="btn-ghost">ปรุงสูตร · Compose</Link>
      </div>
    </div>
  );
}
