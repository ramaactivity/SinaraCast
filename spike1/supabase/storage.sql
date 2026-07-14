-- Storage bucket for Story pool images. Public-read so Meta can fetch image_url
-- during publish (same as the Spike-1 Vercel image). Writes restricted to the
-- owner's own folder ({uid}/...). RLS on storage.objects.

-- Also holds one-off Reels video (mp4/mov). 50 MB = Supabase free-tier global cap.
-- Applied live via supabase/setup-media-bucket.mjs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pool-images', 'pool-images', true, 52428800, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg','image/png','video/mp4','video/quicktime'];

drop policy if exists pool_images_insert on storage.objects;
create policy pool_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pool-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists pool_images_update on storage.objects;
create policy pool_images_update on storage.objects for update to authenticated
  using (bucket_id = 'pool-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists pool_images_delete on storage.objects;
create policy pool_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pool-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists pool_images_read on storage.objects;
create policy pool_images_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'pool-images');
