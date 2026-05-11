-- Baseball Team App MVP schema
-- Generated from README spec (tables, indexes, and base stats view)

create extension if not exists pgcrypto;

-- TEAMS
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season text not null,
  created_at timestamptz not null default now()
);

-- PLAYERS
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  number int,
  positions text[],
  bats text check (bats in ('R', 'L', 'S')),
  throws text check (throws in ('R', 'L')),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- EVENTS
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  type text not null check (type in ('training', 'wedstrijd', 'oefenwedstrijd', 'toernooi', 'teamactiviteit')),
  date date not null,
  time time,
  location text,
  opponent text,
  notes text,
  created_at timestamptz not null default now()
);

-- ATTENDANCE
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'geen_reactie' check (status in ('aanwezig', 'afwezig', 'misschien', 'geen_reactie')),
  comment text,
  unique (event_id, player_id)
);

-- GAMES
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade unique,
  home_away text check (home_away in ('thuis', 'uit')),
  final_score_for int,
  final_score_against int,
  innings int not null default 7,
  status text not null default 'gepland' check (status in ('gepland', 'bezig', 'klaar'))
);

-- LINEUPS
create table if not exists public.lineups (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id),
  batting_order int not null,
  starting_position text,
  is_starter boolean not null default true,
  unique (game_id, batting_order)
);

-- PLAYS
create table if not exists public.plays (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  inning int not null,
  half text not null check (half in ('top', 'bottom')),
  sequence int not null,
  batter_id uuid references public.players(id),
  pitcher_id uuid references public.players(id),
  result text not null,
  rbi int not null default 0,
  runs_scored int not null default 0,
  outs_on_play int not null default 0,
  fielding_play text,
  voided boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (game_id, sequence)
);

-- RUNNER EVENTS
create table if not exists public.runner_events (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references public.plays(id) on delete cascade,
  player_id uuid not null references public.players(id),
  from_base int check (from_base between 0 and 4),
  to_base int check (to_base between 1 and 4),
  result text check (result in ('advance', 'SB', 'CS', 'pickoff', 'out_on_base', 'run_scored')),
  run_scored boolean not null default false
);

-- PITCHING APPEARANCES
create table if not exists public.pitching_appearances (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id),
  innings_pitched numeric(3,1),
  batters_faced int,
  pitch_count int,
  unique (game_id, player_id)
);

-- INDEXES
create index if not exists idx_plays_game_non_voided
  on public.plays(game_id, sequence)
  where voided = false;

create index if not exists idx_plays_batter_non_voided
  on public.plays(batter_id)
  where voided = false;

create index if not exists idx_plays_pitcher_non_voided
  on public.plays(pitcher_id)
  where voided = false;

create index if not exists idx_attendance_player
  on public.attendance(player_id);

create index if not exists idx_events_team_date
  on public.events(team_id, date desc);

-- VIEW: base hitting aggregates per player
create or replace view public.player_hitting_stats as
select
  p.id as player_id,
  count(distinct pl.game_id) as g,
  count(*) filter (where pl.result in ('1B', '2B', '3B', 'HR', 'K', 'OUT', 'E', 'FC')) as ab,
  count(*) filter (where pl.result in ('1B', '2B', '3B', 'HR')) as h,
  count(*) filter (where pl.result = '1B') as singles,
  count(*) filter (where pl.result = '2B') as doubles,
  count(*) filter (where pl.result = '3B') as triples,
  count(*) filter (where pl.result = 'HR') as hr,
  count(*) filter (where pl.result = 'BB') as bb,
  count(*) filter (where pl.result = 'HBP') as hbp,
  count(*) filter (where pl.result = 'K') as k,
  coalesce(sum(pl.rbi), 0) as rbi,
  coalesce(sum(pl.runs_scored), 0) as r
from public.players p
left join public.plays pl
  on pl.batter_id = p.id
  and pl.voided = false
group by p.id;

-- Note: RLS intentionally left disabled for MVP (single user/team scope).
