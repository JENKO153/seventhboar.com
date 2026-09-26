// Checks that a request comes from a signed-in admin who has just confirmed their password, as that
// admin (not with the service key), exactly like every other change on the site.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { env } from './http.ts';

export async function adminCheck(req: Request): Promise<{ ok: boolean; name: string }> {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return { ok: false, name: '' };
  const asUser = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false }, global: { headers: { Authorization: auth } },
  });
  const { data, error } = await asUser.rpc('can_write');
  if (error || data !== true) return { ok: false, name: '' };
  const { data: name } = await asUser.rpc('actor_name');
  return { ok: true, name: String(name || 'Admin') };
}
