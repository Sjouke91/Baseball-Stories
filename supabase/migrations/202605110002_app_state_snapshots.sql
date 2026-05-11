-- Persist full client app snapshot in Supabase so data survives localStorage resets/devices

create table if not exists public.app_state_snapshots (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
