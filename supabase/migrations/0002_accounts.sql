-- Customer accounts (Sign in with Google via Supabase Auth).
-- Run once in Supabase → SQL Editor, after 0001_init.sql.
--
-- Orders and chats keep working for guests (user_id stays null). Signed-in
-- customers also see guest orders placed with their Google email.

alter table public.orders       add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.chat_threads add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_idx       on public.orders (user_id, created_at desc);
create index if not exists chat_threads_user_idx on public.chat_threads (user_id, last_message_at desc);

-- Formulas a customer keeps in their account (separate from public share links).
create table if not exists public.saved_formulas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  config      jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists saved_formulas_user_idx on public.saved_formulas (user_id, created_at desc);

-- Same security model as 0001: RLS on, no policies, only the server role.
alter table public.saved_formulas enable row level security;
grant select, insert, update, delete on public.saved_formulas to service_role;
