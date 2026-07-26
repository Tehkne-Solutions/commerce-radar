create table if not exists public.commerce_radar_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.commerce_radar_workspaces enable row level security;

revoke all on table public.commerce_radar_workspaces from anon;
grant select, insert, update, delete on table public.commerce_radar_workspaces to authenticated;

drop policy if exists "Users can read own Commerce Radar workspace" on public.commerce_radar_workspaces;
create policy "Users can read own Commerce Radar workspace"
on public.commerce_radar_workspaces for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own Commerce Radar workspace" on public.commerce_radar_workspaces;
create policy "Users can insert own Commerce Radar workspace"
on public.commerce_radar_workspaces for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own Commerce Radar workspace" on public.commerce_radar_workspaces;
create policy "Users can update own Commerce Radar workspace"
on public.commerce_radar_workspaces for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own Commerce Radar workspace" on public.commerce_radar_workspaces;
create policy "Users can delete own Commerce Radar workspace"
on public.commerce_radar_workspaces for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_commerce_radar_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_commerce_radar_updated_at on public.commerce_radar_workspaces;
create trigger set_commerce_radar_updated_at
before update on public.commerce_radar_workspaces
for each row execute function public.set_commerce_radar_updated_at();
