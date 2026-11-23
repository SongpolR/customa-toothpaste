-- Customa schema. Run once in Supabase → SQL Editor (or `supabase db push`).
--
-- Security model: every table has RLS enabled and NO policies, so the anon
-- key can read/write nothing. All access goes through Next.js API routes
-- using the service-role key. Live chat uses Realtime *Broadcast* on channel
-- names that contain an unguessable per-thread token.

create extension if not exists pgcrypto;

create table if not exists public.formulas (
  slug        text primary key,
  config      jsonb not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.orders (
  id                      uuid primary key default gen_random_uuid(),
  order_no                text not null unique,
  email                   text not null,
  customer_name           text not null,
  phone                   text,
  items                   jsonb not null,
  subtotal                integer not null,
  shipping                integer not null,
  total                   integer not null,
  currency                text not null default 'thb',
  mode                    text not null default 'payment' check (mode in ('payment', 'subscription')),
  status                  text not null default 'pending_payment'
                          check (status in ('pending_payment','paid','mixing','packing','shipped','delivered','cancelled')),
  tracking_no             text,
  shipping_address        jsonb,
  stripe_session_id       text unique,
  stripe_subscription_id  text,
  parent_order_id         uuid references public.orders(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_email_idx on public.orders (lower(email));
create index if not exists orders_sub_idx on public.orders (stripe_subscription_id);

create table if not exists public.order_events (
  id          bigserial primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      text not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

create table if not exists public.chat_threads (
  id               uuid primary key default gen_random_uuid(),
  token            text not null,
  name             text not null,
  email            text not null,
  order_no         text,
  status           text not null default 'open' check (status in ('open','closed')),
  unread_admin     integer not null default 0,
  last_message     text,
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index if not exists chat_threads_recent_idx on public.chat_threads (last_message_at desc);

create table if not exists public.chat_messages (
  id          bigserial primary key,
  thread_id   uuid not null references public.chat_threads(id) on delete cascade,
  sender      text not null check (sender in ('customer','admin','system')),
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_thread_idx on public.chat_messages (thread_id, id);

alter table public.formulas      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_events  enable row level security;
alter table public.chat_threads  enable row level security;
alter table public.chat_messages enable row level security;

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
for each row execute function public.touch_updated_at();
