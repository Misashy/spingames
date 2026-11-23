-- V12 DOFUS IDLE — appliquer dans un projet Supabase DÉDIÉ, après revue.
-- Table sécurisée, chaque compte voit uniquement ses trois emplacements.
create table if not exists public.dofus_idle_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in ('principal','secondaire','troisieme')),
  save_data jsonb not null check (jsonb_typeof(save_data)='object'),
  updated_at timestamptz not null default now(),
  primary key (user_id,slot)
);
alter table public.dofus_idle_saves enable row level security;
revoke all on public.dofus_idle_saves from anon;
grant select,insert,update,delete on public.dofus_idle_saves to authenticated;
drop policy if exists "Read own saves" on public.dofus_idle_saves;
drop policy if exists "Create own saves" on public.dofus_idle_saves;
drop policy if exists "Update own saves" on public.dofus_idle_saves;
drop policy if exists "Delete own saves" on public.dofus_idle_saves;
create policy "Read own saves" on public.dofus_idle_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own saves" on public.dofus_idle_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own saves" on public.dofus_idle_saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own saves" on public.dofus_idle_saves for delete to authenticated using ((select auth.uid()) = user_id);
