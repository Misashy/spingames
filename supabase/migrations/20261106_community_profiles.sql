-- SpinGames community profiles. Existing game progress and messages stay untouched.
create table if not exists public.sg_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  bio text not null default '',
  avatar_path text,
  banner_path text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sg_profile_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  constraint sg_profile_reserved_names check (lower(username) not in ('admin','administrator','moderator','moderateur','support','system','systeme','staff','spingames','officiel') or is_admin),
  constraint sg_profile_bio_length check (char_length(bio) <= 160),
  constraint sg_profile_avatar_path check (avatar_path is null or avatar_path ~ ('^' || user_id::text || '/avatar-[0-9a-f-]{36}\.webp$')),
  constraint sg_profile_banner_path check (banner_path is null or banner_path ~ ('^' || user_id::text || '/banner-[0-9a-f-]{36}\.webp$'))
);
create unique index if not exists sg_public_profiles_username_lower_key on public.sg_public_profiles (lower(username));
alter table public.sg_public_profiles enable row level security;
revoke all on public.sg_public_profiles from anon, authenticated;
grant select on public.sg_public_profiles to anon, authenticated;
grant insert (user_id, username, bio, avatar_path, banner_path) on public.sg_public_profiles to authenticated;
grant update (username, bio, avatar_path, banner_path) on public.sg_public_profiles to authenticated;
create policy sg_public_profiles_read on public.sg_public_profiles for select to anon, authenticated using (true);
create policy sg_public_profiles_create_own on public.sg_public_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy sg_public_profiles_update_own on public.sg_public_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- All uploaded media is publicly viewable, but only the owner may upload/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sg-profile-media','sg-profile-media',true,2097152,array['image/webp'])
on conflict (id) do nothing;
create policy sg_profile_media_insert_own on storage.objects for insert to authenticated
  with check (bucket_id='sg-profile-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.extension(name) = 'webp');
create policy sg_profile_media_delete_own on storage.objects for delete to authenticated
  using (bucket_id='sg-profile-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Chat names are authoritative; the browser cannot impersonate another nickname.
create or replace function public.sg_chat_enforce_profile()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  select p.username into new.display_name
  from public.sg_public_profiles as p where p.user_id = new.user_id;
  if new.display_name is null then
    raise exception 'Choisis un pseudo avant de participer au chat.';
  end if;
  return new;
end;
$$;
create trigger sg_chat_set_profile_name before insert on public.chat_general_messages
for each row execute function public.sg_chat_enforce_profile();
drop policy if exists chat_send_as_signed_in_user on public.chat_general_messages;
create policy chat_send_as_signed_in_user on public.chat_general_messages for insert to authenticated
  with check ((select auth.uid()) = user_id and not is_hidden
    and exists(select 1 from public.sg_public_profiles p where p.user_id=(select auth.uid())));
-- is_admin is immutable to users (column privileges exclude it).
-- An administrator must be designated explicitly after verifying which auth UID belongs to the owner.