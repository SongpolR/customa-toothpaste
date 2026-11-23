"use client";

import { useEffect } from "react";
import { rehydrateStores, useLang } from "@/lib/store";

export default function Providers({ children }: { children: React.ReactNode }) {
  const lang = useLang((s) => s.lang);
  useEffect(() => {
    rehydrateStores();
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <>{children}</>;
}
