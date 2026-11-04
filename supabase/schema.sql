-- SpinGames / Supabase : données réelles et comptes
-- À exécuter dans un projet Supabase APRÈS création et vérification.
-- Ne publier aucune clé secrète dans GitHub.
create schema if not exists sg_private;
revoke all on schema sg_private from public;

create table if not exists sg_private.visitors (
  visitor_id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create table if not exists sg_private.presence (
  visitor_id uuid primary key,
  last_seen timestamptz not null default now()
);
create index if not exists sg_presence_last_seen_idx on sg_private.presence(last_seen);
create table if not exists sg_private.spin_events (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  game_slug text not null,
  created_at timestamptz not null default now()
);
create index if not exists sg_spins_visitor_time_idx on sg_private.spin_events(visitor_id, created_at desc);
create table if not exists public.player_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null,
  categories jsonb,
  history jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_slug),
  constraint sg_allowed_game check(game_slug in (
    'les-sims-4','minecraft','fortnite','roblox','stardew-valley','animal-crossing','gta-rp','valorant'
  ))
);
alter table public.player_progress enable row level security;
revoke all on public.player_progress from anon;
grant select,insert,update,delete on public.player_progress to authenticated;
drop policy if exists "read own progress" on public.player_progress;
create policy "read own progress" on public.player_progress
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "insert own progress" on public.player_progress;
create policy "insert own progress" on public.player_progress
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "update own progress" on public.player_progress;
create policy "update own progress" on public.player_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "delete own progress" on public.player_progress;
create policy "delete own progress" on public.player_progress
  for delete to authenticated using (user_id = (select auth.uid()));

-- Les données de comptage ne sont pas exposées comme des tables publiques.
alter table sg_private.visitors enable row level security;
alter table sg_private.presence enable row level security;
alter table sg_private.spin_events enable row level security;
revoke all on all tables in schema sg_private from anon,authenticated;

-- Les fonctions privilégiées sont conservées dans un schéma non exposé
-- et uniquement accessibles par une interface RPC contrôlée.
create or replace function sg_private.register_visit(p_visitor_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if p_visitor_id is null then return false; end if;
  insert into sg_private.visitors(visitor_id) values (p_visitor_id)
    on conflict(visitor_id) do update set last_seen = now();
  insert into sg_private.presence(visitor_id) values (p_visitor_id)
    on conflict(visitor_id) do update set last_seen = now();
  return true;
end;
$$;

create or replace function sg_private.register_spin(p_visitor_id uuid,p_game_slug text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if p_visitor_id is null or p_game_slug not in (
    'les-sims-4','minecraft','fortnite','roblox','stardew-valley','animal-crossing','gta-rp','valorant'
  ) then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_visitor_id::text));
  if exists (
    select 1 from sg_private.spin_events
    where visitor_id=p_visitor_id and created_at > now() - interval '3 seconds'
  ) then return false; end if;
  perform sg_private.register_visit(p_visitor_id);
  insert into sg_private.spin_events(visitor_id,game_slug) values (p_visitor_id,p_game_slug);
  return true;
end;
$$;

create or replace function sg_private.read_stats()
returns table(total_spins bigint, online_visitors bigint, total_visitors bigint)
language sql stable security definer set search_path = ''
as $$
  select
    (select count(*) from sg_private.spin_events),
    (select count(*) from sg_private.presence where last_seen > now() - interval '60 seconds'),
    (select count(*) from sg_private.visitors);
$$;

revoke execute on function sg_private.register_visit(uuid) from public;
revoke execute on function sg_private.register_spin(uuid,text) from public;
revoke execute on function sg_private.read_stats() from public;
grant usage on schema sg_private to anon,authenticated;
grant execute on function sg_private.register_visit(uuid),sg_private.register_spin(uuid,text),sg_private.read_stats() to anon,authenticated;

-- API publique, fonctions invocatrices sans privilèges élevés.
create or replace function public.site_register_visit(p_visitor_id uuid)
returns boolean language sql security invoker set search_path = ''
as $$ select sg_private.register_visit(p_visitor_id); $$;
create or replace function public.site_register_spin(p_visitor_id uuid,p_game_slug text)
returns boolean language sql security invoker set search_path = ''
as $$ select sg_private.register_spin(p_visitor_id,p_game_slug); $$;
create or replace function public.site_get_stats()
returns table(total_spins bigint, online_visitors bigint, total_visitors bigint)
language sql stable security invoker set search_path = ''
as $$ select * from sg_private.read_stats(); $$;
revoke all on function public.site_register_visit(uuid) from public;
revoke all on function public.site_register_spin(uuid,text) from public;
revoke all on function public.site_get_stats() from public;
grant execute on function public.site_register_visit(uuid),public.site_register_spin(uuid,text),public.site_get_stats() to anon,authenticated;

-- Note : ces métriques sont des estimations par navigateur. Des visiteurs
-- malveillants peuvent les gonfler en changeant leur identifiant.
-- Pour une activité à grande échelle, déplacer les comptages dans une Edge Function
-- avec protection anti-abus et agrégations adaptées.
