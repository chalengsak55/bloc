-- ─────────────────────────────────────────────────────────────
-- Bloc seed: fake sellers for Nearby Grid testing
-- Run this in the Supabase SQL editor (requires service role).
-- Safe to re-run: uses ON CONFLICT DO NOTHING.
-- ─────────────────────────────────────────────────────────────

-- 1. Add lat/lng columns to profiles if they don't exist yet
alter table public.profiles
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- 2. Insert fake auth users (needed because profiles.id → auth.users.id)
insert into auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role
)
values
  ('b10c5eed-0001-4000-8000-000000000001', 'seed_tony@bloc.test',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
  ('b10c5eed-0002-4000-8000-000000000002', 'seed_mia@bloc.test',    '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
  ('b10c5eed-0003-4000-8000-000000000003', 'seed_jay@bloc.test',    '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
  ('b10c5eed-0004-4000-8000-000000000004', 'seed_ploy@bloc.test',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
  ('b10c5eed-0005-4000-8000-000000000005', 'seed_alex@bloc.test',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
  ('b10c5eed-0006-4000-8000-000000000006', 'seed_nong@bloc.test',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
  ('b10c5eed-0007-4000-8000-000000000007', 'seed_james@bloc.test',  '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
  ('b10c5eed-0008-4000-8000-000000000008', 'seed_fern@bloc.test',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
  ('b10c5eed-0009-4000-8000-000000000009', 'seed_korn@bloc.test',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
  ('b10c5eed-000a-4000-8000-00000000000a', 'seed_eve@bloc.test',    '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
  ('b10c5eed-000b-4000-8000-00000000000b', 'seed_mark@bloc.test',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
  ('b10c5eed-000c-4000-8000-00000000000c', 'seed_pim@bloc.test',    '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated')
on conflict (id) do nothing;

-- 3. Insert seller profiles
-- Coordinates are spread around Bangkok (13.75°N, 100.50°E)
insert into public.profiles (
  id, role, display_name, category, location_text,
  is_online, lat, lng, bio
)
values
  -- Hair
  ('b10c5eed-0001-4000-8000-000000000001', 'seller', 'Tony Cuts',        'hair',   'Sukhumvit',    true,  13.7310, 100.5694, 'Walk-in haircuts, Sukhumvit soi 11'),
  ('b10c5eed-0002-4000-8000-000000000002', 'seller', 'Mia Studio',       'hair',   'Silom',        true,  13.7254, 100.5140, 'Color & blowout specialist'),
  ('b10c5eed-0003-4000-8000-000000000003', 'seller', 'Jay Barber',       'hair',   'Ari',          false, 13.7764, 100.5476, 'Classic cuts, fades, beard trims'),

  -- Food
  ('b10c5eed-0004-4000-8000-000000000004', 'seller', 'Ploy Kitchen',     'food',   'Thonglor',     true,  13.7269, 100.5795, 'Thai home cooking, delivery in 30 min'),
  ('b10c5eed-0005-4000-8000-000000000005', 'seller', 'Alex Eats',        'food',   'Ekkamai',      true,  13.7195, 100.5855, 'Burgers & fries, fast delivery'),
  ('b10c5eed-0006-4000-8000-000000000006', 'seller', 'Nong Catering',    'food',   'Lat Phrao',    false, 13.8100, 100.5700, 'Event catering, min 20 pax'),

  -- Home
  ('b10c5eed-0007-4000-8000-000000000007', 'seller', 'James Fix-It',     'home',   'On Nut',       true,  13.7018, 100.6003, 'Plumbing, electrical, general repair'),
  ('b10c5eed-0008-4000-8000-000000000008', 'seller', 'Fern Clean Co.',   'home',   'Bearing',      false, 13.6702, 100.6115, 'Deep cleaning, condo & house'),

  -- Moving
  ('b10c5eed-0009-4000-8000-000000000009', 'seller', 'Korn Movers',      'moving', 'Bang Na',      true,  13.6694, 100.6043, 'Truck + 2 crew, same-day available'),
  ('b10c5eed-000a-4000-8000-00000000000a', 'seller', 'Eve Express Move', 'moving', 'Ramkhamhaeng', true,  13.7564, 100.6437, 'Small moves & single-item delivery'),

  -- Tech
  ('b10c5eed-000b-4000-8000-00000000000b', 'seller', 'Mark Tech',        'tech',   'Asok',         true,  13.7373, 100.5600, 'Mac & PC repair, same-day screen fix'),
  ('b10c5eed-000c-4000-8000-00000000000c', 'seller', 'Pim IT Support',   'tech',   'Phrom Phong',  false, 13.7300, 100.5700, 'Network setup, smart home install')
on conflict (id) do nothing;
