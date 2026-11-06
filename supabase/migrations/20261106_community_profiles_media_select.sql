-- Allow owners to list their own media when deleting/replacing an image.
-- Public HTTP image serving is controlled by the public bucket; storage metadata remains owner-scoped via RLS.
create policy sg_profile_media_select_own on storage.objects for select to authenticated
  using (bucket_id='sg-profile-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text);