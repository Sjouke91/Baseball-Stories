-- Ensure snapshot table can be used by MVP clients via publishable/anon keys

alter table if exists public.app_state_snapshots enable row level security;

-- Public read/write policy for MVP single-team setup (tighten later with auth)
drop policy if exists app_state_snapshots_mvp_access on public.app_state_snapshots;
create policy app_state_snapshots_mvp_access
  on public.app_state_snapshots
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on table public.app_state_snapshots to anon, authenticated;
