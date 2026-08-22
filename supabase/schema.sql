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
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

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
