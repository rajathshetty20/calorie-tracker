-- Run this in the Supabase SQL Editor.
-- pgcrypto is preinstalled in Supabase, so gen_random_uuid() works out of the box.

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  eaten_on date not null default current_date,
  name text,
  carbs_g numeric not null check (carbs_g >= 0),
  protein_g numeric not null check (protein_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  created_at timestamptz not null default now()
);
create index if not exists meals_user_day on public.meals (user_id, eaten_on desc);

create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (user_id, measured_on)
);
create index if not exists weights_user_day on public.weights (user_id, measured_on desc);

-- Water is tracked as a per-day volume in millilitres. The "bottle" count in
-- the UI is just a convenience: a tap adds settings.bottle_ml to this total.
create table if not exists public.water (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  drank_on date not null default current_date,
  ml integer not null default 0 check (ml >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, drank_on)
);
create index if not exists water_user_day on public.water (user_id, drank_on desc);
-- Ensure the volume column exists on databases created before this change.
alter table public.water add column if not exists ml integer not null default 0 check (ml >= 0);

-- One row per exercise entry per day. Sets are an ordered jsonb array of
-- {"weight_kg": number, "reps": number}; the app derives top set / volume.
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  performed_on date not null default current_date,
  name text not null,
  sets jsonb not null default '[]' check (jsonb_typeof(sets) = 'array'),
  created_at timestamptz not null default now()
);
create index if not exists exercises_user_day on public.exercises (user_id, performed_on desc);

-- Time spent per day per category (category is stored lowercase; one row
-- per user+day+category, updated in place).
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  spent_on date not null default current_date,
  category text not null,
  minutes integer not null check (minutes > 0),
  created_at timestamptz not null default now(),
  unique (user_id, spent_on, category)
);
create index if not exists time_entries_user_day on public.time_entries (user_id, spent_on desc);

create table if not exists public.settings (
  user_id uuid primary key references auth.users on delete cascade,
  target_calories integer not null default 2000 check (target_calories > 0),
  carbs_pct integer not null default 40 check (carbs_pct between 0 and 100),
  protein_pct integer not null default 30 check (protein_pct between 0 and 100),
  fat_pct integer not null default 30 check (fat_pct between 0 and 100),
  bottle_ml integer not null default 1000 check (bottle_ml > 0),
  updated_at timestamptz not null default now(),
  check (carbs_pct + protein_pct + fat_pct = 100)
);
-- For databases created before bottle_ml existed.
alter table public.settings add column if not exists bottle_ml integer not null default 1000 check (bottle_ml > 0);

grant select, insert, update, delete on public.meals to authenticated;
grant select, insert, update, delete on public.weights to authenticated;
grant select, insert, update, delete on public.water to authenticated;
grant select, insert, update, delete on public.settings to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.time_entries to authenticated;

alter table public.meals enable row level security;
alter table public.weights enable row level security;
alter table public.water enable row level security;
alter table public.settings enable row level security;
alter table public.exercises enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists "meals are owner-only" on public.meals;
create policy "meals are owner-only" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weights are owner-only" on public.weights;
create policy "weights are owner-only" on public.weights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "water is owner-only" on public.water;
create policy "water is owner-only" on public.water
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "settings are owner-only" on public.settings;
create policy "settings are owner-only" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "exercises are owner-only" on public.exercises;
create policy "exercises are owner-only" on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "time entries are owner-only" on public.time_entries;
create policy "time entries are owner-only" on public.time_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
