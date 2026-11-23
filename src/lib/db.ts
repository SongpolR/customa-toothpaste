// Data layer. Uses Supabase (service role) when SUPABASE env vars are set,
// otherwise a local JSON file at .data/db.json so the demo runs with zero setup.
// Server-only: import from route handlers, never from client components.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";
import { randomUUID, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CartLine, Formula, Plan } from "./formula";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "mixing"
  | "packing"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ORDER_FLOW: OrderStatus[] = ["paid", "mixing", "packing", "shipped", "delivered"];
export const ALL_STATUSES: OrderStatus[] = ["pending_payment", ...ORDER_FLOW, "cancelled"];

export type OrderItem = {
  formula: Formula;
  qty: number;
  plan: Plan;
  returnTube: boolean;
  unit: number; // THB after discounts
};

export type Order = {
  id: string;
  order_no: string;
  email: string;
  customer_name: string;
  phone: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  mode: "payment" | "subscription";
  status: OrderStatus;
  tracking_no: string | null;
  shipping_address: Record<string, unknown> | null;
  stripe_session_id: string | null;
  stripe_subscription_id: string | null;
  parent_order_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderEvent = { id: number; order_id: string; status: string; note: string | null; created_at: string };

export type ChatThread = {
  id: string;
  token: string;
  name: string;
  email: string;
  order_no: string | null;
  status: "open" | "closed";
  unread_admin: number;
  last_message: string | null;
  last_message_at: string;
  created_at: string;
};

export type ChatMessage = {
  id: number;
  thread_id: string;
  sender: "customer" | "admin" | "system";
  body: string;
  created_at: string;
};

const orderNo = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 5);
const slugId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 6);
const now = () => new Date().toISOString();

export const hasSupabase = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

let sb: SupabaseClient | null = null;
export function supa(): SupabaseClient {
  if (!sb) {
    sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return sb;
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ------------------------------------------------------------------ */
/* Local JSON store                                                    */
/* ------------------------------------------------------------------ */

type LocalDB = {
  formulas: { slug: string; config: Formula; created_at: string }[];
  orders: Order[];
  order_events: OrderEvent[];
  chat_threads: ChatThread[];
  chat_messages: ChatMessage[];
  seq: number;
};

const FILE = path.join(process.cwd(), ".data", "db.json");
const g = globalThis as unknown as { __customaDB?: LocalDB };

function local(): LocalDB {
  if (!g.__customaDB) {
    try {
      g.__customaDB = JSON.parse(fs.readFileSync(FILE, "utf8"));
    } catch {
      g.__customaDB = { formulas: [], orders: [], order_events: [], chat_threads: [], chat_messages: [], seq: 1 };
    }
  }
  return g.__customaDB!;
}
/** local reads hand out copies, like a real database would */
const clone = <T>(x: T | undefined): T | null => (x === undefined ? null : structuredClone(x));

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(local(), null, 2));
}

/* ------------------------------------------------------------------ */
/* Formulas                                                            */
/* ------------------------------------------------------------------ */

export async function saveFormula(config: Formula): Promise<string> {
  const slug = slugId();
  if (hasSupabase()) {
    must(await supa().from("formulas").insert({ slug, config }));
  } else {
    local().formulas.push({ slug, config, created_at: now() });
    save();
  }
  return slug;
}

export async function getFormula(slug: string): Promise<Formula | null> {
  if (hasSupabase()) {
    const row = must(await supa().from("formulas").select("config").eq("slug", slug).maybeSingle());
    return (row as { config: Formula } | null)?.config ?? null;
  }
  return local().formulas.find((f) => f.slug === slug)?.config ?? null;
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export type NewOrder = Pick<
  Order,
  "email" | "customer_name" | "phone" | "items" | "subtotal" | "shipping" | "total" | "mode"
> & {
  parent_order_id?: string | null;
  stripe_subscription_id?: string | null;
  /** the Stripe object that paid this order: a Checkout Session, or the invoice for a refill */
  stripe_session_id?: string | null;
  status?: OrderStatus;
};

export async function createOrder(o: NewOrder): Promise<Order> {
  const row = {
    order_no: "CU-" + orderNo(),
    currency: "thb",
    status: o.status ?? ("pending_payment" as OrderStatus),
    tracking_no: null,
    shipping_address: null,
    stripe_session_id: o.stripe_session_id ?? null,
    stripe_subscription_id: o.stripe_subscription_id ?? null,
    parent_order_id: o.parent_order_id ?? null,
    email: o.email,
    customer_name: o.customer_name,
    phone: o.phone,
    items: o.items,
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    mode: o.mode,
  };
  let order: Order;
  if (hasSupabase()) {
    order = must(await supa().from("orders").insert(row).select().single()) as Order;
  } else {
    order = { ...row, id: randomUUID(), created_at: now(), updated_at: now() };
    local().orders.push(order);
    save();
  }
  await addEvent(order.id, order.status, order.status === "pending_payment" ? "Order created" : "Refill created");
  return order;
}

export async function getOrder(id: string): Promise<Order | null> {
  if (hasSupabase()) return must(await supa().from("orders").select().eq("id", id).maybeSingle()) as Order | null;
  return clone(local().orders.find((o) => o.id === id));
}

export async function findOrder(order_no: string, email: string): Promise<Order | null> {
  const no = order_no.trim().toUpperCase();
  const em = email.trim().toLowerCase();
  if (hasSupabase()) {
    const o = must(await supa().from("orders").select().eq("order_no", no).maybeSingle()) as Order | null;
    return o && o.email.toLowerCase() === em ? o : null;
  }
  return clone(local().orders.find((o) => o.order_no === no && o.email.toLowerCase() === em));
}

/** Order paid by a given Stripe object (Checkout Session id, or invoice id for refills). */
export async function findOrderByStripeRef(ref: string): Promise<Order | null> {
  if (hasSupabase()) return must(await supa().from("orders").select().eq("stripe_session_id", ref).maybeSingle()) as Order | null;
  return clone(local().orders.find((o) => o.stripe_session_id === ref));
}

export async function findOrderBySubscription(subId: string): Promise<Order | null> {
  if (hasSupabase()) {
    const rows = must(
      await supa().from("orders").select().eq("stripe_subscription_id", subId).is("parent_order_id", null).limit(1),
    ) as Order[];
    return rows[0] ?? null;
  }
  return local().orders.find((o) => o.stripe_subscription_id === subId && !o.parent_order_id) ?? null;
}

export async function listOrders(filter: { status?: string; q?: string } = {}): Promise<Order[]> {
  if (hasSupabase()) {
    let q = supa().from("orders").select().order("created_at", { ascending: false }).limit(200);
    if (filter.status) q = q.eq("status", filter.status);
    if (filter.q) {
      const term = filter.q.replace(/[%,()]/g, "");
      q = q.or(`order_no.ilike.%${term}%,email.ilike.%${term}%,customer_name.ilike.%${term}%`);
    }
    return must(await q) as Order[];
  }
  const term = filter.q?.toLowerCase();
  return [...local().orders]
    .filter((o) => !filter.status || o.status === filter.status)
    .filter(
      (o) =>
        !term ||
        o.order_no.toLowerCase().includes(term) ||
        o.email.toLowerCase().includes(term) ||
        o.customer_name.toLowerCase().includes(term),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order> {
  if (hasSupabase()) return must(await supa().from("orders").update(patch).eq("id", id).select().single()) as Order;
  const o = local().orders.find((x) => x.id === id);
  if (!o) throw new Error("Order not found");
  Object.assign(o, patch, { updated_at: now() });
  save();
  return structuredClone(o);
}

export async function addEvent(order_id: string, status: string, note: string | null = null) {
  if (hasSupabase()) {
    must(await supa().from("order_events").insert({ order_id, status, note }));
    return;
  }
  const db = local();
  db.order_events.push({ id: db.seq++, order_id, status, note, created_at: now() });
  save();
}

export async function getEvents(order_id: string): Promise<OrderEvent[]> {
  if (hasSupabase())
    return must(
      await supa().from("order_events").select().eq("order_id", order_id).order("created_at", { ascending: true }),
    ) as OrderEvent[];
  return local().order_events.filter((e) => e.order_id === order_id);
}

/** Idempotent: safe to call from both the webhook and the success page. */
export async function markPaid(
  id: string,
  info: { sessionId?: string; subscriptionId?: string | null; address?: Record<string, unknown> | null; note?: string },
): Promise<Order | null> {
  const order = await getOrder(id);
  if (!order) return null;
  if (order.status !== "pending_payment") return order;
  const updated = await updateOrder(id, {
    status: "paid",
    stripe_session_id: info.sessionId ?? order.stripe_session_id,
    stripe_subscription_id: info.subscriptionId ?? order.stripe_subscription_id,
    shipping_address: info.address ?? order.shipping_address,
  });
  await addEvent(id, "paid", info.note ?? "Payment received");
  return updated;
}

export async function stats() {
  const orders = await listOrders();
  const paid = orders.filter((o) => o.status !== "pending_payment" && o.status !== "cancelled");
  const today = new Date().toISOString().slice(0, 10);
  return {
    revenue: paid.reduce((s, o) => s + o.total, 0),
    ordersToday: paid.filter((o) => o.created_at.slice(0, 10) === today).length,
    toCompound: orders.filter((o) => o.status === "paid" || o.status === "mixing").length,
    tubes: paid.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0),
  };
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export async function createThread(t: { name: string; email: string; order_no: string | null }): Promise<ChatThread> {
  const token = randomBytes(18).toString("base64url");
  if (hasSupabase()) {
    return must(await supa().from("chat_threads").insert({ ...t, token }).select().single()) as ChatThread;
  }
  const thread: ChatThread = {
    ...t,
    id: randomUUID(),
    token,
    status: "open",
    unread_admin: 0,
    last_message: null,
    last_message_at: now(),
    created_at: now(),
  };
  local().chat_threads.push(thread);
  save();
  return thread;
}

export async function getThread(id: string): Promise<ChatThread | null> {
  if (hasSupabase()) return must(await supa().from("chat_threads").select().eq("id", id).maybeSingle()) as ChatThread | null;
  return clone(local().chat_threads.find((t) => t.id === id));
}

export async function listThreads(): Promise<ChatThread[]> {
  if (hasSupabase())
    return must(await supa().from("chat_threads").select().order("last_message_at", { ascending: false }).limit(100)) as ChatThread[];
  return [...local().chat_threads].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
}

export async function updateThread(id: string, patch: Partial<ChatThread>) {
  if (hasSupabase()) {
    must(await supa().from("chat_threads").update(patch).eq("id", id));
    return;
  }
  const t = local().chat_threads.find((x) => x.id === id);
  if (t) Object.assign(t, patch);
  save();
}

export async function addMessage(thread_id: string, sender: ChatMessage["sender"], body: string): Promise<ChatMessage> {
  let msg: ChatMessage;
  if (hasSupabase()) {
    msg = must(await supa().from("chat_messages").insert({ thread_id, sender, body }).select().single()) as ChatMessage;
  } else {
    const db = local();
    msg = { id: db.seq++, thread_id, sender, body, created_at: now() };
    db.chat_messages.push(msg);
    save();
  }
  const thread = await getThread(thread_id);
  await updateThread(thread_id, {
    last_message: body.slice(0, 140),
    last_message_at: msg.created_at,
    // only a staff reply clears the unread badge; the automatic system note does not
    unread_admin:
      sender === "customer" ? (thread?.unread_admin ?? 0) + 1 : sender === "admin" ? 0 : (thread?.unread_admin ?? 0),
    ...(sender === "customer" ? { status: "open" as const } : {}),
  });
  return msg;
}

export async function getMessages(thread_id: string, afterId = 0): Promise<ChatMessage[]> {
  if (hasSupabase())
    return must(
      await supa().from("chat_messages").select().eq("thread_id", thread_id).gt("id", afterId).order("id").limit(500),
    ) as ChatMessage[];
  return local().chat_messages.filter((m) => m.thread_id === thread_id && m.id > afterId);
}

export type { CartLine };
