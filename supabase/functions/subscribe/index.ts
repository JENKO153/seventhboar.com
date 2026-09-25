// Seventh Boar — the mailing list.
//
// POST {email}          — adds someone to the list and sends them a short "you're on the list" email.
// GET  ?unsub=<token>   — the unsubscribe link in every email. Removes them and says so in plain HTML.
//
// Spam protection: hidden honeypot field, 10 sign-ups an hour per address, strict validation.
//
// Deploy: supabase functions deploy subscribe --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { clean, cors, env, json, originAllowed, serviceKey, siteUrl } from '../_shared/http.ts';
import { emailConfigured, loadAccent, sendEmail, welcomeEmail } from '../_shared/email.ts';

const db = createClient(env('SUPABASE_URL'), serviceKey(), { auth: { persistSession: false } });
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const PER_HOUR = 10;
class Bad extends Error {}

// A failed email is easy to miss, so it goes in the admin's activity log with the reason.
async function noteEmailProblem(what: string, err: unknown) {
  console.error(what, err);
  try {
    await db.from('audit_log').insert({
      email: 'System', action: 'update', entity: 'email',
      summary: `${what}: ${String((err as Error)?.message ?? err).slice(0, 200)}`,
    });
  } catch { /* the log is a nicety, never a reason to fail the request */ }
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export const unsubUrl = (token: string) => `${env('SUPABASE_URL')}/functions/v1/subscribe?unsub=${token}`;

const page = (title: string, line: string) => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
   <title>${title} — Seventh Boar Development</title>
   <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0A0A0A;color:#F2F2EE;
                font:400 16px/1.6 system-ui,sans-serif;text-align:center;padding:40px">
     <div><h1 style="font:700 28px/1.2 system-ui;margin:0 0 10px">${title}</h1>
     <p style="margin:0;color:#8E8E88">${line}</p></div>`,
  { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

Deno.serve(async req => {
  const headers = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers });

  // Unsubscribe link from an email: a plain page, no site needed.
  const token = new URL(req.url).searchParams.get('unsub');
  if (req.method === 'GET' && token) {
    if (!/^[a-f0-9]{32}$/i.test(token)) return page('Link not recognised', 'Check the link in your email, or reply to us and we\'ll take you off.');
    await db.from('subscribers').delete().eq('unsub_token', token);
    return page('You\'re unsubscribed', 'You won\'t get any more emails from us.');
  }
  // One-click unsubscribe (Gmail / Yahoo) posts to the same address.
  if (req.method === 'POST' && token) {
    if (/^[a-f0-9]{32}$/i.test(token)) await db.from('subscribers').delete().eq('unsub_token', token);
    return new Response('ok', { status: 200 });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);
  if (!originAllowed(req)) return json({ error: 'Not allowed' }, 403, headers);

  try {
    const b = await req.json().catch(() => ({}));
    if (b.website) return json({ ok: true }, 200, headers);   // honeypot: bots fill hidden fields
    const email = clean(b.email, 200).toLowerCase();
    if (!EMAIL.test(email)) throw new Bad('That email address doesn\'t look right.');

    const ip = req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    const ipHash = await sha256(ip + '|' + env('SUPABASE_URL'));
    const { count } = await db.from('subscribers').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gte('at', new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= PER_HOUR) return json({ error: 'Too many sign-ups from here in the last hour. Try again later.' }, 429, headers);

    const { data: existing } = await db.from('subscribers').select('id').eq('email', email).maybeSingle();
    if (existing) return json({ ok: true, already: true }, 200, headers);   // no second welcome email

    const { data: row, error } = await db.from('subscribers').insert({ email, ip_hash: ipHash }).select('id, unsub_token').single();
    if (error) {
      if (error.code === '23505') return json({ ok: true, already: true }, 200, headers);  // added a moment ago
      throw error;
    }
    let emailed = false;
    if (emailConfigured()) {
      try {
        await loadAccent(db);
        const m = welcomeEmail(siteUrl(), unsubUrl(row.unsub_token));
        await sendEmail({ to: email, ...m, unsubUrl: unsubUrl(row.unsub_token) });
        await db.from('subscribers').update({ welcomed_at: new Date().toISOString() }).eq('id', row.id);
        emailed = true;
      } catch (err) { await noteEmailProblem('Welcome email failed', err); }   // they're on the list either way
    }
    return json({ ok: true, emailed }, 200, headers);
  } catch (err) {
    if (err instanceof Bad) return json({ error: err.message }, 400, headers);
    console.error('subscribe failed', err);
    return json({ error: 'Couldn\'t add you just now. Please try again in a minute.' }, 502, headers);
  }
});
