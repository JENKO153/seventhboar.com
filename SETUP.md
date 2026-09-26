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
| Orders | Website and app requests: accept or decline, move through the stages, email the customer, private notes |
| Subscribers | Newsletter sign-ups (download CSV); they get a welcome email and new-entry emails (see Emails) |
| Team & clients | People, client quotes, photo strip, social links |
| Homepage & settings | Hero, **services**, section wording, spec table, call-to-action, footer, countdown, **Coming soon mode** |
| Customise | The accent colour for the whole site |
| Security & activity | Your account, sign out everywhere, the change log |

Every change asks for your password (checked by the database, not just the page), and every
editor has a **live preview**: the real page, showing your unsaved edits.

## Emails (Resend): welcome email + "new devlog entry" emails

Subscribers get a welcome email when they sign up, and an email whenever you publish a devlog entry
(if "Email subscribers when this goes live" is ticked on it, which is the default for new entries).
Every email carries an unsubscribe link. Emails go out through [Resend](https://resend.com) using two
Supabase Edge Functions (`supabase/functions/subscribe` and `supabase/functions/notify-posts`).
Until this is set up, sign-ups say "not switched on yet" and nothing is emailed; the rest of the site is unaffected.

1. **Resend:** sign up (free: 3,000 emails a month, 100 a day). **Domains → Add domain** → `seventhboar.com`,
   add the DNS records it shows at your domain registrar, and wait for **Verified**. Create an **API key** (Sending access).
2. **Supabase CLI** (once): install it, then in this folder run
   ```bash
   supabase login
   supabase link --project-ref jkougveywojjypwcjbmi
   ```
3. **Secrets** (use your own key and sending address):
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx "EMAIL_FROM=Seventh Boar <news@seventhboar.com>" REPLY_TO=Admin@seventhboar.com SITE_URL=https://seventhboar.com
   supabase secrets set ALLOWED_ORIGINS=https://www.seventhboar.com   # only if the site is also served on www
   ```
4. **Deploy the functions:**
   ```bash
   supabase functions deploy subscribe --no-verify-jwt
   supabase functions deploy notify-posts --no-verify-jwt
   ```
5. **Re-run `supabase/schema.sql`** in the SQL Editor (it adds the unsubscribe and email columns).
6. Test: sign up on the homepage with your own address, then save a Live devlog entry and check the
   Subscribers page and the activity log ("Emailed N subscribers…"). `tools/email-preview.html` shows both emails.

**Scheduled entries:** an entry scheduled for later is emailed at its publish time by the hourly GitHub Action.
To switch that on, add two repository secrets (GitHub → Settings → Secrets and variables → Actions):
`NOTIFY_URL` = `https://jkougveywojjypwcjbmi.supabase.co/functions/v1/notify-posts` and `CRON_SECRET` = a long random
string, and set the same string in Supabase: `supabase secrets set CRON_SECRET=that-string`.

An entry is only ever emailed once, and entries written before this was set up are never emailed.

## Project requests and the Orders tracker

`/request/` is the form for website and app requests. When someone sends one:
1. it is saved, and **you get a styled email at Admin@seventhboar.com** with the details and **Accept / Decline** buttons (they open that request in your admin, where you sign in and confirm your password before anything changes; replying to the email replies to the customer);
2. the customer gets a confirmation email with a **private tracking link** (`/track/?o=1004&k=…`, no account needed, hidden from search engines).

In the admin, **Orders** lists every request. Open one to accept or decline it, move it through the stages (websites: Received → Accepted → Design → Build → Review → Launched; apps: Received → Accepted → Planning → Development → Testing → Released), add a message for the customer, and keep private notes. Each change updates the customer's tracker and emails them (untick "Email the customer" to skip). Change the stage names in `assets/js/data.js` **and** `supabase/functions/_shared/templates.js`.

**Pricing guide:** in the admin, **Homepage & settings → Pricing guide**, add your tiers (name, price, what's included, and whether each applies to websites, apps or both). They show on the Services page and are included in the customer's confirmation email as a styled pricing guide. Until you add a tier, neither shows. The form doesn't ask for a budget.

To switch it on (after the Emails steps above), deploy the two extra functions:
```bash
supabase functions deploy submit-request --no-verify-jwt
supabase functions deploy request-update --no-verify-jwt
```
and re-run `supabase/schema.sql` (it adds the requests table). Project emails (the notification to you, the customer's confirmation and progress updates) are sent from their own address: `supabase secrets set "ORDERS_EMAIL_FROM=Seventh Boar Orders <orders@seventhboar.com>"`, while the mailing list keeps using `EMAIL_FROM` (news@). To send the notification to a different inbox, `supabase secrets set ADMIN_EMAIL=someone@example.com`. `tools/email-preview.html` shows all the emails.

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
