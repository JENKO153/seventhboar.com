-- Seventh Boar Development — CMS schema
-- Paste this whole file into Supabase: Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run: uses "create table if not exists" / "drop policy if exists".

-- ---------- journal_posts ----------
create table if not exists journal_posts (
  slug text primary key,
  title text not null,
  category text not null,
  excerpt text not null,
  image_url text not null,
  content jsonb not null default '[]'::jsonb,
  author text not null default 'Seventh Boar',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  card_image_url text
);

-- Adds the cropped card-thumbnail image to a journal_posts table created before it existed.
alter table journal_posts add column if not exists card_image_url text;

alter table journal_posts enable row level security;

drop policy if exists "journal_posts_public_read" on journal_posts;
create policy "journal_posts_public_read"
  on journal_posts for select
  to anon, authenticated
  using (true);

drop policy if exists "journal_posts_auth_write" on journal_posts;
create policy "journal_posts_auth_write"
  on journal_posts for all
  to authenticated
  using (true)
  with check (true);

-- ---------- projects ----------
create table if not exists projects (
  slug text primary key,
  title text not null,
  categories text[] not null default '{}',
  platforms text[] not null default '{}',
  client text,
  tagline text not null,
  icon_url text,
  banner_url text not null,
  brief jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  client_logo_url text,
  client_links jsonb not null default '[]'::jsonb,
  card_banner_url text
);

-- Adds the client-card columns to a projects table created before they existed.
alter table projects add column if not exists client_logo_url text;
alter table projects add column if not exists client_links jsonb not null default '[]'::jsonb;
-- Adds the cropped card-thumbnail image to a projects table created before it existed.
alter table projects add column if not exists card_banner_url text;

alter table projects enable row level security;

drop policy if exists "projects_public_read" on projects;
create policy "projects_public_read"
  on projects for select
  to anon, authenticated
  using (true);

drop policy if exists "projects_auth_write" on projects;
create policy "projects_auth_write"
  on projects for all
  to authenticated
  using (true)
  with check (true);

-- ---------- comments ----------
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null references journal_posts(slug) on delete cascade,
  author_name text not null,
  body text not null,
  likes integer not null default 0,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_slug_idx on comments (post_slug);

alter table comments enable row level security;

-- Visitors only ever see approved comments.
drop policy if exists "comments_public_read_approved" on comments;
create policy "comments_public_read_approved"
  on comments for select
  to anon
  using (approved = true);

-- The logged-in studio account (moderation page) sees everything, pending included.
drop policy if exists "comments_auth_read_all" on comments;
create policy "comments_auth_read_all"
  on comments for select
  to authenticated
  using (true);

-- Anyone can submit a comment, but it always lands unapproved — no one can
-- publish straight to public via the API, only the studio account can flip it.
drop policy if exists "comments_public_insert" on comments;
create policy "comments_public_insert"
  on comments for insert
  to anon, authenticated
  with check (approved = false and likes = 0);

drop policy if exists "comments_auth_update" on comments;
create policy "comments_auth_update"
  on comments for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "comments_auth_delete" on comments;
create policy "comments_auth_delete"
  on comments for delete
  to authenticated
  using (true);

-- Likes go through this function instead of a direct column update, so a
-- visitor can only ever increment by exactly one — never set an arbitrary
-- value, decrement, or edit anything else on the row.
create or replace function increment_comment_like(comment_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update comments set likes = likes + 1 where id = comment_id and approved = true;
$$;

grant execute on function increment_comment_like(uuid) to anon, authenticated;

-- ---------- storage ----------
-- Run this part too — creates a public-read bucket for cover/icon images.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "post_images_public_read" on storage.objects;
create policy "post_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'post-images');

drop policy if exists "post_images_auth_write" on storage.objects;
create policy "post_images_auth_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-images');

drop policy if exists "post_images_auth_delete" on storage.objects;
create policy "post_images_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-images');
