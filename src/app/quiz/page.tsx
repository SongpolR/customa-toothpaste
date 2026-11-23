"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_HERBS, type L10n } from "@/lib/catalog";
import { defaultFormula, fmtTHB, suggestName, unitPrice, type Formula, type HerbPick, type Level } from "@/lib/formula";
import { useT } from "@/lib/i18n";
import { useComposer } from "@/lib/store";
import { LabelCard, ProfileRadar } from "@/components/ui";

type Option = { id: string; label: L10n };
type Question = { id: string; q: L10n; options: Option[] };

const QUESTIONS: Question[] = [
  {
    id: "concern",
    q: { en: "What matters most for your mouth?", th: "เรื่องไหนสำคัญที่สุดสำหรับช่องปากคุณ?" },
    options: [
      { id: "breath", label: { en: "Fresh breath", th: "ลมหายใจสดชื่น" } },
      { id: "gums", label: { en: "Gums that bleed easily", th: "เหงือกเลือดออกง่าย" } },
      { id: "sensitive", label: { en: "Sensitive teeth", th: "ฟันเสียวง่าย" } },
      { id: "white", label: { en: "Whiter teeth", th: "ฟันขาวขึ้น" } },
      { id: "ache", label: { en: "Occasional toothache", th: "ปวดฟันเป็นบางครั้ง" } },
    ],
  },
  {
    id: "taste",
    q: { en: "Which taste feels like you?", th: "รสชาติแบบไหนที่เป็นคุณ?" },
    options: [
      { id: "cool", label: { en: "Icy cool mint", th: "มินต์เย็นซ่า" } },
      { id: "warm", label: { en: "Warm spice", th: "เครื่องเทศอุ่นๆ" } },
      { id: "herbal", label: { en: "Deep herbal", th: "สมุนไพรเข้มข้น" } },
      { id: "sweet", label: { en: "Mild & sweet", th: "อ่อนๆ หวานนิดๆ" } },
      { id: "salty", label: { en: "Salty Thai classic", th: "เค็มแบบไทยดั้งเดิม" } },
    ],
  },
  {
    id: "fluoride",
    q: { en: "Fluoride?", th: "ฟลูออไรด์?" },
    options: [
      { id: "yes", label: { en: "Yes, classic protection", th: "ใช่ ป้องกันฟันผุแบบมาตรฐาน" } },
      { id: "no", label: { en: "Fluoride-free please", th: "ไม่เอาฟลูออไรด์" } },
      { id: "any", label: { en: "No preference", th: "ไม่ซีเรียส" } },
    ],
  },
  {
    id: "strength",
    q: { en: "How strong should it taste?", th: "อยากให้รสเข้มแค่ไหน?" },
    options: [
      { id: "1", label: { en: "Gentle", th: "อ่อนโยน" } },
      { id: "2", label: { en: "Balanced", th: "กลางๆ" } },
      { id: "3", label: { en: "Bold", th: "เข้มจัด" } },
    ],
  },
  {
    id: "pack",
    q: { en: "And the packaging?", th: "แล้วบรรจุภัณฑ์ล่ะ?" },
    options: [
      { id: "kraft", label: { en: "Natural kraft, minimal", th: "คราฟท์ธรรมชาติ มินิมอล" } },
      { id: "gift", label: { en: "Gift-ready", th: "พร้อมเป็นของขวัญ" } },
      { id: "black", label: { en: "Ink black, bold", th: "ดำเข้ม ดูเท่" } },
      { id: "seed", label: { en: "Plant the box afterwards", th: "นำกล่องไปปลูกต่อได้" } },
    ],
  },
];

function recommend(a: Record<string, string>): Formula {
  const f = defaultFormula();
  const lvl = Number(a.strength ?? 2) as Level;
  const herbs: HerbPick[] = [];
  const add = (id: string, level: number) => {
    if (herbs.length < MAX_HERBS && !herbs.some((h) => h.id === id))
      herbs.push({ id, level: Math.min(3, Math.max(1, level)) as Level });
  };

  switch (a.concern) {
    case "breath": add("greentea", lvl); add("lemongrass", lvl - 1); break;
    case "gums": add("turmeric", lvl); add("guava", lvl); add("mangosteen", 1); break;
    case "sensitive": f.base = "silica"; add("licorice", 1); add("guava", 1); break;
    case "white": f.base = "soda"; add("salt", lvl); break;
    case "ache": add("clove", lvl); add("neem", lvl - 1); break;
  }
  switch (a.taste) {
    case "cool": add("mint", lvl + 1); break;
    case "warm": add("cinnamon", lvl); add("ginger", lvl - 1); break;
    case "herbal": add("neem", lvl); add("turmeric", 1); break;
    case "sweet": add("licorice", 2); add("mint", 1); break;
    case "salty": add("salt", 3); add("mint", 1); break;
  }
  if (a.concern === "white" && a.taste === "herbal") f.base = "charcoal";
  f.herbs = herbs;
  f.boosters = ["xylitol", ...(a.fluoride === "yes" ? ["fluoride"] : a.fluoride === "no" ? ["nha"] : [])];
  if (a.pack === "gift") Object.assign(f, { boxShape: "sleeve", boxPaper: "washi", tubePaper: "unbleached" });
  if (a.pack === "black") Object.assign(f, { boxShape: "tuck", boxPaper: "ink", tubePaper: "ink", cap: "bamboo" });
  if (a.pack === "seed") Object.assign(f, { boxShape: "tuck", boxPaper: "seed", tubePaper: "kraft", cap: "paper" });
  if (a.pack === "kraft") Object.assign(f, { boxShape: "cylinder", boxPaper: "kraft", tubePaper: "kraft" });
  f.name = suggestName(f);
  return f;
}

export default function QuizPage() {
  const { t, l } = useT();
  const router = useRouter();
  const load = useComposer((s) => s.load);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const done = i >= QUESTIONS.length;
  const result = useMemo(() => (done ? recommend(answers) : null), [done, answers]);

  return (
    <div className="pt-28 pb-24 mx-auto w-full max-w-5xl px-5 flex-1">
      <p className="label-text text-[11px] tracking-[0.3em] uppercase opacity-60">
        {t("quiz.title")} · {Math.min(i + 1, QUESTIONS.length)}/{QUESTIONS.length}
      </p>
      <div className="mt-4 h-px bg-line">
        <div className="h-px bg-ink transition-all duration-500" style={{ width: `${(Math.min(i, QUESTIONS.length) / QUESTIONS.length) * 100}%` }} />
      </div>

      {!done && (
        <div key={i} className="mt-14 animate-[fadein_.5s_ease]">
          <h1 className="display text-4xl md:text-6xl leading-tight">{l(QUESTIONS[i].q)}</h1>
          <div className="mt-10 grid sm:grid-cols-2 gap-3">
            {QUESTIONS[i].options.map((o, n) => (
              <button
                key={o.id}
                className="chip text-left p-5 flex gap-4 items-baseline"
                data-active={answers[QUESTIONS[i].id] === o.id}
                onClick={() => {
                  setAnswers((a) => ({ ...a, [QUESTIONS[i].id]: o.id }));
                  setTimeout(() => setI((x) => x + 1), 180);
                }}
              >
                <span className="label-text text-[11px] opacity-50">{String.fromCharCode(65 + n)}</span>
                <span className="text-lg">{l(o.label)}</span>
              </button>
            ))}
          </div>
          {i > 0 && (
            <button className="mt-8 label-text text-[11px] tracking-[0.18em] uppercase opacity-60 hover:opacity-100" onClick={() => setI(i - 1)}>
              ← {t("c.back")}
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="mt-14 grid md:grid-cols-[1fr_1fr] gap-12 items-start">
          <div>
            <p className="field-label">{t("quiz.result")}</p>
            <h1 className="display text-5xl md:text-7xl mt-3 leading-none">{result.name}</h1>
            <p className="mt-5 label-text text-[13px] opacity-75">{fmtTHB(unitPrice(result))} / 100 g</p>
            <div className="mt-8 w-64"><ProfileRadar f={result} /></div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="btn-primary"
                onClick={() => {
                  load(result, null);
                  router.push("/compose");
                }}
              >
                {t("quiz.open")} →
              </button>
              <button className="btn-ghost" onClick={() => { setAnswers({}); setI(0); }}>{t("quiz.again")}</button>
            </div>
          </div>
          <LabelCard f={result} />
        </div>
      )}
    </div>
  );
}
