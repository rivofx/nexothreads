-- ============================================================
-- Nexo: Storage Bucket Setup
-- Run AFTER the main schema migration
-- ============================================================

-- Create buckets (run in Supabase SQL Editor)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    8388608, -- 8MB
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'post-images',
    'post-images',
    true,
    8388608, -- 8MB
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'post-videos',
    'post-videos',
    true,
    52428800, -- 50MB
    array['video/mp4', 'video/webm']
  )
on conflict (id) do nothing;

-- ============================================================
-- Storage RLS Policies
-- ============================================================

-- AVATARS bucket
create policy "Avatar images are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- POST IMAGES bucket
create policy "Post images are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "Authenticated users can upload post images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own post images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- POST VIDEOS bucket
create policy "Post videos are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'post-videos');

create policy "Authenticated users can upload post videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own post videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
