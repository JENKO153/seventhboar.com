# Seventh Boar — setup and admin guide

The site is static (GitHub Pages) with a Supabase backend. Public pages read content from
Supabase; the admin at `/admin/` changes it.

## One-time upgrade (do this after publishing the new site)

The new admin uses a stricter security setup (two-factor login, a password check on every
change, an activity log, editable homepage content, newsletter sign-ups). Until the database
has it, the **public site keeps working** with default wording, but the **admin will say the
database needs its upgrade**.

1. Open Supabase → **SQL Editor** → **New query**, paste all of `supabase/schema.sql`, press **Run**.
   It is safe to run more than once, and it keeps your existing devlog entries, projects and comments.
2. Supabase → **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
3. Supabase → **Authentication → Multi-Factor**: make sure **TOTP** (authenticator app) is enabled.
4. If you have more than one login in the project, the SQL will not guess which is the admin.
   Check who exists and add yours:
   ```sql
   select id, email from auth.users;
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'you@example.com'
   on conflict (user_id) do nothing;
   ```
   (With exactly one login, the SQL adds it automatically.)
5. Go to `/admin/login/`, sign in, and scan the QR code with an authenticator app
   (Google Authenticator, 1Password, Authy…). From then on every login asks for the 6-digit code.

## What's in the admin

| Section | What it does |
| --- | --- |
| Overview | Counts, things that need attention, recent activity |
| Projects | Add/edit portfolio projects: types, tags, photos with a card crop, app icon, client card, brief builder |
| Devlog | Write/edit entries with the block builder (titles, paragraphs, bullets, photos), draft / live / scheduled |
| Comments | Approve or delete visitors' comments |
| Subscribers | Newsletter sign-ups (download CSV) |
| Team & clients | People, client quotes, photo strip, social links |
| Homepage & settings | Hero, ticker, section wording, spec table, call-to-action, footer, countdown, **Coming soon mode** |
| Customise | The accent colour for the whole site |
| Security & activity | Your account, sign out everywhere, the change log |

Every change asks for your password (checked by the database, not just the page), and every
editor has a **live preview**: the real page, showing your unsaved edits.

## Trying the admin without touching the database

On your own computer only: run `python3 -m http.server 8000` in this folder, open
`http://localhost:8000/admin/login/?demo=1` and sign in with `admin@demo.local` / `demo`.
Everything is sample data stored in that browser. Add `?demo=0` to any address to leave demo mode.
This can never switch on for visitors of the real site.

## Notes

- **Coming soon mode** (Homepage & settings) closes the site to everyone except you and anyone
  holding the preview link. The database holds the content back, so it isn't just hidden on the page.
- **Drafts and scheduled items** are hidden by the database. A future publish date means "scheduled".
- **Photos** are re-encoded on upload (strips hidden data). New uploads go to `posts/`, `projects/`
  and `pages/` in the `post-images` bucket; older images keep working.
- **Optional bot check on login:** turn on Captcha (Turnstile) in Supabase → Authentication → Attack
  Protection, then put the *site key* in `assets/js/config.js` (`captcha.siteKey`).
- **Newsletter:** sign-ups land in *Subscribers*. To email them automatically, point your newsletter
  tool at `/devlog/feed.xml` (the RSS feed is refreshed hourly by `.github/workflows/update-feed.yml`).
- The admin logs out after 15 minutes idle (`adminIdleMinutes` in `assets/js/config.js`).
