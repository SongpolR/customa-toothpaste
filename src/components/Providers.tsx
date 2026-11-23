"use client";

import { useEffect } from "react";
import { rehydrateStores, useAuth, useLang } from "@/lib/store";
import { browserSupabase } from "@/lib/supabase-browser";
import { toAccountUser } from "@/lib/auth-client";

export default function Providers({ children }: { children: React.ReactNode }) {
  const lang = useLang((s) => s.lang);
  const setUser = useAuth((s) => s.set);
  useEffect(() => {
    rehydrateStores();
  }, []);
  // customer session: restored from storage, finished after the Google redirect, kept fresh
  useEffect(() => {
    const sb = browserSupabase();
    if (!sb) {
      setUser(null);
      return;
    }
    sb.auth.getSession().then(({ data }) => setUser(toAccountUser(data.session?.user)));
    const { data } = sb.auth.onAuthStateChange((_event, session) => setUser(toAccountUser(session?.user)));
    return () => data.subscription.unsubscribe();
  }, [setUser]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <>{children}</>;
}
