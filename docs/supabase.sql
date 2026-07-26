-- Commerce Radar v0.3 — workspace por usuário
-- Execute no SQL Editor do seu projeto Supabase.

create table if not exists public.commerce_radar_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.commerce_radar_workspaces enable row level security;

grant select, insert, update, delete
on public.commerce_radar_workspaces
to authenticated;

drop policy if exists "Users read own commerce radar workspace" on public.commerce_radar_workspaces;
create policy "Users read own commerce radar workspace"
on public.commerce_radar_workspaces
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users create own commerce radar workspace" on public.commerce_radar_workspaces;
create policy "Users create own commerce radar workspace"
on public.commerce_radar_workspaces
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users update own commerce radar workspace" on public.commerce_radar_workspaces;
create policy "Users update own commerce radar workspace"
on public.commerce_radar_workspaces
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users delete own commerce radar workspace" on public.commerce_radar_workspaces;
create policy "Users delete own commerce radar workspace"
on public.commerce_radar_workspaces
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
