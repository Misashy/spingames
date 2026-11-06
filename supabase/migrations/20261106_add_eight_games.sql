-- Expand the existing allow-list, retaining every previously supported slug.
-- Existing player_progress rows, RLS policies, indexes and game content are unchanged.
alter table public.player_progress drop constraint sg_allowed_game;
alter table public.player_progress add constraint sg_allowed_game
  check (game_slug = any (array['les-sims-4','minecraft','fortnite','roblox','stardew-valley','animal-crossing','gta-rp','valorant','elden-ring','mario-kart','risk-of-rain-2','football-manager','pubg','apex','league-of-legends','overwatch','counter-strike','warzone','dota-2','deadlock','dofus']::text[]));

-- Retain current visitor throttling, statistics and SECURITY DEFINER behavior.
create or replace function sg_private.register_spin(p_visitor_id uuid, p_game_slug text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if p_visitor_id is null or p_game_slug not in (
    'les-sims-4','minecraft','fortnite','roblox','stardew-valley','animal-crossing','gta-rp','valorant','elden-ring','mario-kart','risk-of-rain-2','football-manager','pubg','apex','league-of-legends','overwatch','counter-strike','warzone','dota-2','deadlock','dofus'
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
$function$;
