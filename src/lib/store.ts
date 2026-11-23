"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { MAX_HERBS } from "./catalog";
import { defaultFormula, type CartLine, type Formula, type Level, type Plan } from "./formula";

/* Language ---------------------------------------------------------- */

type LangState = { lang: "en" | "th"; setLang: (l: "en" | "th") => void };

export const useLang = create<LangState>()(
  persist((set) => ({ lang: "th", setLang: (lang) => set({ lang }) }), {
    name: "customa-lang",
    skipHydration: true,
  }),
);

/* Composer draft ---------------------------------------------------- */

type ComposerState = {
  formula: Formula;
  editingLineId: string | null;
  set: (patch: Partial<Formula>) => void;
  setTubeText: (patch: Partial<Formula["tubeText"]>) => void;
  setBoxText: (patch: Partial<Formula["boxText"]>) => void;
  /** tap cycle: off → 1 → 2 → 3 → off */
  cycleHerb: (id: string) => void;
  setHerbLevel: (id: string, level: Level | 0) => void;
  toggleBooster: (id: string) => void;
  load: (f: Formula, editingLineId?: string | null) => void;
  reset: () => void;
};

export const useComposer = create<ComposerState>()(
  persist(
    (set, get) => ({
      formula: defaultFormula(),
      editingLineId: null,
      set: (patch) => set({ formula: { ...get().formula, ...patch } }),
      setTubeText: (patch) =>
        set({ formula: { ...get().formula, tubeText: { ...get().formula.tubeText, ...patch } } }),
      setBoxText: (patch) =>
        set({ formula: { ...get().formula, boxText: { ...get().formula.boxText, ...patch } } }),
      cycleHerb: (id) => {
        const cur = get().formula.herbs.find((h) => h.id === id);
        const next = cur ? (cur.level === 3 ? 0 : ((cur.level + 1) as Level)) : 1;
        get().setHerbLevel(id, next);
      },
      setHerbLevel: (id, level) => {
        const herbs = get().formula.herbs.filter((h) => h.id !== id);
        const idx = get().formula.herbs.findIndex((h) => h.id === id);
        if (level > 0) {
          if (idx === -1 && herbs.length >= MAX_HERBS) return;
          const pick = { id, level: level as Level };
          if (idx === -1) herbs.push(pick);
          else herbs.splice(idx, 0, pick);
        }
        set({ formula: { ...get().formula, herbs } });
      },
      toggleBooster: (id) => {
        const b = get().formula.boosters;
        let next = b.includes(id) ? b.filter((x) => x !== id) : [...b, id];
        // fluoride and nano-hydroxyapatite are alternatives
        if (id === "fluoride" && next.includes("fluoride")) next = next.filter((x) => x !== "nha");
        if (id === "nha" && next.includes("nha")) next = next.filter((x) => x !== "fluoride");
        set({ formula: { ...get().formula, boosters: next } });
      },
      load: (formula, editingLineId = null) => set({ formula, editingLineId }),
      reset: () => set({ formula: defaultFormula(), editingLineId: null }),
    }),
    { name: "customa-composer", skipHydration: true },
  ),
);

/* Cart -------------------------------------------------------------- */

type CartState = {
  lines: CartLine[];
  add: (formula: Formula) => string;
  replace: (id: string, formula: Formula) => void;
  update: (id: string, patch: Partial<Pick<CartLine, "qty" | "plan" | "returnTube">>) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (formula) => {
        const id = nanoid(8);
        const line: CartLine = { id, formula, qty: 1, plan: "once" as Plan, returnTube: false };
        set({ lines: [...get().lines, line] });
        return id;
      },
      replace: (id, formula) =>
        set({ lines: get().lines.map((l) => (l.id === id ? { ...l, formula } : l)) }),
      update: (id, patch) =>
        set({
          lines: get().lines.map((l) =>
            l.id === id
              ? {
                  ...l,
                  ...patch,
                  qty: Math.min(20, Math.max(1, patch.qty ?? l.qty)),
                  returnTube: (patch.plan ?? l.plan) === "once" ? false : (patch.returnTube ?? l.returnTube),
                }
              : l,
          ),
        }),
      remove: (id) => set({ lines: get().lines.filter((l) => l.id !== id) }),
      clear: () => set({ lines: [] }),
    }),
    { name: "customa-cart", skipHydration: true },
  ),
);

export function rehydrateStores() {
  useLang.persist.rehydrate();
  useComposer.persist.rehydrate();
  useCart.persist.rehydrate();
}

/* Support chat ------------------------------------------------------ */

type ChatUIState = {
  open: boolean;
  /** staff replies that arrived while the panel was closed */
  unread: number;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  addUnread: (n: number) => void;
};

/** Shared so the header's chat button can open the panel rendered by ChatWidget. */
export const useChatUI = create<ChatUIState>()((set) => ({
  open: false,
  unread: 0,
  setOpen: (open) => set(open ? { open, unread: 0 } : { open }),
  toggle: () => set((s) => (s.open ? { open: false } : { open: true, unread: 0 })),
  addUnread: (n) => set((s) => ({ unread: s.unread + n })),
}));

/* Customer account -------------------------------------------------- */

export type AccountUser = { id: string; email: string; name: string; avatar: string | null };

type AuthState = {
  user: AccountUser | null;
  /** false until the stored session has been checked (avoid flashing "signed out") */
  ready: boolean;
  set: (user: AccountUser | null) => void;
};

/** Filled from Supabase Auth in Providers. */
export const useAuth = create<AuthState>()((set) => ({
  user: null,
  ready: false,
  set: (user) => set({ user, ready: true }),
}));
