"use client";

import { useLang } from "./store";
import type { L10n } from "./catalog";

const dict = {
  // nav
  "nav.compose": { en: "Compose", th: "ปรุงสูตร" },
  "nav.quiz": { en: "Find my formula", th: "หาสูตรของฉัน" },
  "nav.track": { en: "Track order", th: "ติดตามออเดอร์" },
  "nav.cart": { en: "Cart", th: "ตะกร้า" },
  "nav.chat": { en: "Chat", th: "แชท" },

  // hero
  "hero.kicker": { en: "Toothpaste laboratory — Khon\u00a0Kaen", th: "ห้องปรุงยาสีฟัน — ขอนแก่น" },
  "hero.title": { en: "Toothpaste,\ncomposed by you.", th: "ยาสีฟัน\nที่คุณปรุงเอง" },
  "hero.sub": {
    en: "Thai herbs, your ratio, packed in paper. Nothing else.",
    th: "สมุนไพรไทย ในสัดส่วนของคุณ บรรจุในกระดาษ แค่นั้นเอง",
  },
  "hero.scroll": { en: "Scroll to open the tube", th: "เลื่อนลงเพื่อเปิดหลอด" },
  "hero.s2.title": { en: "Paper, not plastic.", th: "กระดาษ ไม่ใช่พลาสติก" },
  "hero.s2.body": {
    en: "A tube of FSC paperboard with a plant-based lining. A cap of bamboo. It goes in the paper bin.",
    th: "หลอดทำจากกระดาษ FSC เคลือบด้านในด้วยวัสดุจากพืช ฝาไม้ไผ่ ทิ้งรวมกับกระดาษได้เลย",
  },
  "hero.s3.title": { en: "Twelve herbs.\nYour ratio.", th: "สมุนไพร 12 ชนิด\nสัดส่วนของคุณ" },
  "hero.s3.body": {
    en: "Peppermint for cool. Clove for warmth. Turmeric for depth. Choose up to five and set how strong.",
    th: "สะระแหน่ให้ความเย็น กานพลูให้ความอุ่น ขมิ้นชันให้รสลุ่มลึก เลือกได้สูงสุด 5 ชนิด และปรับความเข้มเองได้",
  },
  "hero.s4.title": { en: "Your label.\nYour name.", th: "ฉลากของคุณ\nชื่อของคุณ" },
  "hero.s4.body": {
    en: "Name the formula, sign it, leave a note. Every tube is compounded by hand, dated and typed one at a time — like a perfume, but for your teeth.",
    th: "ตั้งชื่อสูตร ใส่ชื่อคนใช้ และเขียนข้อความสั้นๆ ได้ ทุกหลอดผสมด้วยมือ ลงวันที่ และพิมพ์ฉลากทีละหลอด เหมือนน้ำหอม แต่สำหรับฟัน",
  },
  "hero.s5.title": { en: "Folded, not glued.", th: "พับ ไม่ใช้กาว" },
  "hero.s5.body": {
    en: "Pick a tuck box, a slide sleeve or a paper cylinder. Write on it. Then compost it.",
    th: "เลือกกล่องฝาเสียบ กล่องสไลด์ หรือกระบอกกระดาษ เขียนข้อความลงไป แล้วนำไปทำปุ๋ยได้",
  },
  "hero.s6.title": { en: "Squeeze.\nThat colour is yours.", th: "บีบ แล้วจะเห็น\nสีของสูตรคุณ" },
  "hero.s6.body": {
    en: "The paste takes its colour from the herbs you chose — no dyes. Laid on a bamboo brush with charcoal bristles.",
    th: "สีของเนื้อยามาจากสมุนไพรที่คุณเลือกล้วนๆ ไม่แต่งสี บนแปรงด้ามไม้ไผ่ ขนแปรงชาร์โคล",
  },
  "hero.s7.title": { en: "Two minutes.\nHerbs do the work.", th: "สองนาที\nให้สมุนไพรทำงาน" },
  "hero.s7.body": {
    en: "Mint cools, neem and clove look after your gums, a gentle polish brings back the white.",
    th: "สะระแหน่ให้ความเย็น สะเดากับกานพลูดูแลเหงือก เนื้อขัดอ่อนโยนช่วยให้ฟันกลับมาขาว",
  },
  "hero.s8.title": { en: "Then smile.\nProperly.", th: "แล้วก็ยิ้ม\nได้เต็มที่" },
  "hero.s8.body": {
    en: "A toothpaste made for one person, in packaging that goes back to the earth.",
    th: "ยาสีฟันที่ทำมาเพื่อคุณคนเดียว ในบรรจุภัณฑ์ที่คืนสู่ดินได้",
  },
  "hero.cta": { en: "Compose yours", th: "เริ่มปรุงสูตรของคุณ" },
  "hero.cta2": { en: "Take the 1-minute quiz", th: "ทำแบบทดสอบ 1 นาที" },

  // home sections
  "home.how": { en: "How it works", th: "ขั้นตอน" },
  "home.step1": { en: "Choose your herbs", th: "เลือกสมุนไพร" },
  "home.step1.b": { en: "Pick a base and up to five Thai herbs. Set each one from soft to strong.", th: "เลือกเนื้อยาสีฟัน และสมุนไพรไทยสูงสุด 5 ชนิด ปรับความเข้มได้ 3 ระดับ" },
  "home.step2": { en: "Dress it in paper", th: "เลือกบรรจุภัณฑ์กระดาษ" },
  "home.step2.b": { en: "Choose the tube paper, the cap and the box. Type what goes on the label.", th: "เลือกกระดาษหลอด ฝา และกล่อง พิมพ์ข้อความที่จะอยู่บนฉลาก" },
  "home.step3": { en: "We compound it", th: "เราผสมให้" },
  "home.step3.b": { en: "Mixed by hand in Khon Kaen within 48 hours, then shipped plastic-free.", th: "ผสมด้วยมือที่ขอนแก่น ภายใน 48 ชม. จัดส่งแบบไร้พลาสติก" },
  "home.herbs": { en: "The herb library", th: "คลังสมุนไพร" },
  "home.refill.title": { en: "Never run out.", th: "ไม่มีวันหมด" },
  "home.refill.body": {
    en: "Subscribe and we send a fresh tube every 2 or 3 months, 10% off. Send the old tube back and save ฿20 more.",
    th: "สมัครรับทุก 2 หรือ 3 เดือน ลด 10% ส่งหลอดเก่าคืนลดเพิ่มอีก ฿20",
  },
  "home.impact": { en: "Plastic tubes kept out of landfill", th: "หลอดพลาสติกที่ไม่ต้องลงหลุมฝังกลบ" },

  // composer
  "c.title": { en: "Compose", th: "ปรุงสูตร" },
  "c.step.formula": { en: "Formula", th: "สูตร" },
  "c.step.tube": { en: "Tube", th: "หลอด" },
  "c.step.box": { en: "Box", th: "กล่อง" },
  "c.step.words": { en: "Words", th: "ข้อความ" },
  "c.base": { en: "Base", th: "เนื้อยาสีฟัน" },
  "c.herbs": { en: "Herbs", th: "สมุนไพร" },
  "c.herbs.hint": { en: "Up to 5. Tap again to change strength.", th: "สูงสุด 5 ชนิด แตะซ้ำเพื่อเปลี่ยนความเข้ม" },
  "c.boosters": { en: "Boosters", th: "ส่วนผสมเสริม" },
  "c.size": { en: "Size", th: "ขนาด" },
  "c.paper": { en: "Paper", th: "กระดาษ" },
  "c.cap": { en: "Cap", th: "ฝา" },
  "c.shape": { en: "Shape", th: "รูปทรง" },
  "c.name": { en: "Formula name", th: "ชื่อสูตร" },
  "c.forName": { en: "Made for", th: "ทำให้" },
  "c.note": { en: "Small note on tube", th: "ข้อความสั้นบนหลอด" },
  "c.boxTitle": { en: "Box title", th: "หัวข้อบนกล่อง" },
  "c.boxMessage": { en: "Message on box", th: "ข้อความบนกล่อง" },
  "c.profile": { en: "Taste profile", th: "โปรไฟล์รสชาติ" },
  "c.add": { en: "Add to cart", th: "ใส่ตะกร้า" },
  "c.added": { en: "Added ✓", th: "เพิ่มแล้ว ✓" },
  "c.share": { en: "Share formula", th: "แชร์สูตร" },
  "c.copied": { en: "Link copied", th: "คัดลอกลิงก์แล้ว" },
  "c.view.tube": { en: "Tube", th: "หลอด" },
  "c.view.box": { en: "Box", th: "กล่อง" },
  "c.view.both": { en: "Both", th: "ทั้งคู่" },
  "c.next": { en: "Next", th: "ถัดไป" },
  "c.back": { en: "Back", th: "ย้อนกลับ" },
  "c.drag": { en: "Drag to rotate", th: "ลากเพื่อหมุน" },
  "c.reset": { en: "Reset", th: "เริ่มใหม่" },
  "p.fresh": { en: "Fresh", th: "สดชื่น" },
  "p.herbal": { en: "Herbal", th: "สมุนไพร" },
  "p.spicy": { en: "Spicy", th: "เผ็ดร้อน" },
  "p.sweet": { en: "Sweet", th: "หวาน" },
  "p.whitening": { en: "Whitening", th: "ขาว" },
  "p.gum": { en: "Gum care", th: "ดูแลเหงือก" },
  "lvl.1": { en: "soft", th: "อ่อน" },
  "lvl.2": { en: "medium", th: "กลาง" },
  "lvl.3": { en: "strong", th: "เข้ม" },

  // cart
  "cart.title": { en: "Your cart", th: "ตะกร้าของคุณ" },
  "cart.empty": { en: "Nothing composed yet.", th: "ยังไม่มีสูตรในตะกร้า" },
  "cart.plan": { en: "Delivery", th: "การจัดส่ง" },
  "cart.once": { en: "One time", th: "ครั้งเดียว" },
  "cart.2m": { en: "Refill every 2 months · −10%", th: "ส่งทุก 2 เดือน · ลด 10%" },
  "cart.3m": { en: "Refill every 3 months · −10%", th: "ส่งทุก 3 เดือน · ลด 10%" },
  "cart.return": { en: "I'll return my empty tube (−฿20)", th: "ส่งหลอดเปล่าคืน (ลด ฿20)" },
  "cart.subtotal": { en: "Subtotal", th: "ยอดรวม" },
  "cart.shipping": { en: "Shipping", th: "ค่าจัดส่ง" },
  "cart.free": { en: "Free", th: "ฟรี" },
  "cart.total": { en: "Total", th: "รวมทั้งสิ้น" },
  "cart.name": { en: "Full name", th: "ชื่อ-นามสกุล" },
  "cart.email": { en: "Email", th: "อีเมล" },
  "cart.phone": { en: "Phone", th: "เบอร์โทร" },
  "cart.checkout": { en: "Pay with Stripe", th: "ชำระเงินด้วย Stripe" },
  "cart.demoPay": { en: "Simulate payment (demo)", th: "จำลองการชำระเงิน (เดโม)" },
  "cart.remove": { en: "Remove", th: "ลบ" },
  "cart.edit": { en: "Edit", th: "แก้ไข" },
  "cart.freeFrom": { en: "Free shipping from ฿800", th: "ส่งฟรีเมื่อซื้อครบ ฿800" },

  // tracking
  "track.title": { en: "Track your order", th: "ติดตามออเดอร์" },
  "track.orderNo": { en: "Order number", th: "เลขที่ออเดอร์" },
  "track.find": { en: "Find order", th: "ค้นหา" },
  "track.notFound": { en: "No order matches that number and email.", th: "ไม่พบออเดอร์ที่ตรงกับเลขและอีเมลนี้" },
  "track.tracking": { en: "Tracking number", th: "เลขพัสดุ" },
  "status.pending_payment": { en: "Awaiting payment", th: "รอชำระเงิน" },
  "status.paid": { en: "Paid", th: "ชำระเงินแล้ว" },
  "status.mixing": { en: "Compounding", th: "กำลังผสม" },
  "status.packing": { en: "Packing", th: "กำลังแพ็ค" },
  "status.shipped": { en: "Shipped", th: "จัดส่งแล้ว" },
  "status.delivered": { en: "Delivered", th: "ได้รับแล้ว" },
  "status.cancelled": { en: "Cancelled", th: "ยกเลิก" },

  // success
  "ok.title": { en: "Thank you. Your formula is in the queue.", th: "ขอบคุณ สูตรของคุณเข้าคิวผสมแล้ว" },
  "ok.body": { en: "We'll email you when it ships. Keep your order number:", th: "เราจะแจ้งทางอีเมลเมื่อจัดส่ง เก็บเลขออเดอร์นี้ไว้:" },
  "ok.track": { en: "Track this order", th: "ติดตามออเดอร์นี้" },
  "ok.checking": { en: "Confirming payment…", th: "กำลังยืนยันการชำระเงิน…" },

  // chat
  "chat.title": { en: "Customa care", th: "ฝ่ายดูแลลูกค้า Customa" },
  "chat.hello": { en: "Hi! Ask us anything about herbs, your order or packaging.", th: "สวัสดีค่ะ สอบถามเรื่องสมุนไพร ออเดอร์ หรือบรรจุภัณฑ์ได้เลย" },
  "chat.start": { en: "Start chat", th: "เริ่มแชท" },
  "chat.placeholder": { en: "Type a message…", th: "พิมพ์ข้อความ…" },
  "chat.orderOpt": { en: "Order number (optional)", th: "เลขออเดอร์ (ถ้ามี)" },
  "chat.send": { en: "Send", th: "ส่ง" },
  "nav.account": { en: "Account", th: "บัญชี" },
  "acct.title": { en: "Your account", th: "บัญชีของฉัน" },
  "acct.intro": {
    en: "Sign in with Google to keep your orders, refills and formulas in one place.",
    th: "เข้าสู่ระบบด้วย Google เพื่อดูออเดอร์ การส่งซ้ำ และสูตรที่บันทึกไว้ได้ในที่เดียว",
  },
  "acct.google": { en: "Continue with Google", th: "เข้าสู่ระบบด้วย Google" },
  "acct.noSupabase": {
    en: "Accounts need Supabase — add the keys in .env.local to turn them on.",
    th: "ระบบบัญชีต้องเชื่อม Supabase ก่อน — ใส่ keys ใน .env.local เพื่อเปิดใช้",
  },
  "acct.perks1": { en: "Every order and its status, without typing order numbers", th: "ดูทุกออเดอร์และสถานะได้ทันที ไม่ต้องกรอกเลขออเดอร์" },
  "acct.perks2": { en: "Pause or stop refills yourself", th: "หยุดหรือเปิดการส่งซ้ำได้เอง" },
  "acct.perks3": { en: "Keep formulas to reorder later", th: "เก็บสูตรไว้สั่งซ้ำภายหลัง" },
  "acct.perks4": { en: "Your support chat follows you to any device", th: "แชทกับทีมงานต่อได้จากทุกอุปกรณ์" },
  "acct.guestTrack": { en: "Ordered as a guest? Track with your order number", th: "สั่งแบบไม่มีบัญชี? ติดตามด้วยเลขออเดอร์" },
  "acct.signOut": { en: "Sign out", th: "ออกจากระบบ" },
  "acct.staff": { en: "Staff console", th: "หลังร้าน" },
  "acct.tab.orders": { en: "Orders", th: "ออเดอร์" },
  "acct.tab.refills": { en: "Refills", th: "การส่งซ้ำ" },
  "acct.tab.formulas": { en: "Saved formulas", th: "สูตรที่บันทึก" },
  "acct.tab.help": { en: "Help", th: "ช่วยเหลือ" },
  "acct.noOrders": { en: "No orders yet.", th: "ยังไม่มีออเดอร์" },
  "acct.emailNote": {
    en: "Orders placed with this email before you signed in show up here too.",
    th: "ออเดอร์ที่เคยสั่งด้วยอีเมลนี้ก่อนเข้าสู่ระบบ จะแสดงที่นี่ด้วย",
  },
  "acct.refill": { en: "Refill", th: "รอบส่งซ้ำ" },
  "acct.noRefills": { en: "No refill subscriptions.", th: "ยังไม่มีการสมัครส่งซ้ำ" },
  "acct.every": { en: "Every {n} months", th: "ทุก {n} เดือน" },
  "acct.next": { en: "Next refill", th: "รอบถัดไป" },
  "acct.endsOn": { en: "Stops after", th: "จะหยุดหลังวันที่" },
  "acct.delivered": { en: "Refills so far", th: "ส่งซ้ำไปแล้ว" },
  "acct.stop": { en: "Stop refills", th: "หยุดการส่งซ้ำ" },
  "acct.resume": { en: "Keep refills", th: "ส่งซ้ำต่อ" },
  "acct.stopConfirm": {
    en: "Stop refills? You keep the current period; nothing more is charged after it.",
    th: "หยุดการส่งซ้ำ? รอบปัจจุบันยังได้รับตามปกติ และจะไม่ตัดเงินรอบถัดไป",
  },
  "acct.ended": { en: "Ended", th: "สิ้นสุดแล้ว" },
  "acct.active": { en: "Active", th: "กำลังส่งซ้ำ" },
  "acct.stopping": { en: "Stopping", th: "กำลังจะหยุด" },
  "acct.noFormulas": { en: "No saved formulas yet — save one from the composer.", th: "ยังไม่มีสูตรที่บันทึก — กดบันทึกได้จากหน้าปรุงสูตร" },
  "acct.open": { en: "Open in composer", th: "เปิดในหน้าปรุงสูตร" },
  "acct.delete": { en: "Delete", th: "ลบ" },
  "acct.deleteConfirm": { en: "Tap again to delete", th: "กดอีกครั้งเพื่อลบ" },
  "acct.helpChat": { en: "Chat with the lab", th: "แชทกับทีมงาน" },
  "acct.helpChatNote": {
    en: "Signed in, your conversation is kept with your account.",
    th: "เมื่อเข้าสู่ระบบ บทสนทนาจะถูกเก็บไว้กับบัญชีของคุณ",
  },
  "acct.loadError": { en: "Couldn't load — try again.", th: "โหลดไม่สำเร็จ ลองใหม่อีกครั้ง" },
  "c.save": { en: "Save", th: "บันทึกสูตร" },
  "c.saved": { en: "Saved to account", th: "บันทึกในบัญชีแล้ว" },
  "c.signInToSave": { en: "Sign in to save", th: "เข้าสู่ระบบเพื่อบันทึก" },
  "cart.signedInAs": { en: "Signed in as {email} — this order will appear in your account.", th: "เข้าสู่ระบบเป็น {email} — ออเดอร์นี้จะอยู่ในบัญชีของคุณ" },
  "cart.signInHint": { en: "Sign in with Google to follow this order in your account", th: "เข้าสู่ระบบด้วย Google เพื่อติดตามออเดอร์นี้ในบัญชี" },

  // quiz
  "quiz.title": { en: "Find my formula", th: "หาสูตรที่ใช่" },
  "quiz.result": { en: "Your starting formula", th: "สูตรเริ่มต้นของคุณ" },
  "quiz.open": { en: "Open in composer", th: "เปิดในหน้าปรุงสูตร" },
  "quiz.again": { en: "Start over", th: "เริ่มใหม่" },

  // shared formula
  "f.shared": { en: "A formula shared with you", th: "สูตรที่มีคนแชร์ให้คุณ" },
  "f.use": { en: "Use this formula", th: "ใช้สูตรนี้" },

  "common.loading": { en: "Loading…", th: "กำลังโหลด…" },
  "common.demo": { en: "Demo store — no real products are shipped.", th: "ร้านเดโม — ไม่มีการจัดส่งสินค้าจริง" },
} satisfies Record<string, L10n>;

export type DictKey = keyof typeof dict;
export type Lang = "en" | "th";

export function translate(lang: Lang, key: DictKey): string {
  return dict[key]?.[lang] ?? dict[key]?.en ?? key;
}

export function useT() {
  const lang = useLang((s) => s.lang);
  const t = (key: DictKey) => translate(lang, key);
  const l = (v: L10n) => v[lang] ?? v.en;
  return { t, l, lang };
}
