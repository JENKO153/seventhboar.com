// Seventh Boar — changes a project request from the admin's Orders screen.
//
// POST {id, action: 'stage', stage, note?, email?}   moves it to a stage (accepted / declined / design /
//                                                    build / ... ), records it on the customer's tracker,
//                                                    and emails the customer (unless email is false).
// POST {id, action: 'notes', notes}                  saves your private notes (never shown to the customer).
//
// Admins only, and only right after confirming their password: checked as the signed-in admin.
//
// Deploy: supabase functions deploy request-update --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { adminCheck } from '../_shared/admin.ts';
import { clean, cors, env, json, originAllowed, serviceKey, siteUrl } from '../_shared/http.ts';
import { emailConfigured, loadAccent, requestUpdateEmail, sendEmail, STAGES } from '../_shared/email.ts';

const db = createClient(env('SUPABASE_URL'), serviceKey(), { auth: { persistSession: false } });
const text = (v: unknown, max: number) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);

async function note(summary: string, who: string) {
  try { await db.from('audit_log').insert({ email: who, action: 'update', entity: 'requests', summary: summary.slice(0, 240) }); } catch { /* nicety */ }
}

Deno.serve(async req => {
  const headers = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);
  if (!originAllowed(req)) return json({ error: 'Not allowed' }, 403, headers);

  try {
    const admin = await adminCheck(req);
    if (!admin.ok) return json({ error: 'Not allowed. Confirm your password and try again.' }, 403, headers);

    const b = await req.json().catch(() => ({}));
    const id = clean(b.id, 60);
    const { data: r } = await db.from('requests').select('*').eq('id', id).maybeSingle();
    if (!r) return json({ error: 'That request no longer exists.' }, 404, headers);

    if (b.action === 'notes') {
      const notes = text(b.notes, 4000);
      const { error } = await db.from('requests').update({ admin_notes: notes }).eq('id', id);
      if (error) throw error;
      await note(`SB-${r.number}: notes updated`, admin.name);
      return json({ ok: true }, 200, headers);
    }

    if (b.action !== 'stage') return json({ error: 'Unknown action.' }, 400, headers);
    const stage = clean(b.stage, 30);
    const allowed = [...(STAGES[r.kind as 'website' | 'app'] || []).map((s: { key: string }) => s.key), 'declined'];
    if (!allowed.includes(stage)) return json({ error: 'That stage isn\'t part of this kind of project.' }, 400, headers);

    const customerNote = text(b.note, 600);
    const history = [...(r.history || []), { stage, at: new Date().toISOString(), note: customerNote }];
    const patch: Record<string, unknown> = { stage, history };
    if ((stage === 'accepted' || stage === 'declined') && !r.decided_at) patch.decided_at = new Date().toISOString();
    const { error } = await db.from('requests').update(patch).eq('id', id);
    if (error) throw error;
    await note(`SB-${r.number}: ${stage}`, admin.name);

    // Tell the customer (unless told not to). The stage change is saved either way.
    let emailed = false, emailError = '';
    if (b.email !== false && stage !== 'received') {
      if (!emailConfigured()) emailError = 'Email isn\'t set up yet, so the customer was not emailed.';
      else {
        try {
          await loadAccent(db);
          const site = siteUrl();
          const m = requestUpdateEmail(site, r, stage, customerNote, `${site}/track/?o=${r.number}&k=${r.access_key}`);
          await sendEmail({ to: r.email, ...m });
          emailed = true;
        } catch (err) {
          emailError = 'Saved, but the email to the customer could not be sent.';
          await note(`SB-${r.number}: email to customer failed: ${String((err as Error).message).slice(0, 160)}`, 'System');
        }
      }
    }
    return json({ ok: true, history, emailed, emailError }, 200, headers);
  } catch (err) {
    console.error('request-update failed', err);
    return json({ error: 'Couldn\'t update that request just now.' }, 502, headers);
  }
});
