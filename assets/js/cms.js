/*
 * Seventh Boar Development — content + auth layer, shared by the public site and the admin.
 *
 * Two backends with the same interface:
 *   - Supabase: the real thing. Row-level security in supabase/schema.sql decides what anyone
 *     can read or write; this file is only a client.
 *   - Demo (localhost only, opt in with ?demo=1): everything lives in this browser's
 *     localStorage so the site and admin can be tried without touching the database.
 *
 * Shapes used everywhere:
 *   post    { id (slug), title, category, excerpt, image, cardImage, date, author, content[], status }
 *   project { id (slug), title, categories[], platforms[], client, tagline, icon, banner, cardBanner,
 *             brief[], featured, date, clientLogo, clientLinks[], status }
 *   comment { id, postSlug, author, body, likes, approved, date }
 */
(function (window) {
  const cfg = window.SB_CONFIG;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let demoOn = false;
  try {
    if (local) {
      const q = new URLSearchParams(location.search).get('demo');
      if (q === '1') localStorage.setItem('sb_demo', '1');
      if (q === '0') localStorage.removeItem('sb_demo');
      demoOn = localStorage.getItem('sb_demo') === '1';
    }
  } catch { /* storage blocked */ }
  const configured = !!(window.supabase && cfg.supabaseUrl && cfg.supabaseKey);

  /* ---------- small shared helpers ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  // Every piece of stored text goes through this before it touches innerHTML.
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);
  const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
  const clone = v => JSON.parse(JSON.stringify(v));
  // Saved settings on top of the defaults, section by section. Lists (team, reports, photos)
  // are taken as-is when saved, so deleting every person really does leave none.
  const isPlain = v => v && typeof v === 'object' && !Array.isArray(v);
  const deepMerge = (base, over) => {
    const out = { ...base };
    for (const [k, v] of Object.entries(over || {})) out[k] = isPlain(v) && isPlain(base[k]) ? deepMerge(base[k], v) : v;
    return out;
  };
  const mergeSettings = data => deepMerge(clone(DEFAULT_SETTINGS), data || {});

  // Resize to max 1800px and re-encode as WebP. Re-encoding strips EXIF (GPS etc.) and anything
  // smuggled inside the file, and keeps photos small so the site loads fast.
  // iPhone HEIC photos work where the browser can read them (Safari); elsewhere we say so clearly.
  const isHeic = file => /^image\/hei[cf]$/.test(file.type) || (!file.type && /\.hei[cf]$/i.test(file.name || ''));
  const imageOk = file => /^image\/(jpeg|png|webp|avif)$/.test(file.type) || isHeic(file);
  async function processImage(file, maxSize = 1800, quality = 0.84) {
    if (!imageOk(file)) throw new Error('Photos must be JPG, PNG, WebP, AVIF or iPhone HEIC');
    if (file.size > 25 * 1024 * 1024) throw new Error('Photo is over 25MB');
    let bitmap;
    try { bitmap = await createImageBitmap(file); }
    catch {
      throw new Error(isHeic(file)
        ? `${file.name}: this browser can't open iPhone HEIC photos. Use Safari, or set your iPhone to "Most Compatible" (Settings → Camera → Formats) and re-export.`
        : `${file.name || 'That photo'} couldn't be opened. Try saving it again as a JPG.`);
    }
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const encode = type => new Promise(r => canvas.toBlob(r, type, quality));
    // WebP where the browser can make it; some Safari versions can't (they hand back a PNG), so use JPEG there.
    let blob = await encode('image/webp');
    if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg');
    if (!blob) throw new Error('Could not process that photo');
    return blob;
  }
  const dataUrlToBlob = dataUrl => {
    const [head, b64] = dataUrl.split(',');
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return new Blob([bytes], { type: head.match(/:(.*?);/)[1] });
  };

  // Reads that stall: if there's no answer after 1.5s, ask again (and a third time at 4s), then
  // take whichever reply comes first. Supabase sometimes sits on one request for several seconds
  // while an identical one straight after is instant. Only used for reads, so repeats are harmless.
  function hedged(run, waves = [1500, 4000]) {
    return new Promise((resolve, reject) => {
      let settled = false, running = 0, failures = 0;
      const attempt = () => {
        running++;
        run().then(
          value => { if (!settled) { settled = true; resolve(value); } },
          err => { if (++failures >= running && !settled) { settled = true; reject(err); } });
      };
      attempt();
      waves.forEach(ms => setTimeout(() => { if (!settled) attempt(); }, ms));
    });
  }

  // While "coming soon" is on, a preview link (?key=…) lets the admin and anyone they send it to
  // look around the real site. The key is remembered for the rest of the visit.
  function previewKey() {
    const clean = v => (String(v || '').trim().match(/[A-Za-z0-9._-]{6,64}/) || [''])[0];
    try {
      const fromUrl = clean(new URLSearchParams(location.search).get('key') || new URLSearchParams(location.hash.slice(1)).get('key'));
      if (fromUrl) sessionStorage.setItem('sb_preview_key', fromUrl);
      return fromUrl || clean(sessionStorage.getItem('sb_preview_key'));
    } catch { return ''; }
  }
  // Did THIS page address carry a preview key? (So the closed page only explains a link that was
  // actually used. An ordinary visitor, or a leftover key from an earlier visit, gets no message.)
  const previewKeyTried = () => {
    const get = q => new URLSearchParams(q).get('key');
    return !!(get(location.search.slice(1)) || get(location.hash.slice(1)) || '').trim();
  };
  const forgetPreviewKey = () => { try { sessionStorage.removeItem('sb_preview_key'); } catch { /* ignore */ } };

  /* ---------- row <-> item conversion ---------- */
  const POST_LIST_COLS = 'slug,title,category,excerpt,image_url,card_image_url,published_at,author';
  const PROJECT_LIST_COLS = 'slug,title,categories,platforms,client,tagline,icon_url,banner_url,card_banner_url,featured,published_at,client_logo_url,client_links';
  const toPost = r => ({
    id: r.slug, title: r.title, category: r.category, excerpt: r.excerpt, image: r.image_url, cardImage: r.card_image_url || null,
    date: r.published_at, author: r.author || 'Seventh Boar', content: r.content || [], status: r.status || 'published',
    emailSubscribers: !!r.email_subscribers, emailedAt: r.emailed_at || null,
  });
  const toProject = r => ({
    id: r.slug, title: r.title, categories: r.categories || [], platforms: r.platforms || [], client: r.client || null, tagline: r.tagline,
    icon: r.icon_url || null, banner: r.banner_url, cardBanner: r.card_banner_url || null, brief: r.brief || [], featured: !!r.featured,
    date: r.published_at, clientLogo: r.client_logo_url || null, clientLinks: r.client_links || [], status: r.status || 'published',
  });
  const toRequest = r => ({
    id: r.id, number: r.number, kind: r.kind, stage: r.stage, name: r.name, email: r.email, phone: r.phone || '', company: r.company || '',
    currentSite: r.current_site || '', budget: r.budget || '', timeline: r.timeline || '', brief: r.brief, links: r.links || '',
    accessKey: r.access_key, adminNotes: r.admin_notes || '', history: r.history || [],
    createdAt: r.created_at, updatedAt: r.updated_at, decidedAt: r.decided_at || null,
  });
  const toComment = r => ({ id: r.id, postSlug: r.post_slug, author: r.author_name, body: r.body, likes: r.likes || 0, approved: !!r.approved, date: r.created_at });
  const postRow = p => ({
    slug: p.id, title: p.title, category: p.category, excerpt: p.excerpt, image_url: p.image, card_image_url: p.cardImage || null,
    content: p.content || [], author: p.author || 'Seventh Boar', published_at: p.date, status: p.status || 'published',
    email_subscribers: !!p.emailSubscribers,
    // only ever passed back once set: the notify-posts function owns this column
    ...(p.emailedAt ? { emailed_at: p.emailedAt } : {}),
  });
  const projectRow = p => ({
    slug: p.id, title: p.title, categories: p.categories || [], platforms: p.platforms || [], client: p.client || null, tagline: p.tagline,
    icon_url: p.icon || null, banner_url: p.banner, card_banner_url: p.cardBanner || null, brief: p.brief || [], featured: !!p.featured,
    published_at: p.date, client_logo_url: p.clientLogo || null, client_links: p.clientLinks || [], status: p.status || 'published',
  });
  const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

  /* =====================================================================
     Supabase backend
     ===================================================================== */
  function supabaseBackend() {
    let adminClient, publicClient;
    // The admin session lives in sessionStorage: closing the browser logs out.
    const admin = () => adminClient ||= window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    // Visitors never log in.
    const pub = () => publicClient ||= window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Row-level security refuses an update or delete by changing 0 rows, not by erroring.
    // Treat that as the refusal it is, so the admin never says "saved" when nothing was.
    const changed = (data, error, fallback) => {
      fail(error, fallback);
      if (!data?.length) throw new Error('Not saved: the database refused the change. Confirm your password and try again.');
    };
    const fail = (error, fallback) => {
      if (!error) return;
      console.error(error);
      // PGRST202: the database hasn't got this function yet, i.e. schema.sql needs re-running.
      if (error.code === 'PGRST202') {
        throw new Error('Your database is missing this feature. Open Supabase → SQL Editor, paste the latest supabase/schema.sql and press Run.');
      }
      const denied = error.code === '42501' || /row-level security|permission denied/i.test(error.message || '');
      throw new Error(denied ? 'Not allowed. Confirm your password and try again.' : fallback || error.message);
    };
    const missingFn = e => e?.code === 'PGRST202' || e?.code === '42883' || /could not find the function/i.test(e?.message || '');
    const missingTable = e => e?.code === '42P01' || e?.code === 'PGRST205' || /could not find the table|does not exist/i.test(e?.message || '');

    // One request for everything a public page needs (site_data() in schema.sql). If the database
    // hasn't got that function yet, fall back to plain table reads so the site keeps working.
    async function load(client) {
      try {
        const d = await hedged(async () => {
          const { data, error } = await client.rpc('site_data', { p_key: previewKey() });
          if (error) throw error;
          return data;
        });
        // "locked" means the database held the site back. When the preview key (or an admin
        // login) let us through, the real site comes back even if it's still empty.
        if (!d.posts) return { locked: true, comingSoon: true, settings: mergeSettings(d.settings), posts: [], projects: [] };
        return {
          locked: false, comingSoon: !!d.coming_soon, settings: mergeSettings(d.settings),
          posts: (d.posts || []).map(toPost).sort(byDateDesc), projects: (d.projects || []).map(toProject).sort(byDateDesc),
        };
      } catch (err) {
        if (!missingFn(err)) console.warn('site_data failed, loading the slow way', err);
      }
      const now = new Date().toISOString();
      const read = q => hedged(() => q().then(r => r));
      const [p, pr, s] = await Promise.all([
        read(() => client.from('journal_posts').select(POST_LIST_COLS).lte('published_at', now).order('published_at', { ascending: false })),
        read(() => client.from('projects').select(PROJECT_LIST_COLS).lte('published_at', now).order('published_at', { ascending: false })),
        read(() => client.from('site_settings').select('data').eq('id', 1).maybeSingle()),
      ]);
      fail(p.error, 'Could not load the devlog'); fail(pr.error, 'Could not load projects');
      // settings are optional: a missing table (schema not re-run yet) just means the defaults
      return { locked: false, comingSoon: false, settings: mergeSettings(s.error ? null : s.data?.data), posts: p.data.map(toPost), projects: pr.data.map(toProject) };
    }

    // One full item (with its body) by slug.
    async function loadItem(client, kind, slug) {
      try {
        const { data, error } = await hedged(() => client.rpc('site_item', { p_kind: kind, p_slug: slug, p_key: previewKey() }).then(r => r));
        if (error) throw error;
        if (!data) return null;
        return kind === 'post' ? toPost(data) : toProject(data);
      } catch (err) {
        if (!missingFn(err)) console.warn('site_item failed, reading the table directly', err);
      }
      const table = kind === 'post' ? 'journal_posts' : 'projects';
      const { data, error } = await hedged(() => client.from(table).select('*').eq('slug', slug).lte('published_at', new Date().toISOString()).maybeSingle().then(r => r));
      if (error || !data) return null;
      return kind === 'post' ? toPost(data) : toProject(data);
    }

    const bucketPath = url => {
      const marker = '/storage/v1/object/public/post-images/';
      const i = String(url).indexOf(marker);
      return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
    };

    return {
      mode: 'supabase',
      loadPublic: () => load(pub()),
      getPost: slug => loadItem(pub(), 'post', slug),
      getProject: slug => loadItem(pub(), 'project', slug),
      // Just the accent colour, for pages that don't load the whole site (the admin login).
      async loadAccent() {
        const { data } = await hedged(() => pub().from('site_settings').select('data').eq('id', 1).maybeSingle().then(r => r));
        return data?.data?.theme?.accent || null;
      },

      // Comments: visitors only ever see approved ones; new ones always land unapproved.
      async getComments(postSlug) {
        const { data, error } = await hedged(() => pub().from('comments').select('*').eq('post_slug', postSlug).eq('approved', true).order('created_at', { ascending: true }).then(r => r));
        if (error) throw error;
        return data.map(toComment);
      },
      async submitComment(postSlug, author, body) {
        const { error } = await pub().from('comments').insert({ post_slug: postSlug, author_name: author, body, approved: false, likes: 0 });
        if (error) throw error;
      },
      async likeComment(id) {
        const { error } = await pub().rpc('increment_comment_like', { comment_id: id });
        if (error) throw error;
      },

      // Newsletter sign-up goes through the subscribe Edge Function: it rate-limits, saves the address and
      // sends the welcome email. Visitors can add an address but never read the list.
      async subscribe(email, website = '') {
        let res, body;
        try {
          res = await fetch(`${cfg.supabaseUrl}/functions/v1/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseKey },
            body: JSON.stringify({ email, website }),
          });
          body = await res.json().catch(() => ({}));
        } catch { throw new Error('Couldn\'t reach the sign-up service. Check your connection and try again.'); }
        if (res.status === 404) throw new Error('Sign-ups are not switched on yet.');
        if (!res.ok) throw new Error(body?.error || 'Couldn\'t add you just now. Please try again in a minute.');
        return body || { ok: true };
      },
      // Emails the mailing list about one entry that has just gone live. Runs inside the password window,
      // as the signed-in admin; the function checks that itself.
      async notifyPosts(slug) {
        const { data: { session } } = await admin().auth.getSession();
        let res, body;
        try {
          res = await fetch(`${cfg.supabaseUrl}/functions/v1/notify-posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseKey, Authorization: `Bearer ${session?.access_token || cfg.supabaseKey}` },
            body: JSON.stringify({ slug }),
          });
          body = await res.json().catch(() => ({}));
        } catch { throw new Error('Couldn\'t reach the email service.'); }
        if (res.status === 404) throw new Error('The email function isn\'t deployed yet (see SETUP.md, Emails).');
        if (!res.ok) throw new Error(body?.error || 'The emails could not be sent.');
        return body;
      },

      // Project requests: the public form, the customer's private tracker, and the admin's Orders screen.
      async submitRequest(fields) {
        let res, body;
        try {
          res = await fetch(`${cfg.supabaseUrl}/functions/v1/submit-request`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseKey }, body: JSON.stringify(fields),
          });
          body = await res.json().catch(() => ({}));
        } catch { throw new Error('Couldn\'t reach the request service. Check your connection and try again.'); }
        if (res.status === 404) throw new Error('The request form isn\'t switched on yet. Please email Admin@seventhboar.com.');
        if (!res.ok) throw new Error(body?.error || 'Couldn\'t send your request just now. Please try again in a minute.');
        return body;
      },
      async getRequestStatus(number, key) {
        const { data, error } = await hedged(() => pub().rpc('request_status', { p_number: number, p_key: key }).then(r => r));
        if (error) throw new Error(missingFn(error) ? 'Tracking isn\'t switched on yet.' : 'Could not load this request. Please try again in a moment.');
        return data; // null when the link is wrong
      },
      async loadRequests() {
        const { data, error } = await hedged(() => admin().from('requests').select('*').order('created_at', { ascending: false }).limit(500).then(r => r));
        if (error) { if (missingTable(error)) return []; fail(error, 'Could not load requests'); }
        return data.map(toRequest);
      },
      // Moves a request to a stage and (unless email is false) emails the customer. Runs inside the password window.
      async updateRequest(id, { stage, note = '', email = true }) {
        return this._requestCall({ id, action: 'stage', stage, note, email });
      },
      saveRequestNotes(id, notes) { return this._requestCall({ id, action: 'notes', notes }); },
      async _requestCall(payload) {
        const { data: { session } } = await admin().auth.getSession();
        let res, body;
        try {
          res = await fetch(`${cfg.supabaseUrl}/functions/v1/request-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseKey, Authorization: `Bearer ${session?.access_token || cfg.supabaseKey}` },
            body: JSON.stringify(payload),
          });
          body = await res.json().catch(() => ({}));
        } catch { throw new Error('Couldn\'t reach the request service.'); }
        if (res.status === 404 && !body?.error) throw new Error('The request-update function isn\'t deployed yet (see SETUP.md, Requests).');
        if (!res.ok) throw new Error(body?.error || 'The request could not be updated.');
        return body;
      },
      async deleteRequest(id) {
        const { data, error } = await admin().from('requests').delete().eq('id', id).select('id');
        changed(data, error);
      },

      /* ---- auth ---- */
      async login(email, password, captchaToken) {
        const sb = admin();
        const { error } = await sb.auth.signInWithPassword({ email, password, options: captchaToken ? { captchaToken } : undefined });
        if (error) throw new Error(/captcha/i.test(error.message) ? 'Bot check failed. Reload the page and try again.' : 'Incorrect email or password.');
        return this.nextStep();
      },
      // Works out what the logged-in user still has to do: nothing, enter a code, or set up MFA.
      async nextStep() {
        const sb = admin();
        const { data: st, error } = await sb.rpc('admin_status');
        if (error) {
          if (missingFn(error)) return { status: 'needs_schema' };
          await sb.auth.signOut({ scope: 'local' });
          return { status: 'not_admin' };
        }
        if (!st?.is_admin) { await sb.auth.signOut({ scope: 'local' }); return { status: 'not_admin' }; }
        const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal.currentLevel === 'aal2') return { status: 'ok', raw: st };
        if (aal.nextLevel === 'aal2') return { status: 'mfa_verify', raw: st };
        return { status: st.require_mfa ? 'mfa_enroll' : 'ok', raw: st };
      },
      async verifyMfa(code) {
        const sb = admin();
        const { data } = await sb.auth.mfa.listFactors();
        const factor = data?.totp?.[0];
        if (!factor) throw new Error('No authenticator is set up on this account.');
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
        if (error) throw new Error('That code didn\'t work. Check the time on your phone and try again.');
      },
      async startMfaEnroll() {
        const sb = admin();
        const { data: list } = await sb.auth.mfa.listFactors();
        for (const f of (list?.all || []).filter(f => f.status === 'unverified')) await sb.auth.mfa.unenroll({ factorId: f.id });
        const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Seventh Boar admin ${new Date().toISOString().slice(0, 10)}` });
        if (error) throw new Error(error.message);
        return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
      },
      async finishMfaEnroll(factorId, code) {
        const { error } = await admin().auth.mfa.challengeAndVerify({ factorId, code });
        if (error) throw new Error('That code didn\'t work. Try the newest code in your app.');
      },
      async getAdmin() {
        const sb = admin();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return null;
        const step = await this.nextStep();
        if (step.status !== 'ok') return { needs: step.status };
        const { data: factors } = await sb.auth.mfa.listFactors();
        return { email: session.user.email, mfa: (factors?.totp || []).length > 0, nickname: step.raw?.nickname || '',
                 comingSoon: !!step.raw?.coming_soon, previewKey: step.raw?.preview_key || '' };
      },
      logout: (everywhere = false) => admin().auth.signOut({ scope: everywhere ? 'global' : 'local' }),

      /* ---- password-confirmed writes ---- */
      async confirm(password) {
        const { data, error } = await admin().rpc('confirm_password', { password });
        if (error) throw new Error('Could not check your password. Try again.');
        return data;
      },
      endWrite: () => admin().rpc('end_write_grant'),

      // What this admin is called in the activity log. Empty clears it back to the email.
      async setNickname(name) {
        const { data, error } = await admin().rpc('set_nickname', { name: name || null });
        fail(error, 'Could not save your name');
        return data || '';
      },
      // email -> nickname, so older log entries can show names too.
      async adminNames() {
        const { data, error } = await admin().rpc('admin_names');
        return error ? {} : (data || {});
      },

      // Coming soon: closes the site to everyone but the admin and the preview link.
      async setComingSoon(on) {
        const { data, error } = await admin().rpc('set_coming_soon', { on_off: !!on });
        fail(error, 'Could not change coming soon mode');
        return data;
      },
      // Checks a preview key the way a visitor's browser would: through the public (logged-out) route.
      async testPreviewKey(key) {
        const { data, error } = await pub().rpc('site_data', { p_key: key || '' });
        if (error) return { ok: false, why: error.message };
        return { ok: !data?.coming_soon || Array.isArray(data?.posts), coming_soon: !!data?.coming_soon };
      },
      async newPreviewKey() {
        const { data, error } = await admin().rpc('new_preview_key');
        fail(error, 'Could not make a new preview link');
        return data;
      },

      /* ---- content (admin) ---- */
      async loadAdmin() {
        const a = admin();
        const [p, pr, s, c] = await Promise.all([
          hedged(() => a.from('journal_posts').select('*').order('published_at', { ascending: false }).then(r => r)),
          hedged(() => a.from('projects').select('*').order('published_at', { ascending: false }).then(r => r)),
          hedged(() => a.from('site_settings').select('data').eq('id', 1).maybeSingle().then(r => r)),
          hedged(() => a.from('comments').select('*').order('created_at', { ascending: false }).limit(500).then(r => r)),
        ]);
        fail(p.error, 'Could not load devlog entries'); fail(pr.error, 'Could not load projects');
        return { posts: p.data.map(toPost), projects: pr.data.map(toProject), settings: mergeSettings(s.error ? null : s.data?.data), comments: c.error ? [] : c.data.map(toComment) };
      },
      async savePost(p, isNew) {
        const row = postRow(p);
        const q = isNew ? admin().from('journal_posts').insert(row) : admin().from('journal_posts').update(row).eq('slug', p.id);
        const { data, error } = await q.select('slug');
        changed(data, error, /duplicate key/.test(error?.message) ? 'Another entry already uses that web address (slug).' : undefined);
        return data[0].slug;
      },
      async deletePost(p) {
        const { data, error } = await admin().from('journal_posts').delete().eq('slug', p.id).select('slug');
        changed(data, error);
        await this.removeImages([p.image, p.cardImage, ...(p.content || []).map(b => b.image)].filter(Boolean));
      },
      async saveProject(p, isNew) {
        const row = projectRow(p);
        const q = isNew ? admin().from('projects').insert(row) : admin().from('projects').update(row).eq('slug', p.id);
        const { data, error } = await q.select('slug');
        changed(data, error, /duplicate key/.test(error?.message) ? 'Another project already uses that web address (slug).' : undefined);
        return data[0].slug;
      },
      async deleteProject(p) {
        const { data, error } = await admin().from('projects').delete().eq('slug', p.id).select('slug');
        changed(data, error);
        await this.removeImages([p.banner, p.cardBanner, p.icon, p.clientLogo, ...(p.brief || []).map(b => b.image)].filter(Boolean));
      },
      async saveSettings(data) {
        const res = await admin().from('site_settings').update({ data }).eq('id', 1).select('id');
        changed(res.data, res.error);
      },
      async approveComment(id) {
        const { data, error } = await admin().from('comments').update({ approved: true }).eq('id', id).select('id');
        changed(data, error);
      },
      async deleteComment(id) {
        const { data, error } = await admin().from('comments').delete().eq('id', id).select('id');
        changed(data, error);
      },
      async loadSubscribers() {
        const { data, error } = await admin().rpc('subscriber_list');
        fail(error, 'Could not load the subscriber list');
        return data || [];
      },
      async removeSubscriber(email) {
        const { data, error } = await admin().rpc('subscriber_remove', { addr: email });
        fail(error, 'Could not remove that address');
        return data;
      },
      async auditLog() {
        const { data, error } = await admin().from('audit_log').select('*').order('at', { ascending: false }).limit(100);
        fail(error);
        return data;
      },

      /* ---- images ---- */
      // Start resizing a photo the moment it's picked, so Save only has to upload it.
      prepareImage: (file, o = {}) => processImage(file, o.max || 1800, o.quality || 0.84),
      // Photos are stored under posts/, projects/ or pages/ (the storage rules only allow those).
      async uploadImage(fileOrBlob, folder = 'pages', prepared) {
        const blob = fileOrBlob instanceof Blob && !(fileOrBlob instanceof File) && fileOrBlob.type ? fileOrBlob : await (prepared || processImage(fileOrBlob));
        const type = /^image\/(jpeg|png|webp|avif)$/.test(blob.type) ? blob.type : 'image/jpeg';
        const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[type];
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;
        const { error } = await admin().storage.from('post-images').upload(path, blob, { contentType: type, upsert: false });
        fail(error, 'Photo upload failed');
        return admin().storage.from('post-images').getPublicUrl(path).data.publicUrl;
      },
      uploadDataUrl(dataUrl, folder) { return this.uploadImage(dataUrlToBlob(dataUrl), folder); },
      async removeImages(urls) {
        const paths = urls.map(bucketPath).filter(Boolean);
        if (paths.length) await admin().storage.from('post-images').remove(paths);
      },
    };
  }

  /* =====================================================================
     Demo backend: browser-only, for trying the site and admin on localhost
     ===================================================================== */
  function demoBackend() {
    const DEMO = { email: 'admin@demo.local', password: 'demo' };
    const KEY = 'sb_demo_';
    const read = (k, fallback) => { try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : clone(fallback); } catch { return clone(fallback); } };
    const write = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { throw new Error('Browser storage is full. Use smaller photos in demo mode.'); } };
    const session = {
      get: () => { try { return JSON.parse(sessionStorage.getItem(KEY + 'session')); } catch { return null; } },
      set: v => sessionStorage.setItem(KEY + 'session', JSON.stringify(v)),
      clear: () => sessionStorage.removeItem(KEY + 'session'),
    };
    let writeUntil = 0;
    const posts = () => read('posts', DEMO_SEED.posts).map(toPost);
    const projects = () => read('projects', DEMO_SEED.projects).map(toProject);
    const savePosts = list => write('posts', list.map(postRow));
    const saveProjects = list => write('projects', list.map(projectRow));
    const settings = () => mergeSettings(read('settings', {}));
    const comments = () => read('comments', DEMO_SEED.comments).map(toComment);
    const saveComments = list => write('comments', list.map(c => ({ id: c.id, post_slug: c.postSlug, author_name: c.author, body: c.body, likes: c.likes, approved: c.approved, created_at: c.date })));
    const live = x => (x.status || 'published') === 'published' && new Date(x.date) <= new Date();
    const log = (action, entity, name) => {
      const list = read('audit', []);
      list.unshift({ id: Date.now() + Math.random(), at: new Date().toISOString(), email: read('nickname', '') || DEMO.email, action, entity, entity_id: '', summary: name || '' });
      write('audit', list.slice(0, 100));
    };
    const guard = () => { if (Date.now() > writeUntil) throw new Error('Not allowed. Confirm your password and try again.'); };
    const shut = () => read('comingSoon', false) && previewKey() !== 'deadbeefcafe0123456789abcdef0000' && !session.get();
    const wait = ms => new Promise(r => setTimeout(r, ms));

    return {
      mode: 'demo',
      demoCredentials: DEMO,
      async loadPublic() {
        await wait(60);
        if (shut()) return { locked: true, comingSoon: true, settings: settings(), posts: [], projects: [] };
        return { locked: false, comingSoon: read('comingSoon', false), settings: settings(), posts: posts().filter(live).sort(byDateDesc), projects: projects().filter(live).sort(byDateDesc) };
      },
      getPost: async slug => (shut() ? null : posts().find(p => p.id === slug && (live(p) || session.get())) || null),
      getProject: async slug => (shut() ? null : projects().find(p => p.id === slug && (live(p) || session.get())) || null),
      loadAccent: async () => settings().theme?.accent || null,
      getComments: async slug => comments().filter(c => c.postSlug === slug && c.approved).sort((a, b) => new Date(a.date) - new Date(b.date)),
      async submitComment(postSlug, author, body) {
        await wait(300);
        saveComments([...comments(), { id: 'c-' + Date.now().toString(36), postSlug, author, body, likes: 0, approved: false, date: new Date().toISOString() }]);
      },
      async likeComment(id) { saveComments(comments().map(c => (c.id === id && c.approved ? { ...c, likes: c.likes + 1 } : c))); },
      // Demo requests live in this browser; no emails are sent.
      async submitRequest(f) {
        await wait(400);
        if (!f.name?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email || '') || (f.brief || '').trim().length < 10) throw new Error('Please fill in your name, a valid email and a sentence about the project.');
        const list = read('requests', DEMO_SEED.requests);
        const number = Math.max(1000, ...list.map(x => x.number)) + 1;
        const key = Array.from({ length: 36 }, () => 'abcdef0123456789'[Math.floor(Math.random() * 16)]).join('');
        list.unshift({ id: 'r-' + Date.now().toString(36), number, kind: f.kind === 'app' ? 'app' : 'website', stage: 'received', name: f.name.trim(), email: f.email.trim(),
          phone: f.phone || '', company: f.company || '', current_site: f.current_site || '', budget: f.budget || '', timeline: f.timeline || '', brief: f.brief.trim(), links: f.links || '',
          access_key: key, admin_notes: '', history: [{ stage: 'received', at: new Date().toISOString(), note: '' }], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), decided_at: null });
        write('requests', list);
        return { ok: true, number, key, emailed: false, demo: true };
      },
      async getRequestStatus(number, key) {
        const r = read('requests', DEMO_SEED.requests).find(x => String(x.number) === String(number) && x.access_key === key);
        return r ? { number: r.number, kind: r.kind, stage: r.stage, first_name: r.name.split(' ')[0], company: r.company, created_at: r.created_at, history: r.history } : null;
      },
      loadRequests: async () => read('requests', DEMO_SEED.requests).map(toRequest),
      async updateRequest(id, { stage, note = '', email = true }) {
        guard();
        const list = read('requests', DEMO_SEED.requests);
        const r = list.find(x => x.id === id);
        if (!r) throw new Error('That request no longer exists.');
        r.stage = stage; r.history = [...r.history, { stage, at: new Date().toISOString(), note }];
        if ((stage === 'accepted' || stage === 'declined') && !r.decided_at) r.decided_at = new Date().toISOString();
        r.updated_at = new Date().toISOString();
        write('requests', list); log('update', 'requests', `SB-${r.number}: ${stage}`);
        return { ok: true, history: r.history, emailed: email && stage !== 'received', emailError: '', demo: true };
      },
      async saveRequestNotes(id, notes) {
        guard();
        const list = read('requests', DEMO_SEED.requests);
        const r = list.find(x => x.id === id); if (r) { r.admin_notes = notes; write('requests', list); }
        return { ok: true };
      },
      async deleteRequest(id) { guard(); write('requests', read('requests', DEMO_SEED.requests).filter(x => x.id !== id)); log('delete', 'requests', 'Deleted a request'); },
      async notifyPosts(slug) {
        guard();
        const list = read('posts', DEMO_SEED.posts);
        const row = list.find(x => x.slug === slug);
        if (row) { row.emailed_at = new Date().toISOString(); write('posts', list); }
        const sent = read('subscribers', DEMO_SEED.subscribers).length;
        log('update', 'email', `Emailed ${sent} subscriber${sent === 1 ? '' : 's'} (demo: nothing was really sent)`);
        return { ok: true, posts: 1, sent, demo: true };
      },
      async subscribe(email) {
        await wait(300);
        const list = read('subscribers', DEMO_SEED.subscribers);
        if (!list.some(x => x.email.toLowerCase() === email.toLowerCase())) { list.unshift({ email, at: new Date().toISOString() }); write('subscribers', list); }
        return { ok: true };
      },

      async login(email, password) {
        await wait(400);
        if (email.trim().toLowerCase() !== DEMO.email || password !== DEMO.password) throw new Error('Incorrect email or password.');
        session.set({ email: DEMO.email, at: Date.now() });
        return { status: 'ok' };
      },
      nextStep: async () => ({ status: session.get() ? 'ok' : 'not_admin' }),
      verifyMfa: async () => {}, startMfaEnroll: async () => ({}), finishMfaEnroll: async () => {},
      getAdmin: async () => (session.get() ? { email: DEMO.email, mfa: false, demo: true, nickname: read('nickname', ''), comingSoon: read('comingSoon', false), previewKey: 'deadbeefcafe0123456789abcdef0000' } : null),
      logout: async () => session.clear(),
      async confirm(password) {
        await wait(250);
        const fails = read('fails', []).filter(t => t > Date.now() - 15 * 60e3);
        if (fails.length >= 5) return { ok: false, reason: 'locked' };
        if (password !== DEMO.password) { fails.push(Date.now()); write('fails', fails); return { ok: false, reason: 'incorrect', remaining: 5 - fails.length }; }
        writeUntil = Date.now() + 5 * 60e3;
        return { ok: true };
      },
      endWrite: async () => { writeUntil = 0; },
      setNickname: async name => { guard(); const v = String(name || '').trim().slice(0, 40); write('nickname', v); log('update', 'admins', v ? `Nickname set to ${v}` : 'Nickname cleared'); return v; },
      adminNames: async () => (read('nickname', '') ? { [DEMO.email]: read('nickname', '') } : {}),
      async setComingSoon(on) { guard(); write('comingSoon', !!on); log('update', 'security_settings', on ? 'Coming soon: on' : 'Coming soon: off'); return !!on; },
      async newPreviewKey() { guard(); return 'deadbeefcafe0123456789abcdef0000'; },
      async testPreviewKey(key) { return { ok: key === 'deadbeefcafe0123456789abcdef0000', coming_soon: read('comingSoon', false) }; },

      async loadAdmin() {
        return { posts: posts().sort(byDateDesc), projects: projects().sort(byDateDesc), settings: settings(), comments: comments().sort(byDateDesc) };
      },
      async savePost(p, isNew) {
        guard();
        const list = posts();
        const i = list.findIndex(x => x.id === p.id);
        if (isNew && i > -1) throw new Error('Another entry already uses that web address (slug).');
        i === -1 ? list.push(p) : (list[i] = p);
        savePosts(list); log(isNew ? 'insert' : 'update', 'journal_posts', p.title);
        return p.id;
      },
      async deletePost(p) { guard(); savePosts(posts().filter(x => x.id !== p.id)); saveComments(comments().filter(c => c.postSlug !== p.id)); log('delete', 'journal_posts', p.title); },
      async saveProject(p, isNew) {
        guard();
        const list = projects();
        const i = list.findIndex(x => x.id === p.id);
        if (isNew && i > -1) throw new Error('Another project already uses that web address (slug).');
        i === -1 ? list.push(p) : (list[i] = p);
        saveProjects(list); log(isNew ? 'insert' : 'update', 'projects', p.title);
        return p.id;
      },
      async deleteProject(p) { guard(); saveProjects(projects().filter(x => x.id !== p.id)); log('delete', 'projects', p.title); },
      async saveSettings(data) { guard(); write('settings', data); log('update', 'site_settings', 'Site settings'); },
      async approveComment(id) { guard(); saveComments(comments().map(c => (c.id === id ? { ...c, approved: true } : c))); log('update', 'comments', 'Approved a comment'); },
      async deleteComment(id) { guard(); saveComments(comments().filter(c => c.id !== id)); log('delete', 'comments', 'Deleted a comment'); },
      loadSubscribers: async () => read('subscribers', DEMO_SEED.subscribers),
      async removeSubscriber(email) { guard(); write('subscribers', read('subscribers', DEMO_SEED.subscribers).filter(x => x.email !== email)); log('delete', 'subscribers', `Removed ${email}`); return true; },
      auditLog: async () => read('audit', []),

      prepareImage: (file, o = {}) => processImage(file, o.max || 1200, o.quality || 0.8),
      async uploadImage(fileOrBlob, folder, prepared) {
        guard();
        const blob = fileOrBlob instanceof Blob && !(fileOrBlob instanceof File) && fileOrBlob.type ? fileOrBlob : await (prepared || processImage(fileOrBlob, 1200, 0.8));
        return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      },
      async uploadDataUrl(dataUrl) { guard(); return dataUrl; },
      removeImages: async () => {},
      resetDemo() { ['posts', 'projects', 'settings', 'comments', 'subscribers', 'requests', 'audit', 'fails', 'comingSoon', 'nickname'].forEach(k => localStorage.removeItem(KEY + k)); },
    };
  }

  const backend = demoOn ? demoBackend() : configured ? supabaseBackend() : demoBackend();
  backend.captchaEnabled = !demoOn && configured && !!cfg.captcha?.siteKey;
  window.CMS = Object.assign(backend, { configured, esc, slugify, mergeSettings, imageOk, previewKeyTried, forgetPreviewKey, dataUrlToBlob });
  window.esc = esc;
})(window);
