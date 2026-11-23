// Server-only helpers: Stripe client, admin session cookie, realtime broadcast.

import Stripe from "stripe";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { hasSupabase, supa } from "./db";

/* Stripe ------------------------------------------------------------ */

let stripeClient: Stripe | null = null;
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

/** Demo payment simulation is allowed only when Stripe is not configured
 *  and we are not running a production build. */
export const demoPaymentsAllowed = () => !process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "production";

export function siteUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
}

/* Admin auth -------------------------------------------------------- */

const COOKIE = "customa_admin";

function adminPassword(): string | null {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  // convenience default for local demos only
  return process.env.NODE_ENV === "production" ? null : "customa";
}

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? adminPassword() ?? "unset";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkAdminPassword(input: string) {
  const pw = adminPassword();
  return !!pw && safeEqual(sign(input), sign(pw));
}

export async function setAdminSession() {
  const exp = Date.now() + 1000 * 60 * 60 * 12;
  const value = `${exp}.${sign(`admin.${exp}`)}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(`admin.${exp}`));
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

/* Realtime ---------------------------------------------------------- */

/** Channel a customer listens on — contains their secret thread token. */
export const threadChannel = (threadId: string, token: string) => `chat-${threadId}-${token}`;

/** Admin inbox channel — name derived from the server secret, handed out only to admins. */
export const adminChannel = () => `admin-${sign("inbox").slice(0, 24)}`;

export async function broadcast(channel: string, event: string, payload: unknown) {
  if (!hasSupabase()) return; // local mode: clients poll instead
  try {
    const ch = supa().channel(channel);
    await ch.httpSend(event, payload);
    await supa().removeChannel(ch);
  } catch (e) {
    console.warn("[realtime] broadcast failed", e);
  }
}

/* Customer accounts ------------------------------------------------- */

export type AuthUser = { id: string; email: string; name: string; avatar: string | null };

/**
 * The signed-in customer, from the Supabase access token the browser sends as
 * `Authorization: Bearer …`. The token is verified with Supabase Auth on every
 * call; nothing from the browser is trusted on its own.
 */
export async function getUser(req: Request): Promise<AuthUser | null> {
  if (!hasSupabase()) return null;
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await supa().auth.getUser(token);
  if (error || !data.user) return null;
  const u = data.user;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: u.id,
    email: u.email ?? "",
    name: String(meta.full_name ?? meta.name ?? u.email ?? ""),
    avatar: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  };
}

export const signInRequired = () => Response.json({ error: "Sign in required" }, { status: 401 });

/* Validation -------------------------------------------------------- */

export const isEmail = (s: unknown): s is string =>
  typeof s === "string" && s.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
