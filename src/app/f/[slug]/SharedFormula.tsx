"use client";

import { useRouter } from "next/navigation";
import { BASES, BOOSTERS, HERBS, byId } from "@/lib/catalog";
import { fmtTHB, formulaNo, unitPrice, type Formula } from "@/lib/formula";
import { useT, type DictKey } from "@/lib/i18n";
import { useCart, useComposer } from "@/lib/store";
import { LabelCard, ProfileRadar } from "@/components/ui";

export default function SharedFormula({ formula }: { formula: Formula }) {
  const { t, l } = useT();
  const router = useRouter();
  const load = useComposer((s) => s.load);
  const add = useCart((s) => s.add);
  // The recipe is shared; the personal words are not.
  const clean: Formula = { ...formula, tubeText: { forName: "", note: "" }, boxText: { title: "", message: "" } };

  return (
    <div className="pt-28 pb-24 mx-auto w-full max-w-6xl px-5 grid md:grid-cols-2 gap-14 items-start">
      <div>
        <p className="field-label">{t("f.shared")}</p>
        <p className="label-text text-[12px] mt-6 opacity-60">N°{formulaNo(clean)}</p>
        <h1 className="display text-6xl md:text-8xl leading-[0.9] mt-2">{clean.name}</h1>
        <ul className="mt-10 border-t border-line">
          <li className="border-b border-line py-3 flex justify-between label-text text-[13px]">
            <span>{byId(BASES, clean.base)?.name.en}</span>
            <span className="opacity-60">{t("c.base")}</span>
          </li>
          {clean.herbs.map((h) => {
            const herb = byId(HERBS, h.id)!;
            return (
              <li key={h.id} className="border-b border-line py-3 flex justify-between gap-4">
                <span>
                  <span className="label-text text-[13px] uppercase tracking-[0.08em]">{herb.name.en}</span>
                  <span className="block text-[12.5px] opacity-65">{l(herb.benefit)}</span>
                </span>
                <span className="label-text text-[12px] opacity-70 shrink-0">{t(`lvl.${h.level}` as DictKey)}</span>
              </li>
            );
          })}
          {clean.boosters.map((b) => (
            <li key={b} className="border-b border-line py-3 label-text text-[13px] opacity-80">+ {byId(BOOSTERS, b)?.name.en}</li>
          ))}
        </ul>
        <p className="display text-4xl mt-8">{fmtTHB(unitPrice(clean))}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="btn-primary"
            onClick={() => {
              add(structuredClone(clean));
              router.push("/cart");
            }}
          >
            {t("c.add")}
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              load(structuredClone(clean), null);
              router.push("/compose");
            }}
          >
            {t("f.use")} →
          </button>
        </div>
      </div>
      <div className="space-y-8">
        <LabelCard f={clean} />
        <div className="max-w-xs mx-auto"><ProfileRadar f={clean} /></div>
      </div>
    </div>
  );
}
