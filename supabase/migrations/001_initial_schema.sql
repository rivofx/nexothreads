-- ============================================================
-- Nexo: Full Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  username     text not null unique,
  display_name text,
  bio          text,
  avatar_url   text,
  onboarding_completed boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Posts
create table if not exists public.posts (
  id         uuid primary key default uuid_generate_v4(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Post media attachments
create table if not exists public.post_media (
  id               uuid primary key default uuid_generate_v4(),
  post_id          uuid not null references public.posts(id) on delete cascade,
  type             text not null check (type in ('image', 'video')),
  url              text not null,
  mime_type        text not null,
  size_bytes       bigint not null,
  width            integer,
  height           integer,
  duration_seconds numeric,
  created_at       timestamptz not null default now()
);

-- Likes
create table if not exists public.likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Comments
create table if not exists public.comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_posts_created_at    on public.posts(created_at desc);
create index if not exists idx_posts_author_id      on public.posts(author_id);
create index if not exists idx_likes_post_id        on public.likes(post_id);
create index if not exists idx_likes_user_id        on public.likes(user_id);
create index if not exists idx_comments_post_id     on public.comments(post_id, created_at);
create index if not exists idx_profiles_username    on public.profiles(username);
create index if not exists idx_post_media_post_id   on public.post_media(post_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles   enable row level security;
alter table public.posts       enable row level security;
alter table public.post_media  enable row level security;
alter table public.likes       enable row level security;
alter table public.comments    enable row level security;

-- PROFILES
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- POSTS
create policy "Posts are viewable by authenticated users"
  on public.posts for select
  to authenticated
  using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "Users can delete own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

create policy "Users can update own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- POST MEDIA
create policy "Post media is viewable by authenticated users"
  on public.post_media for select
  to authenticated
  using (true);

create policy "Post owners can insert media"
  on public.post_media for insert
  to authenticated
  with check (
    exists (
      select 1 from public.posts
      where posts.id = post_media.post_id
      and posts.author_id = auth.uid()
    )
  );

create policy "Post owners can delete media"
  on public.post_media for delete
  to authenticated
  using (
    exists (
      select 1 from public.posts
      where posts.id = post_media.post_id
      and posts.author_id = auth.uid()
    )
  );

-- LIKES
create policy "Likes are viewable by authenticated users"
  on public.likes for select
  to authenticated
  using (true);

create policy "Authenticated users can like posts"
  on public.likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on public.likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- COMMENTS
create policy "Comments are viewable by authenticated users"
  on public.comments for select
  to authenticated
  using (true);

create policy "Authenticated users can comment"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "Comment owners can delete"
  on public.comments for delete
  to authenticated
  using (auth.uid() = author_id);

create policy "Comment owners can update"
  on public.comments for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.handle_updated_at();

create trigger comments_updated_at
  before update on public.comments
  for each row execute function public.handle_updated_at();
