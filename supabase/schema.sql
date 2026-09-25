-- =====================================================================
-- Seventh Boar Development — Supabase schema, security rules and starter data
-- Paste this whole file into Supabase: Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run: uses "if not exists", "create or replace" and "drop policy if exists".
-- Your existing devlog entries, projects and comments are kept as they are.
--
-- Security model (what actually protects the site: the website code is just a UI):
--   * Row-level security on every table. The public can only READ published content, approved
--     comments and site settings. Nobody can write except an admin.
--   * An admin is a user listed in public.admins. Signing up does not make you an admin.
--   * Every change needs a fresh password confirmation, enforced HERE in the database:
--     confirm_password() checks the password and opens a short write window bound to that
--     exact login session. Without it, inserts / updates / deletes / uploads are refused.
--   * Authenticator-app (MFA) codes are required for admin access (security_settings).
--   * Wrong confirmation passwords are rate limited, and every change is written to an
--     append-only audit log that no one (not even an admin) can edit or delete.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Admin accounts + security settings
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
-- What this admin is called in the activity log. Falls back to the email.
alter table public.admins add column if not exists nickname text
  check (nickname is null or char_length(btrim(nickname)) between 1 and 40);

create table if not exists public.security_settings (
  id int primary key default 1 check (id = 1),
  require_mfa boolean not null default true,
  confirm_window_minutes int not null default 5 check (confirm_window_minutes between 1 and 30),
  max_failed_confirms int not null default 5 check (max_failed_confirms between 3 and 20)
);
-- Coming soon mode: the site is closed to the public until you open it. Admins still see everything,
-- and anyone with the preview link (preview_key) can look around.
alter table public.security_settings add column if not exists coming_soon boolean not null default false;
alter table public.security_settings add column if not exists preview_key text not null default replace(gen_random_uuid()::text, '-', '');
insert into public.security_settings (id) values (1) on conflict (id) do nothing;

-- One active write window per admin, tied to the session that confirmed the password.
create table if not exists public.admin_write_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid,
  expires_at timestamptz not null
);

create table if not exists public.admin_confirm_attempts (
  id bigserial primary key,
  user_id uuid not null,
  success boolean not null,
  at timestamptz not null default now()
);
create index if not exists admin_confirm_attempts_user_at_idx on public.admin_confirm_attempts (user_id, at desc);

-- Append-only record of every change.
create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid,
  email text,
  action text not null,
  entity text not null,
  entity_id text,
  summary text
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

-- ---------------------------------------------------------------------
-- Helper functions used by the security rules
-- ---------------------------------------------------------------------
-- Is the site closed to the public right now? Used by the read rules below.
create or replace function public.coming_soon() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select coming_soon from public.security_settings where id = 1), false);
$$;
grant execute on function public.coming_soon() to anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.mfa_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select not coalesce((select require_mfa from public.security_settings where id = 1), true)
      or coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

-- Admin who has passed MFA: may read drafts, the audit log, etc.
create or replace function public.admin_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() and public.mfa_ok();
$$;

-- Admin who has ALSO confirmed their password in the last few minutes, from this session.
create or replace function public.can_write() returns boolean
language sql stable security definer set search_path = public as $$
  select public.admin_ok() and exists (
    select 1 from public.admin_write_grants g
    where g.user_id = auth.uid()
      and g.expires_at > now()
      and g.session_id is not distinct from nullif(auth.jwt() ->> 'session_id', '')::uuid
  );
$$;

-- Checks the admin's password against Supabase Auth and opens a short write window.
-- Returns {ok:true, expires_at} or {ok:false, reason}. It never raises on a wrong password,
-- so failed attempts are recorded (an exception would roll the record back).
create or replace function public.confirm_password(password text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  hash text;
  fails int;
  cfg public.security_settings;
  exp timestamptz;
begin
  if uid is null or not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not_admin');
  end if;
  if not public.mfa_ok() then
    return jsonb_build_object('ok', false, 'reason', 'mfa_required');
  end if;

  select * into cfg from public.security_settings where id = 1;
  select count(*) into fails from public.admin_confirm_attempts
    where user_id = uid and not success and at > now() - interval '15 minutes';
  if fails >= cfg.max_failed_confirms then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;

  select encrypted_password into hash from auth.users where id = uid;
  if hash is null or password is null or extensions.crypt(password, hash) <> hash then
    insert into public.admin_confirm_attempts (user_id, success) values (uid, false);
    return jsonb_build_object('ok', false, 'reason', 'incorrect', 'remaining', cfg.max_failed_confirms - fails - 1);
  end if;

  insert into public.admin_confirm_attempts (user_id, success) values (uid, true);
  exp := now() + make_interval(mins => cfg.confirm_window_minutes);
  insert into public.admin_write_grants (user_id, session_id, expires_at)
  values (uid, nullif(auth.jwt() ->> 'session_id', '')::uuid, exp)
  on conflict (user_id) do update set session_id = excluded.session_id, expires_at = excluded.expires_at;
  return jsonb_build_object('ok', true, 'expires_at', exp);
end;
$$;

-- Closes the write window straight after a save, so it can't be reused.
create or replace function public.end_write_grant() returns void
language sql volatile security definer set search_path = public as $$
  delete from public.admin_write_grants where user_id = auth.uid();
$$;

-- The name to put in the activity log for whoever is signed in.
create or replace function public.actor_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(btrim((select nickname from public.admins where user_id = auth.uid())), ''),
                  auth.jwt() ->> 'email');
$$;
grant execute on function public.actor_name() to authenticated;

-- Set (or clear) your own nickname. Needs a confirmed password, like every other change.
create or replace function public.set_nickname(name text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare clean text := nullif(btrim(coalesce(name, '')), '');
begin
  if not public.can_write() then raise exception 'Not allowed. Confirm your password and try again.'; end if;
  if clean is not null and char_length(clean) > 40 then clean := left(clean, 40); end if;
  update public.admins set nickname = clean where user_id = auth.uid();
  if not found then raise exception 'Not an admin account.'; end if;
  insert into public.audit_log (user_id, email, action, entity, entity_id, summary)
  values (auth.uid(), coalesce(clean, auth.jwt() ->> 'email'), 'update', 'admins', auth.uid()::text,
          case when clean is null then 'Nickname cleared' else 'Nickname set to ' || clean end);
  return clean;
end $$;
revoke all on function public.set_nickname(text) from public, anon;
grant execute on function public.set_nickname(text) to authenticated;

-- Everyone's nickname, so the activity log can show names on older entries too. Admins only.
create or replace function public.admin_names() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_admin()
    then coalesce((select jsonb_object_agg(lower(email), nickname) from public.admins where nickname is not null), '{}'::jsonb)
    else '{}'::jsonb end;
$$;
revoke all on function public.admin_names() from public, anon;
grant execute on function public.admin_names() to authenticated;

-- Lets the login screen check whether an account is an admin and whether MFA is required.
create or replace function public.admin_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'is_admin', public.is_admin(),
    'require_mfa', coalesce((select require_mfa from public.security_settings where id = 1), true),
    'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'),
    'coming_soon', public.coming_soon(),
    'nickname', (select nickname from public.admins where user_id = auth.uid()),
    'preview_key', (select preview_key from public.security_settings where id = 1 and public.is_admin())
  );
$$;

-- Turn coming soon on/off, and make a fresh preview link. Both need a confirmed password.
create or replace function public.set_coming_soon(on_off boolean) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.can_write() then raise exception 'Not allowed. Confirm your password and try again.'; end if;
  update public.security_settings set coming_soon = on_off where id = 1;
  insert into public.audit_log (user_id, email, action, entity, entity_id, summary)
  values (auth.uid(), coalesce(public.actor_name(), 'Admin'), 'update', 'security_settings', '1',
          case when on_off then 'Coming soon: on' else 'Coming soon: off' end);
  return on_off;
end $$;

create or replace function public.new_preview_key() returns text
language plpgsql volatile security definer set search_path = public as $$
declare k text;
begin
  if not public.can_write() then raise exception 'Not allowed. Confirm your password and try again.'; end if;
  k := replace(gen_random_uuid()::text, '-', '');
  update public.security_settings set preview_key = k where id = 1;
  insert into public.audit_log (user_id, email, action, entity, entity_id, summary)
  values (auth.uid(), coalesce(public.actor_name(), 'Admin'), 'update', 'security_settings', '1', 'New preview link');
  return k;
end $$;

-- Does this preview key open the site while it's closed? Matched loosely on purpose: spaces,
-- capitals and any dashes a link picked up on the way (email, messages) shouldn't stop people getting in.
create or replace function public.preview_ok(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_key is not null and btrim(p_key) <> '' and exists (
    select 1 from public.security_settings s
    where s.id = 1 and lower(replace(btrim(s.preview_key), '-', '')) = lower(replace(btrim(p_key), '-', '')));
$$;

-- Validation helpers for check constraints (block javascript:/data: URLs and odd input).
create or replace function public.valid_asset_url(u text) returns boolean
language sql immutable as $$
  select u is null or u ~ '^(https://[A-Za-z0-9._~:/?#@!$&()*+,;=%-]+|/?assets/images/[A-Za-z0-9._-]+)$';
$$;
create or replace function public.valid_asset_urls(arr text[]) returns boolean
language sql immutable as $$
  select coalesce(bool_and(public.valid_asset_url(u)), true) and coalesce(array_length(arr, 1), 0) <= 12
  from unnest(arr) u;
$$;

-- Functions are callable by PUBLIC by default in Postgres: lock them down.
revoke all on function public.confirm_password(text) from public, anon;
revoke all on function public.end_write_grant() from public, anon;
revoke all on function public.admin_status() from public, anon;
revoke all on function public.set_coming_soon(boolean), public.new_preview_key() from public, anon;
grant execute on function public.confirm_password(text) to authenticated;
grant execute on function public.end_write_grant() to authenticated;
grant execute on function public.admin_status() to authenticated;
grant execute on function public.set_coming_soon(boolean), public.new_preview_key() to authenticated;
grant execute on function public.preview_ok(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Site settings: the editable homepage content (hero, ticker, sections, team, colours, footer...)
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
alter table public.site_settings drop constraint if exists site_settings_data_check;
alter table public.site_settings add constraint site_settings_data_check check (octet_length(data::text) < 100000);

-- ---------------------------------------------------------------------
-- Devlog entries + projects (the tables you already have, now with a draft / live switch)
-- ---------------------------------------------------------------------
create table if not exists public.journal_posts (
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
alter table public.journal_posts add column if not exists card_image_url text;
-- draft = only the admin sees it; published = public once published_at has passed (so a future
-- date means "scheduled").
alter table public.journal_posts add column if not exists status text not null default 'published';
-- Email the mailing list when this entry goes live (set in the editor). emailed_at is filled in by the
-- notify-posts function once it has been sent, so an entry is never emailed twice.
alter table public.journal_posts add column if not exists email_subscribers boolean not null default false;
alter table public.journal_posts add column if not exists emailed_at timestamptz;
alter table public.journal_posts drop constraint if exists journal_posts_status_check;
alter table public.journal_posts add constraint journal_posts_status_check check (status in ('draft', 'published'));

create table if not exists public.projects (
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
alter table public.projects add column if not exists client_logo_url text;
alter table public.projects add column if not exists client_links jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists card_banner_url text;
alter table public.projects add column if not exists status text not null default 'published';
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check check (status in ('draft', 'published'));

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null references public.journal_posts(slug) on delete cascade,
  author_name text not null,
  body text not null,
  likes integer not null default 0,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_slug_idx on public.comments (post_slug);

-- Newsletter sign-ups. They go in through the subscribe Edge Function (which rate-limits and sends the
-- welcome email), never straight from the browser, and visitors can never read the list.
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(email) <= 200),
  at timestamptz not null default now()
);
create unique index if not exists subscribers_email_idx on public.subscribers (lower(email));
-- For the emails: a private unsubscribe token per person, a hashed IP for rate limiting, and when the
-- welcome email went out. Only the Edge Functions (service key) ever touch these.
alter table public.subscribers add column if not exists unsub_token text not null default replace(gen_random_uuid()::text, '-', '');
alter table public.subscribers add column if not exists ip_hash text;
alter table public.subscribers add column if not exists welcomed_at timestamptz;
create unique index if not exists subscribers_token_idx on public.subscribers (unsub_token);
create index if not exists subscribers_ip_idx on public.subscribers (ip_hash, at desc);

-- ---------------------------------------------------------------------
-- Triggers: updated_at + audit log
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();

-- Visitors' own actions (a comment, a like, a sign-up) aren't admin changes, so they aren't logged.
create or replace function public.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  if auth.uid() is null then return null; end if;
  insert into public.audit_log (user_id, email, action, entity, entity_id, summary)
  values (auth.uid(), coalesce(public.actor_name(), 'Admin'), lower(tg_op), tg_table_name,
          coalesce(rec ->> 'id', rec ->> 'slug'),
          case tg_table_name when 'comments' then 'Comment by ' || left(coalesce(rec ->> 'author_name', ''), 60)
               when 'subscribers' then left(coalesce(rec ->> 'email', ''), 200)
               else left(coalesce(rec ->> 'title', rec ->> 'name', rec ->> 'slug', ''), 200) end);
  return null;
end;
$$;

drop trigger if exists journal_posts_audit on public.journal_posts;
create trigger journal_posts_audit after insert or update or delete on public.journal_posts for each row execute function public.log_change();
drop trigger if exists projects_audit on public.projects;
create trigger projects_audit after insert or update or delete on public.projects for each row execute function public.log_change();
drop trigger if exists comments_audit on public.comments;
create trigger comments_audit after update or delete on public.comments for each row execute function public.log_change();
drop trigger if exists site_settings_audit on public.site_settings;
create trigger site_settings_audit after update on public.site_settings for each row execute function public.log_change();
drop trigger if exists subscribers_audit on public.subscribers;
create trigger subscribers_audit after delete on public.subscribers for each row execute function public.log_change();

-- ---------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.security_settings enable row level security;
alter table public.admin_write_grants enable row level security;
alter table public.admin_confirm_attempts enable row level security;
alter table public.journal_posts enable row level security;
alter table public.projects enable row level security;
alter table public.comments enable row level security;
alter table public.subscribers enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_log enable row level security;

-- Belt and braces: the public role can never write to anything except through a policy below.
revoke update, delete, truncate on all tables in schema public from anon;
revoke all on public.admin_write_grants, public.admin_confirm_attempts from anon, authenticated;

drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins for select to authenticated using (user_id = auth.uid());

drop policy if exists security_settings_admin_read on public.security_settings;
create policy security_settings_admin_read on public.security_settings for select to authenticated using (public.is_admin());

-- devlog entries: the old "any logged-in user can write" rules are replaced
drop policy if exists "journal_posts_public_read" on public.journal_posts;
drop policy if exists "journal_posts_auth_write" on public.journal_posts;
drop policy if exists journal_posts_read on public.journal_posts;
create policy journal_posts_read on public.journal_posts for select to anon, authenticated
  using ((status = 'published' and published_at <= now() and not public.coming_soon()) or public.admin_ok());
drop policy if exists journal_posts_insert on public.journal_posts;
create policy journal_posts_insert on public.journal_posts for insert to authenticated with check (public.can_write());
drop policy if exists journal_posts_update on public.journal_posts;
create policy journal_posts_update on public.journal_posts for update to authenticated using (public.can_write()) with check (public.can_write());
drop policy if exists journal_posts_delete on public.journal_posts;
create policy journal_posts_delete on public.journal_posts for delete to authenticated using (public.can_write());

-- projects
drop policy if exists "projects_public_read" on public.projects;
drop policy if exists "projects_auth_write" on public.projects;
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to anon, authenticated
  using ((status = 'published' and published_at <= now() and not public.coming_soon()) or public.admin_ok());
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated with check (public.can_write());
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated using (public.can_write()) with check (public.can_write());
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated using (public.can_write());

-- comments: visitors see approved ones only and can only ever add an unapproved one
drop policy if exists "comments_public_read_approved" on public.comments;
drop policy if exists "comments_auth_read_all" on public.comments;
drop policy if exists "comments_public_insert" on public.comments;
drop policy if exists "comments_auth_update" on public.comments;
drop policy if exists "comments_auth_delete" on public.comments;
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select to anon, authenticated
  using ((approved = true and not public.coming_soon()) or public.admin_ok());
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to anon, authenticated
  with check (approved = false and likes = 0 and char_length(btrim(author_name)) between 1 and 60 and char_length(btrim(body)) between 1 and 1000);
drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments for update to authenticated using (public.can_write()) with check (public.can_write());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated using (public.can_write());

-- Likes go through this function instead of a direct column update, so a visitor can only ever
-- add exactly one: never set an arbitrary value, decrement, or edit anything else on the row.
create or replace function public.increment_comment_like(comment_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.comments set likes = likes + 1 where id = comment_id and approved = true;
$$;
grant execute on function public.increment_comment_like(uuid) to anon, authenticated;

-- subscribers: no direct access at all for visitors or admins. The subscribe function and these two
-- admin functions are the only way in.
drop policy if exists subscribers_insert on public.subscribers;
revoke all on public.subscribers from anon, authenticated;

-- What the admin sees: the list itself, and removing an address.
create or replace function public.subscriber_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.admin_ok() then coalesce((
    select jsonb_agg(jsonb_build_object('email', email, 'at', at) order by at desc)
    from (select email, at from public.subscribers order by at desc limit 5000) x), '[]'::jsonb)
  else '[]'::jsonb end;
$$;
create or replace function public.subscriber_remove(addr text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.can_write() then raise exception 'Not allowed. Confirm your password and try again.'; end if;
  delete from public.subscribers where lower(email) = lower(btrim(addr));
  return found;
end $$;
revoke all on function public.subscriber_list(), public.subscriber_remove(text) from public, anon;
grant execute on function public.subscriber_list(), public.subscriber_remove(text) to authenticated;

-- site settings: public to read (it is just the homepage wording), admin-only to change
drop policy if exists site_settings_read on public.site_settings;
create policy site_settings_read on public.site_settings for select to anon, authenticated using (true);
drop policy if exists site_settings_update on public.site_settings;
create policy site_settings_update on public.site_settings for update to authenticated using (public.can_write()) with check (public.can_write());

-- audit log: admins can read, nobody can write/edit/delete (only the triggers insert)
drop policy if exists audit_log_read on public.audit_log;
create policy audit_log_read on public.audit_log for select to authenticated using (public.admin_ok());
revoke insert, update, delete, truncate on public.audit_log from authenticated;

-- ---------------------------------------------------------------------
-- Everything a public page needs in ONE request. security definer, so it can honour the preview
-- key while the site is closed: visitors get only the "coming soon" wording; admins, and anyone
-- with the preview link, get the real site.
-- ---------------------------------------------------------------------
create or replace function public.site_data(p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  shut boolean := public.coming_soon();
  adm boolean := public.admin_ok();
  settings jsonb := (select data from public.site_settings where id = 1);
begin
  if shut and not adm and not public.preview_ok(p_key) then
    return jsonb_build_object('coming_soon', true, 'settings', jsonb_build_object(
      'comingSoon', coalesce(settings -> 'comingSoon', '{}'::jsonb),
      'theme', coalesce(settings -> 'theme', '{}'::jsonb),
      'socials', coalesce(settings -> 'socials', '[]'::jsonb)));
  end if;
  return jsonb_build_object(
    'coming_soon', shut,
    'settings', settings,
    'posts', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.published_at desc)
      from (select slug, title, category, excerpt, image_url, card_image_url, published_at, author
            from public.journal_posts
            where (status = 'published' and published_at <= now()) or adm
            order by published_at desc limit 300) x), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.published_at desc)
      from (select slug, title, categories, platforms, client, tagline, icon_url, banner_url, card_banner_url,
                   featured, published_at, client_logo_url, client_links
            from public.projects
            where (status = 'published' and published_at <= now()) or adm
            order by published_at desc limit 300) x), '[]'::jsonb)
  );
end $$;
grant execute on function public.site_data(text) to anon, authenticated;

-- One full entry or project (with its body) by slug, under the same rules.
create or replace function public.site_item(p_kind text, p_slug text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  adm boolean := public.admin_ok();
  r jsonb;
begin
  if public.coming_soon() and not adm and not public.preview_ok(p_key) then return null; end if;
  if p_kind = 'post' then
    select to_jsonb(j) into r from public.journal_posts j
     where j.slug = p_slug and (adm or (j.status = 'published' and j.published_at <= now()));
  elsif p_kind = 'project' then
    select to_jsonb(p) into r from public.projects p
     where p.slug = p_slug and (adm or (p.status = 'published' and p.published_at <= now()));
  end if;
  return r;
end $$;
grant execute on function public.site_item(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Image storage: public to view, only a password-confirmed admin can upload/delete.
-- Only jpg/png/webp/avif up to 8MB (no SVG: it can carry scripts). Existing images keep working.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "post_images_public_read" on storage.objects;
create policy "post_images_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'post-images');
drop policy if exists "post_images_auth_write" on storage.objects;
drop policy if exists post_images_insert on storage.objects;
create policy post_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and public.can_write()
              and name ~ '^(posts|projects|pages)/[a-z0-9-]+\.(jpg|png|webp|avif)$');
drop policy if exists "post_images_auth_delete" on storage.objects;
drop policy if exists post_images_delete on storage.objects;
create policy post_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and public.can_write());

-- ---------------------------------------------------------------------
-- If there is exactly ONE login in this project and no admins yet, make it the admin, so you
-- can sign in straight away. With more than one login, add the right one yourself (see below).
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.admins) and (select count(*) from auth.users) = 1 then
    insert into public.admins (user_id, email) select id, email from auth.users on conflict (user_id) do nothing;
  end if;
end $$;

-- =====================================================================
-- AFTER RUNNING THIS FILE:
-- 1. Authentication -> Sign In / Providers: turn OFF "Allow new users to sign up".
-- 2. Authentication -> Multi-Factor: make sure TOTP (authenticator app) is enabled.
-- 3. Check who can be an admin:   select id, email from auth.users;
--    If your account is not on the admin list yet, add it (change the email):
--      insert into public.admins (user_id, email)
--      select id, email from auth.users where email = 'you@example.com'
--      on conflict (user_id) do nothing;
-- 4. Sign in at /admin/login/ and scan the QR code with an authenticator app (Google
--    Authenticator, 1Password, Authy...). From then on every login asks for the 6-digit code.
-- =====================================================================
