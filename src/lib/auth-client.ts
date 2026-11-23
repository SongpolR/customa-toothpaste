"use client";

// Customer sign-in (Google, via Supabase Auth) for client components.

import type { User } from "@supabase/supabase-js";
import { browserSupabase } from "./supabase-browser";
import type { AccountUser } from "./store";

/** Accounts need Supabase; in local demo mode the sign-in button explains that. */
export const accountsEnabled = () => !!browserSupabase();

export function toAccountUser(u: User | null | undefined): AccountUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: u.id,
    email: u.email ?? "",
    name: String(meta.full_name ?? meta.name ?? u.email ?? ""),
    avatar: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  };
}

/** Sends the browser to Google; Supabase brings it back to `returnTo` signed in. */
export async function signInWithGoogle(returnTo = "/account") {
  const sb = browserSupabase();
  if (!sb) return;
  await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}${returnTo}`, queryParams: { prompt: "select_account" } },
  });
}

export async function signOut() {
  await browserSupabase()?.auth.signOut();
  // staff: leaving the account also closes the lab console session
  await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
}

/** fetch() with the customer's access token, for /api/account/* and friends. */
export async function authFetch(input: string, init: RequestInit = {}) {
  const sb = browserSupabase();
  const token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
