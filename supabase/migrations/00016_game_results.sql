-- ============================================================
-- Historical game results (backfilled from CFBD /games).
-- Lets the blog generator compute all-time head-to-head series from our own
-- DB instead of calling CFBD on every generation (saves the free-tier quota).
-- Paste into the Supabase SQL editor to apply.
-- ============================================================

create table if not exists public.game_results (
  id            uuid primary key default gen_random_uuid(),
  cfbd_id       bigint unique,
  season        integer not null,
  week          integer,
  season_type   text,
  home_team     text not null,       -- CFBD school name
  away_team     text not null,
  home_points   integer,
  away_points   integer,
  winner        text,
  neutral_site  boolean default false,
  game_date     timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists game_results_season_idx  on public.game_results (season);
create index if not exists game_results_home_idx     on public.game_results (lower(home_team));
create index if not exists game_results_away_idx     on public.game_results (lower(away_team));

alter table public.game_results enable row level security;

-- Read-only to everyone; writes happen via the service-role backfill route.
drop policy if exists "game_results_public_read" on public.game_results;
create policy "game_results_public_read"
  on public.game_results for select using (true);
