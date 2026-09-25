// Sending email through Resend (resend.com). Optional: with no RESEND_API_KEY set, nothing is sent
// and the site carries on (sign-ups are still saved).
// The designs live in templates.js (shared with tools/email-preview.html).

import * as T from './templates.js';

export const emailConfigured = () => !!Deno.env.get('RESEND_API_KEY') && !!Deno.env.get('EMAIL_FROM');

// The accent colour picked in Admin -> Customise, so emails always match the site.
let accent = '#97292A';
export async function loadAccent(db: { from: (t: string) => any }) {
  try {
    const { data } = await db.from('site_settings').select('data').eq('id', 1).maybeSingle();
    const a = data?.data?.theme?.accent;
    if (/^#[0-9a-fA-F]{6}$/.test(a ?? '')) accent = a;
  } catch { /* keep the default */ }
}

export interface Mail { to: string; subject: string; html: string; text: string; unsubUrl: string }

// Every mail is bulk mail, so it carries a one-click unsubscribe: Gmail and Yahoo expect it from
// senders, and the law does too.
const payload = (m: Mail) => ({
  from: Deno.env.get('EMAIL_FROM'),
  to: [m.to],
  subject: m.subject,
  html: m.html,
  text: m.text,
  reply_to: Deno.env.get('REPLY_TO') || undefined,
  headers: { 'List-Unsubscribe': `<${m.unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
});

const headers = () => ({ Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' });

export async function sendEmail(m: Mail) {
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: headers(), body: JSON.stringify(payload(m)) });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

// Up to 100 emails per request. Returns how many went out. If a batch is refused part-way, the error
// carries how many had already gone (err.sent), so the caller never sends the same person twice.
export async function sendBatch(mails: Mail[]): Promise<number> {
  let sent = 0;
  try {
    for (let i = 0; i < mails.length; i += 100) {
      const chunk = mails.slice(i, i + 100);
      const res = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers: headers(), body: JSON.stringify(chunk.map(payload)) });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
      sent += chunk.length;
      await new Promise(r => setTimeout(r, 600));        // stay under Resend's rate limit
    }
  } catch (err) { throw Object.assign(err as Error, { sent }); }
  return sent;
}

export const welcomeEmail = (site: string, unsubUrl: string) => T.welcomeEmail({ site, unsubUrl, accent });
export const newPostEmail = (site: string, unsubUrl: string, post: Record<string, unknown>) => T.newPostEmail({ site, unsubUrl, accent, post });
