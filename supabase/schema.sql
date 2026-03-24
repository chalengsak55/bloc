-- Bloc core schema (run in Supabase SQL editor)

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('buyer', 'seller');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  phone text,

  display_name text,
  link_url text,
  category text,
  location_text text,
  bio text,
  avatar_url text,

  is_online boolean not null default false,

  lat double precision,
  lng double precision,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- requests does NOT have updated_at — ensure no stale trigger exists
drop trigger if exists requests_set_updated_at on public.requests;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  sentence text not null,
  category text,
  location_text text,
  budget_text text,
  time_text text,
  status text not null default 'open',
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

-- Migration: add lat/lng to existing requests tables
alter table public.requests add column if not exists lat double precision;
alter table public.requests add column if not exists lng double precision;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  rank int not null default 0,
  status text not null default 'proposed',
  created_at timestamptz not null default now()
);

create unique index if not exists matches_unique on public.matches(request_id, seller_id);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  seller_id uuid references auth.users(id) on delete set null,
  type text not null,
  body text not null,
  media_url text,
  created_at timestamptz not null default now()
);

alter table public.requests replica identity full;
alter table public.matches replica identity full;
alter table public.activities replica identity full;

alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.activities;

-- RLS
alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.matches enable row level security;
alter table public.activities enable row level security;

-- Profiles
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_upsert_self" on public.profiles;
create policy "profiles_upsert_self"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Requests: public ticker read (anon + authenticated), buyers CRUD own, sellers read open.
drop policy if exists "requests_read_ticker_public" on public.requests;
create policy "requests_read_ticker_public"
on public.requests for select
to anon, authenticated
using (true);

-- Requests: buyers can create/read/update/delete their own. Sellers can read open requests.
drop policy if exists "requests_insert_buyer" on public.requests;
create policy "requests_insert_buyer"
on public.requests for insert
to authenticated
with check (auth.uid() = buyer_id);

drop policy if exists "requests_read_buyer" on public.requests;
create policy "requests_read_buyer"
on public.requests for select
to authenticated
using (auth.uid() = buyer_id);

drop policy if exists "requests_update_buyer" on public.requests;
create policy "requests_update_buyer"
on public.requests for update
to authenticated
using (auth.uid() = buyer_id)
with check (auth.uid() = buyer_id);

drop policy if exists "requests_delete_buyer" on public.requests;
create policy "requests_delete_buyer"
on public.requests for delete
to authenticated
using (auth.uid() = buyer_id);

drop policy if exists "requests_read_sellers_open" on public.requests;
create policy "requests_read_sellers_open"
on public.requests for select
to authenticated
using (
  status = 'open'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'seller'
  )
);

-- Matches: buyer can read matches for their requests; seller can read matches for them.
drop policy if exists "matches_read_buyer" on public.matches;
create policy "matches_read_buyer"
on public.matches for select
to authenticated
using (
  exists (
    select 1 from public.requests r
    where r.id = request_id
      and r.buyer_id = auth.uid()
  )
);

drop policy if exists "matches_read_seller" on public.matches;
create policy "matches_read_seller"
on public.matches for select
to authenticated
using (seller_id = auth.uid());

-- Activities: buyer can read for their request; seller can insert/read for requests they are matched to.
drop policy if exists "activities_read_buyer" on public.activities;
create policy "activities_read_buyer"
on public.activities for select
to authenticated
using (
  exists (
    select 1 from public.requests r
    where r.id = request_id
      and r.buyer_id = auth.uid()
  )
);

drop policy if exists "activities_read_seller_matched" on public.activities;
create policy "activities_read_seller_matched"
on public.activities for select
to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.request_id = request_id
      and m.seller_id = auth.uid()
  )
);

drop policy if exists "activities_insert_seller" on public.activities;
create policy "activities_insert_seller"
on public.activities for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1 from public.matches m
    where m.request_id = request_id
      and m.seller_id = auth.uid()
  )
);

-- ─── Conversations ────────────────────────────────────────────────────────────

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists conversations_buyer_seller
  on public.conversations(buyer_id, seller_id);

-- ─── Messages ────────────────────────────────────────────────────────────────

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text,
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  constraint messages_has_content check (content is not null or media_url is not null)
);

alter table public.conversations replica identity full;
alter table public.messages replica identity full;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations: both participants can read; buyer creates
drop policy if exists "conversations_participant_select" on public.conversations;
create policy "conversations_participant_select"
on public.conversations for select
to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "conversations_buyer_insert" on public.conversations;
create policy "conversations_buyer_insert"
on public.conversations for insert
to authenticated
with check (auth.uid() = buyer_id);

-- Messages: participants can read and send
drop policy if exists "messages_participant_select" on public.messages;
create policy "messages_participant_select"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

drop policy if exists "messages_participant_insert" on public.messages;
create policy "messages_participant_insert"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

-- ─── Saved sellers (wishlist) ────────────────────────────────────────────────

create table if not exists public.saved_sellers (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists saved_sellers_unique on public.saved_sellers(buyer_id, seller_id);

alter table public.saved_sellers enable row level security;

drop policy if exists "saved_sellers_select_own" on public.saved_sellers;
create policy "saved_sellers_select_own"
on public.saved_sellers for select
to authenticated
using (auth.uid() = buyer_id);

drop policy if exists "saved_sellers_insert_own" on public.saved_sellers;
create policy "saved_sellers_insert_own"
on public.saved_sellers for insert
to authenticated
with check (auth.uid() = buyer_id);

drop policy if exists "saved_sellers_delete_own" on public.saved_sellers;
create policy "saved_sellers_delete_own"
on public.saved_sellers for delete
to authenticated
using (auth.uid() = buyer_id);

-- ─── Smiles (post-conversation feedback) ────────────────────────────────────

create table if not exists public.smiles (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists smiles_unique on public.smiles(conversation_id, buyer_id);

alter table public.smiles enable row level security;

drop policy if exists "smiles_select_participant" on public.smiles;
create policy "smiles_select_participant"
on public.smiles for select
to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "smiles_insert_buyer" on public.smiles;
create policy "smiles_insert_buyer"
on public.smiles for insert
to authenticated
with check (auth.uid() = buyer_id);

drop policy if exists "smiles_delete_buyer" on public.smiles;
create policy "smiles_delete_buyer"
on public.smiles for delete
to authenticated
using (auth.uid() = buyer_id);

-- Public count: anyone can count smiles for a seller (for trust metrics)
drop policy if exists "smiles_count_public" on public.smiles;
create policy "smiles_count_public"
on public.smiles for select
to anon, authenticated
using (true);

-- ─── Storage: avatars ────────────────────────────────────────────────────────
-- Run once in Supabase SQL editor:
--
--   insert into storage.buckets (id, name, public)
--   values ('avatars', 'avatars', true)
--   on conflict do nothing;
--
--   create policy "avatars_upload" on storage.objects for insert
--   to authenticated with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
--
--   create policy "avatars_update" on storage.objects for update
--   to authenticated using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
--
--   create policy "avatars_read" on storage.objects for select
--   using (bucket_id = 'avatars');

-- ─── Storage: messages-media ──────────────────────────────────────────────────
-- Run once in Supabase SQL editor:
--
--   insert into storage.buckets (id, name, public)
--   values ('messages-media', 'messages-media', true)
--   on conflict do nothing;
--
--   create policy "messages_media_upload" on storage.objects for insert
--   to authenticated with check (bucket_id = 'messages-media');
--
--   create policy "messages_media_read" on storage.objects for select
--   to authenticated using (bucket_id = 'messages-media');

