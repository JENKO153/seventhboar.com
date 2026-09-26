// Seventh Boar — the project request form ("I'd like a website / an app").
//
// POST {kind, name, email, phone, company, current_site, budget, timeline, brief, links}
//   Saves the request, emails you a styled summary (with Accept / Decline buttons that open your admin),
//   and emails the customer a confirmation with their private tracking link.
//
// Spam protection: hidden honeypot field, 5 requests an hour per visitor, strict validation.
//
// Deploy: supabase functions deploy submit-request --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { clean, cors, env, json, originAllowed, serviceKey, siteUrl } from '../_shared/http.ts';
import { emailConfigured, loadAccent, requestAdminEmail, requestReceivedEmail, sendEmail } from '../_shared/email.ts';

const db = createClient(env('SUPABASE_URL'), serviceKey(), { auth: { persistSession: false } });
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const PER_HOUR = 5;
class Bad extends Error {}

async function noteEmailProblem(what: string, err: unknown) {
  console.error(what, err);
  try {
    await db.from('audit_log').insert({ email: 'System', action: 'update', entity: 'email', summary: `${what}: ${String((err as Error)?.message ?? err).slice(0, 200)}` });
  } catch { /* the log is a nicety, never a reason to fail the request */ }
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Free text keeps its line breaks but loses control characters.
const text = (v: unknown, max: number) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);

Deno.serve(async req => {
  const headers = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);
  if (!originAllowed(req)) return json({ error: 'Not allowed' }, 403, headers);

  try {
    const b = await req.json().catch(() => ({}));
    if (b.website) return json({ ok: true }, 200, headers);        // honeypot: bots fill hidden fields

    const kind = b.kind === 'app' ? 'app' : b.kind === 'website' ? 'website' : '';
    if (!kind) throw new Bad('Choose whether this is a website or an app.');
    const row = {
      kind,
      name: clean(b.name, 100),
      email: clean(b.email, 200).toLowerCase(),
      phone: clean(b.phone, 40),
      company: clean(b.company, 120),
      current_site: clean(b.current_site, 300),
      timeline: clean(b.timeline, 120),
      brief: text(b.brief, 4000),
      links: text(b.links, 1000),
    };
    if (!row.name) throw new Bad('Please add your name.');
    if (!EMAIL.test(row.email)) throw new Bad('That email address doesn\'t look right.');
    if (row.brief.length < 10) throw new Bad('Tell us a little about the project (at least a sentence).');

    const ip = req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    const ipHash = await sha256(ip + '|' + env('SUPABASE_URL'));
    const { count } = await db.from('requests').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gte('created_at', new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= PER_HOUR) return json({ error: 'Too many requests from here in the last hour. Please try again later.' }, 429, headers);

    const { data: saved, error } = await db.from('requests')
      .insert({ ...row, ip_hash: ipHash, history: [{ stage: 'received', at: new Date().toISOString(), note: '' }] })
      .select('id, number, access_key, kind, name, email, phone, company, current_site, budget, timeline, brief, links').single();
    if (error) throw error;

    const site = siteUrl();
    const trackUrl = `${site}/track/?o=${saved.number}&k=${saved.access_key}`;
    let emailed = false;
    if (emailConfigured()) {
      await loadAccent(db);
      // To you: the styled summary. Reply goes straight to the customer.
      try {
        const m = requestAdminEmail(site, saved);
        await sendEmail({ to: Deno.env.get('ADMIN_EMAIL') || 'Admin@seventhboar.com', ...m, replyTo: saved.email });
      } catch (err) { await noteEmailProblem(`Request SB-${saved.number}: email to you failed`, err); }
      // To the customer: confirmation + tracking link.
      try {
        const m = requestReceivedEmail(site, saved, trackUrl);
        await sendEmail({ to: saved.email, ...m });
        emailed = true;
      } catch (err) { await noteEmailProblem(`Request SB-${saved.number}: confirmation email failed`, err); }
    }
    return json({ ok: true, number: saved.number, key: saved.access_key, emailed }, 200, headers);
  } catch (err) {
    if (err instanceof Bad) return json({ error: err.message }, 400, headers);
    console.error('submit-request failed', err);
    return json({ error: 'Couldn\'t send your request just now. Please try again in a minute, or email Admin@seventhboar.com.' }, 502, headers);
  }
});
