"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser client used ONLY for Realtime Broadcast (no table access — RLS
// blocks the anon key everywhere). Returns null in local/demo mode.

let client: SupabaseClient | null | undefined;

export function browserSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

/** Subscribe to broadcast events on a channel. Returns an unsubscribe fn. */
export function listen(channel: string, event: string, cb: (payload: unknown) => void): () => void {
  const sb = browserSupabase();
  if (!sb) return () => {};
  const ch = sb
    .channel(channel)
    .on("broadcast", { event }, (msg) => cb(msg.payload))
    .subscribe();
  return () => {
    sb.removeChannel(ch);
  };
}
