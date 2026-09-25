// Seventh Boar — emails subscribers about new devlog entries.
//
// POST {slug}   — from the admin, right after saving an entry: emails that one entry (admins only,
//                 checked as the signed-in admin with their password window open).
// POST {}       — from the hourly GitHub Action (header x-cron-secret): emails every entry that has
//                 gone live since, which is how scheduled entries get announced.
//
// An entry is only ever emailed once (journal_posts.emailed_at), and only if "Email subscribers" was
// ticked on it, so old entries are never sent by accident.
//
// Deploy: supabase functions deploy notify-posts --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { clean, cors, env, json, originAllowed, serviceKey, siteUrl } from '../_shared/http.ts';
import { emailConfigured, loadAccent, newPostEmail, sendBatch } from '../_shared/email.ts';

const db = createClient(env('SUPABASE_URL'), serviceKey(), { auth: { persistSession: false } });
const unsubUrl = (token: string) => `${env('SUPABASE_URL')}/functions/v1/subscribe?unsub=${token}`;

async function note(summary: string) {
  try { await db.from('audit_log').insert({ email: 'System', action: 'update', entity: 'email', summary: summary.slice(0, 240) }); } catch { /* nicety */ }
}

// Only a signed-in admin who has just confirmed their password, checked as that admin (not with the
// service key), exactly like every other change on the site.
async function adminOk(req: Request) {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return false;
  const asUser = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false }, global: { headers: { Authorization: auth } },
  });
  const { data, error } = await asUser.rpc('can_write');
  return !error && data === true;
}

// Constant-time-ish comparison for the shared secret.
const sameSecret = (a: string, b: string) => a.length === b.length && a.split('').reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

Deno.serve(async req => {
  const headers = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);

  try {
    const cron = req.headers.get('x-cron-secret') || '';
    const isCron = !!Deno.env.get('CRON_SECRET') && !!cron && sameSecret(cron, Deno.env.get('CRON_SECRET')!);
    const b = await req.json().catch(() => ({}));
    const slug = clean(b.slug, 120);

    if (!isCron) {
      if (!originAllowed(req)) return json({ error: 'Not allowed' }, 403, headers);
      if (!slug) return json({ error: 'Say which entry.' }, 400, headers);
      if (!(await adminOk(req))) return json({ error: 'Not allowed. Confirm your password and try again.' }, 403, headers);
    }
    if (!emailConfigured()) return json({ error: 'Email isn\'t set up yet (RESEND_API_KEY / EMAIL_FROM).' }, 400, headers);

    // Entries that are live, asked for, and not yet sent.
    let q = db.from('journal_posts').select('slug, title, category, excerpt, image_url, card_image_url')
      .eq('status', 'published').eq('email_subscribers', true).is('emailed_at', null)
      .lte('published_at', new Date().toISOString());
    if (slug) q = q.eq('slug', slug);
    const { data: posts, error } = await q.limit(10);
    if (error) throw error;
    if (!posts?.length) return json({ ok: true, posts: 0, sent: 0 }, 200, headers);

    await loadAccent(db);
    const site = siteUrl();
    let total = 0, done = 0;
    for (const post of posts) {
      // Claim it first, so two runs at once can't both send it.
      const { data: claimed } = await db.from('journal_posts').update({ emailed_at: new Date().toISOString() })
        .eq('slug', post.slug).is('emailed_at', null).select('slug');
      if (!claimed?.length) continue;

      const { data: subs } = await db.from('subscribers').select('email, unsub_token').limit(5000);
      const mails = (subs ?? []).map(s => {
        const m = newPostEmail(site, unsubUrl(s.unsub_token), post);
        return { to: s.email, ...m, unsubUrl: unsubUrl(s.unsub_token) };
      });
      try {
        const sent = mails.length ? await sendBatch(mails) : 0;
        total += sent; done++;
        await note(`Emailed ${sent} subscriber${sent === 1 ? '' : 's'} about "${post.title}"`);
      } catch (err) {
        const sent = (err as { sent?: number }).sent ?? 0;
        total += sent;
        if (sent === 0) await db.from('journal_posts').update({ emailed_at: null }).eq('slug', post.slug);   // nothing went out: try again next time
        await note(`Email about "${post.title}" failed after ${sent}: ${String((err as Error).message).slice(0, 160)}`);
        if (!isCron) return json({ error: 'Some emails could not be sent. Check the activity log.', sent: total }, 502, headers);
      }
    }
    return json({ ok: true, posts: done, sent: total }, 200, headers);
  } catch (err) {
    console.error('notify-posts failed', err);
    return json({ error: 'Couldn\'t send the emails just now.' }, 502, headers);
  }
});
