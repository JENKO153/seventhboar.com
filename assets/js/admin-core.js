/* Seventh Boar admin: the shared core (boot, routing, password-confirmed writes, photos, previews).
 * Every change goes through AD.withWrite(): it asks for the admin password, the database opens a
 * short write window for this session, the change is made, and the window is closed again.
 * The database refuses writes without that window, so this UI is not the security boundary.
 * The views live in admin-editors.js, admin-pages.js and admin-settings.js; admin-main.js boots. */
// The admin must never run inside another site's frame (a trick to capture clicks or passwords).
if (window.top !== window.self) { document.documentElement.innerHTML = ''; throw new Error('Admin cannot be framed'); }

window.AD = (function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = window.esc;
  const view = $('#view');
  const cfg = window.SB_CONFIG;

  const AD = {
    $, $$, esc, view, cfg,
    DATA: { posts: [], projects: [], comments: [], settings: CMS.mergeSettings({}) },
    ADMIN: null,
    NAMES: {},
    dirty: false,
    routes: {},              // name -> function(id), registered by the view files
    navKey: {},              // route name -> which sidebar item lights up
    lastHash: location.hash,
    ignoreHash: false,
    progress: () => {},      // set by withWrite while a save runs
  };

  const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  AD.SLUG_RE = SLUG_RE;
  AD.clone = v => JSON.parse(JSON.stringify(v));
  AD.fmtDate = d => new Date(d).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  AD.fmtDay = d => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  // <input type="datetime-local"> wants local time without seconds
  AD.toInput = d => { const x = new Date(d || Date.now()); x.setSeconds(0, 0); return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  AD.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // Only real image addresses: https, this site's own images, uploaded photos (demo) or a blob: preview.
  const safe = u => (/^(https:\/\/|\/assets\/|assets\/|data:image\/(webp|jpeg|png);base64,|blob:)/.test(u || '') ? u : '');
  AD.safe = safe;
  AD.asset = u => { const s = safe(u); return s.startsWith('assets/') ? '/' + s : s; };

  /* ---------------- feedback ---------------- */
  let toastTimer;
  AD.toast = function (msg, err = false) {
    const t = $('#toast');
    t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), err ? 5000 : 2600);
  };
  AD.go = hash => { AD.dirty = false; location.hash = hash; };
  AD.setTitle = t => { $('#viewTitle').textContent = t; document.title = `${t} — Seventh Boar Admin`; };
  AD.markDirty = () => { AD.dirty = true; const f = $('#dirtyFlag'); if (f) f.hidden = false; };

  /* ---------------- password confirmation ---------------- */
  const REASONS = {
    locked: 'Too many wrong attempts. Changes are locked for 15 minutes.',
    mfa_required: 'Please sign in again with your authenticator code.',
    not_admin: 'This account is not an admin.',
  };
  function requirePassword(text) {
    return new Promise(resolve => {
      const modal = $('#confirmModal'), form = $('#confirmForm'), pw = $('#confirmPassword'), err = $('#confirmError');
      $('#confirmText').textContent = text;
      err.hidden = true; pw.value = ''; modal.hidden = false; pw.focus();
      const done = ok => {
        modal.hidden = true; pw.value = '';
        form.onsubmit = null; $('#confirmCancel').onclick = null; document.removeEventListener('keydown', onKey);
        resolve(ok);
      };
      const onKey = e => { if (e.key === 'Escape') done(false); };
      document.addEventListener('keydown', onKey);
      $('#confirmCancel').onclick = () => done(false);
      form.onsubmit = async e => {
        e.preventDefault();
        const btn = $('#confirmSubmit');
        btn.disabled = true;
        try {
          const r = await CMS.confirm(pw.value);
          if (r?.ok) return done(true);
          err.textContent = r?.reason === 'incorrect'
            ? `Wrong password.${r.remaining != null ? ` ${Math.max(0, r.remaining)} attempt${r.remaining === 1 ? '' : 's'} left before a 15 minute lock.` : ''}`
            : REASONS[r?.reason] || 'Could not confirm your password.';
          err.hidden = false; pw.value = ''; pw.focus();
        } catch (ex) {
          err.textContent = ex.message; err.hidden = false;
        } finally { btn.disabled = false; }
      };
    });
  }

  // Tell any site tabs open in this browser to refresh, so changes show without a manual reload.
  const siteTabs = 'BroadcastChannel' in window ? new BroadcastChannel('sb-site') : null;
  AD.announceChange = () => siteTabs?.postMessage({ type: 'content-changed' });

  AD.withWrite = async function (text, fn) {
    if (!(await requirePassword(text))) return false;
    // Busy state on the page's save button, with upload progress in its label.
    const btn = view.querySelector('.savebar button[type=submit]');
    const label = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    AD.progress = msg => { if (btn) btn.textContent = msg; };
    try { await fn(); AD.announceChange(); return true; }
    catch (err) { console.error(err); AD.toast(err.message || 'Something went wrong', true); return false; }
    finally {
      AD.progress = () => {};
      if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = label; }
      try { await CMS.endWrite(); } catch { /* window expires on its own */ }
    }
  };

  /* ---------------- data ---------------- */
  AD.reload = async function () {
    const content = await CMS.loadAdmin().catch(err => { AD.toast(err.message, true); return null; });
    if (content) AD.DATA = { ...AD.DATA, ...content };
    const pending = AD.DATA.comments.filter(c => !c.approved).length;
    $('#cmCount').textContent = pending; $('#cmCount').hidden = !pending;
    AD.applyAccent();
  };
  // After a save the change shows straight away from what we just saved; this quietly re-fetches
  // in the background to pick up anything the database filled in.
  AD.refreshLater = () => AD.reload().catch(err => console.error(err));
  // The admin wears the same accent colour as the site (Admin -> Customise).
  AD.applyAccent = (hex = AD.DATA.settings.theme?.accent) => window.sbAccent?.apply(hex);
  // The site's address with the preview key on it, for looking around while the site is closed.
  AD.previewUrl = () => (AD.ADMIN?.previewKey ? `${location.origin}/?key=${encodeURIComponent(AD.ADMIN.previewKey)}` : '');
  AD.comingSoonBanner = function () {
    const chip = $('#soonChip');
    if (chip) { chip.hidden = !AD.ADMIN?.comingSoon; chip.onclick = () => AD.go('#settings'); }
    const a = $('#viewSite'); if (a) a.href = AD.ADMIN?.comingSoon ? AD.previewUrl() : '/';
  };

  /* ---------------- who am I ---------------- */
  AD.showWhoAmI = function (admin) {
    $('#userEmail').textContent = admin.nickname || admin.email;
    $('#modeLabel').textContent = CMS.mode === 'demo' ? 'Demo admin' : admin.mfa ? 'Owner // 2FA on' : 'Owner';
  };
  const who = a => AD.NAMES[String(a.email || '').toLowerCase()] || a.email || 'Admin';
  AD.who = who;
  const ACTION = { insert: 'created', update: 'updated', delete: 'deleted' };
  const ENTITY = { journal_posts: 'devlog entry', projects: 'project', site_settings: 'homepage & settings', comments: 'comment', subscribers: 'subscriber',
                   security_settings: 'site settings', admins: 'account' };
  AD.activityText = a => `${ACTION[a.action] || esc(a.action)} ${ENTITY[a.entity] || esc(a.entity)}`;
  AD.activityItem = a => `<li><time>${AD.fmtDate(a.at)}</time><span>${esc(who(a))} ${AD.activityText(a)}${a.summary && a.entity !== 'site_settings' ? ` <b>${esc(a.summary)}</b>` : ''}</span></li>`;

  /* ---------------- router ---------------- */
  AD.onHash = function () {
    if (AD.ignoreHash) { AD.ignoreHash = false; return; }
    if (AD.dirty && !confirm('Discard your unsaved changes?')) { AD.ignoreHash = true; location.hash = AD.lastHash; return; }
    AD.dirty = false;
    AD.route();
  };
  AD.route = function () {
    AD.lastHash = location.hash;
    view.onclick = null; // views that need a delegated click handler set their own
    const [name, id] = (location.hash.slice(1) || 'overview').split('/');
    (AD.routes[name] || AD.routes.overview)(id);
    const key = AD.navKey[name] || name;
    $$('#nav a[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === key));
    $('#side').classList.remove('open');
    window.scrollTo(0, 0);
  };

  /* ---------------- idle logout ---------------- */
  AD.startIdleTimer = function () {
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => { await CMS.logout(); location.replace('/admin/login/?reason=idle'); }, cfg.adminIdleMinutes * 60e3);
    };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    reset();
  };

  /* =====================================================================
     PHOTOS
     A photo is {url} (already uploaded) or {file, preview, prepared} (new, uploaded on save).
     Resizing starts the moment it's picked (prepared), so by the time Save is pressed there's
     usually only the upload left.
     ===================================================================== */
  // Photos uploaded in this session keep showing from memory instead of downloading again.
  const localCopy = new Map();
  AD.shown = u => localCopy.get(u) || AD.asset(u);
  AD.photoSrc = ph => (ph.url ? AD.shown(ph.url) : ph.preview);
  AD.photoDraft = ph => (ph ? (ph.url ? (localCopy.get(ph.url) || ph.url) : ph.preview) : '');

  // onFail(ph) runs if a photo turns out to be unreadable, so the caller can remove its tile.
  AD.acceptFiles = function (files, list, max, onFail) {
    for (const f of files) {
      if (list.length >= max) { AD.toast(`Up to ${max} photos`, true); break; }
      if (!CMS.imageOk(f)) { AD.toast(`${f.name}: use JPG, PNG, WebP, AVIF or iPhone HEIC`, true); continue; }
      if (f.size > 25 * 1024 * 1024) { AD.toast(`${f.name} is over 25MB`, true); continue; }
      const prepared = CMS.prepareImage(f);
      const ph = { file: f, preview: URL.createObjectURL(f), prepared };
      // Show the resized copy (and catch unreadable files like HEIC in Chrome) straight away.
      prepared.then(blob => { ph.preview = URL.createObjectURL(blob); }, err => { ph.error = err.message; AD.toast(err.message, true); onFail?.(ph); });
      list.push(ph);
    }
  };
  AD.uploadOne = async function (ph, folder) {
    if (ph.url) return ph.url;
    if (ph.error) throw new Error(ph.error);
    const url = await CMS.uploadImage(ph.file, folder, ph.prepared);
    localCopy.set(url, ph.preview);
    return url;
  };
  // Uploads new photos two at a time, reporting "Uploading photo 2 of 5".
  AD.uploadAll = async function (list, folder) {
    const todo = list.filter(ph => ph && !ph.url).length;
    let done = 0;
    const out = new Array(list.length);
    const queue = list.map((ph, i) => [ph, i]);
    const worker = async () => {
      for (let job; (job = queue.shift());) {
        const [ph, i] = job;
        if (!ph) { out[i] = ''; continue; }
        const isNew = !ph.url;
        if (isNew) AD.progress(`Uploading photo ${done + 1} of ${todo}…`);
        out[i] = await AD.uploadOne(ph, folder);
        if (isNew) done++;
      }
    };
    await Promise.all([worker(), worker()]);
    return out;
  };
  // A cropped card image made in the browser (a data: URL) goes up like any other photo.
  AD.uploadDataUrl = async function (dataUrl, folder) {
    const url = await CMS.uploadDataUrl(dataUrl, folder);
    if (url.startsWith('http')) localCopy.set(url, dataUrl);
    return url;
  };

  // One shared hidden file input for every photo tile on the page.
  AD.pickPhoto = function (done, onFail) {
    const input = $('#picker');
    input.onchange = () => {
      const picked = [];
      AD.acceptFiles([...input.files].slice(0, 1), picked, 1, onFail);
      input.value = '';
      if (picked.length) done(picked[0]);
    };
    input.click();
  };

  // A single-photo control: shows the photo, lets you change / remove it, and takes a dropped file.
  // Returns { get(), set(ph) }. ph is null, {url} or a new photo.
  AD.photoField = function (host, { value = null, aspect = '16/10', square = false, hint = '', onChange = () => {} } = {}) {
    let ph = value ? { url: value } : null;
    const draw = () => {
      host.innerHTML = `<div class="pic ${square ? 'pic--square' : ''}">
        <div class="pic__frame" style="--aspect:${aspect}" data-drop>
          ${ph ? `<img src="${esc(AD.photoSrc(ph))}" alt="">${ph.file ? '<span class="pic__new">New</span>' : ''}` : '<div class="drop" tabindex="0" role="button"><svg viewBox="0 0 24 24"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>Add photo</div>'}
        </div>
        <div class="pic__tools">
          <button type="button" class="btn btn--ghost btn--sm" data-change>${ph ? 'Change photo' : 'Choose photo'}</button>
          ${ph ? '<button type="button" class="btn btn--danger btn--sm" data-remove>Remove</button>' : ''}
          ${hint ? `<span class="hint">${hint}</span>` : ''}
        </div></div>`;
    };
    const set = next => { ph = next; draw(); onChange(ph); };
    const fail = bad => { if (ph === bad) set(null); };
    host.addEventListener('click', e => {
      if (e.target.closest('[data-remove]')) return set(null);
      if (e.target.closest('[data-change], .drop')) AD.pickPhoto(set, fail);
    });
    host.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.drop')) { e.preventDefault(); AD.pickPhoto(set, fail); } });
    host.addEventListener('dragover', e => { const z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.querySelector('.drop')?.classList.add('over'); } });
    host.addEventListener('dragleave', e => e.target.closest('[data-drop]')?.querySelector('.drop')?.classList.remove('over'));
    host.addEventListener('drop', e => {
      if (!e.target.closest('[data-drop]')) return;
      e.preventDefault();
      const picked = [];
      AD.acceptFiles([...e.dataTransfer.files].slice(0, 1), picked, 1, fail);
      if (picked.length) set(picked[0]); else draw();
    });
    draw();
    return { get: () => ph, set: next => { ph = next; draw(); } };
  };

  // Keep the browser from navigating away when a photo is dropped outside a drop zone.
  ['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => {
    if (!e.target.closest?.('[data-drop], [data-pic]')) e.preventDefault();
  }));

  /* =====================================================================
     LIVE PREVIEW: the real public page in an iframe, fed the unsaved draft
     ===================================================================== */
  AD.previewPanel = function (path, urlLabel) {
    return `
      <aside class="preview">
        <div class="preview__head">
          <h3><span class="live-dot"></span>Live preview</h3>
          <span style="flex:1"></span>
          <div class="seg" id="device"><button type="button" class="on" data-w="1280">Desktop</button><button type="button" data-w="390">Mobile</button></div>
        </div>
        <div class="preview__chrome"><i></i><i></i><i></i><span class="preview__url" id="previewUrl">${esc(urlLabel)}</span></div>
        <div class="preview__stage" id="stage"><iframe id="frame" src="${path}" title="Live preview" sandbox="allow-scripts allow-same-origin"></iframe></div>
      </aside>`;
  };

  // Scales the iframe to fit, and returns send() which posts the current draft in.
  AD.wirePreview = function (getDraft) {
    const frame = $('#frame'), stage = $('#stage');
    let width = 1280, ready = false;
    const fit = () => {
      const scale = Math.min(1, stage.clientWidth / width);
      frame.style.width = width + 'px';
      frame.style.height = stage.clientHeight / scale + 'px';
      frame.style.transform = `scale(${scale})`;
      frame.style.left = Math.max(0, (stage.clientWidth - width * scale) / 2) + 'px'; // centre the phone view
    };
    $('#device').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#device button').forEach(x => x.classList.toggle('on', x === b));
      width = +b.dataset.w; fit();
    });
    new ResizeObserver(fit).observe(stage);
    fit();
    let t;
    const send = () => {
      clearTimeout(t);
      t = setTimeout(() => { if (ready && frame.contentWindow) frame.contentWindow.postMessage({ type: 'sb:preview', ...getDraft() }, location.origin); }, 120);
    };
    const onMsg = e => {
      if (e.origin !== location.origin || e.source !== frame.contentWindow) return;
      // The public page asks for its content: hand over what the admin already has (as the
      // public would see it), so the preview appears instantly instead of downloading it again.
      if (e.data?.type === 'sb:preview-hello') {
        frame.contentWindow.postMessage({ type: 'sb:preview-data', data: {
          posts: AD.DATA.posts.filter(p => p.status === 'published'),
          projects: AD.DATA.projects.filter(p => p.status === 'published'),
          settings: AD.DATA.settings,
        } }, location.origin);
      }
      if (e.data?.type === 'sb:preview-ready') { ready = true; send(); }
    };
    window.addEventListener('message', onMsg);
    // stop listening once this editor is replaced
    const stop = () => { window.removeEventListener('message', onMsg); window.removeEventListener('hashchange', stop); };
    window.addEventListener('hashchange', stop);
    return send;
  };

  /* =====================================================================
     REPEATING LISTS (people, quotes, photo grid, spec rows)
     Each item keeps its photo as {url} (already uploaded) or {file, preview} (new).
     Text inputs update the model as you type without redrawing, so focus is never lost;
     the list is only redrawn when something is added, removed, moved or photographed.
     ===================================================================== */
  AD.listSection = function ({ host, list, blank, max, label, onChange, row, photo = true, aspect = '' }) {
    const draw = () => {
      host.innerHTML = list.map((it, i) => `
        <div class="item ${photo ? '' : 'item--plain'}" data-i="${i}">
          ${photo ? `<div class="item__pic" data-pic tabindex="0" role="button" aria-label="Photo" ${aspect ? `style="aspect-ratio:${aspect}"` : ''}>
            ${it.ph ? `<img src="${esc(AD.photoSrc(it.ph))}" alt="">` : '<span>+ Photo</span>'}</div>` : ''}
          <div class="item__fields">
            <div class="item__head"><b>${esc(label(it, i))}</b>
              <div class="item__tools">
                <button type="button" data-move="-1" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" data-move="1" title="Move down" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" class="del" data-del title="Remove">✕</button>
              </div>
            </div>
            ${row(it, i)}
          </div>
        </div>`).join('') + (list.length < max
          ? `<button type="button" class="btn btn--ghost btn--sm" data-add style="justify-self:start">+ Add</button>`
          : `<span class="hint">Up to ${max}. Remove one to add another.</span>`);
    };
    const clearFailed = ph => { const it = list.find(x => x.ph === ph); if (it) { it.ph = null; draw(); } };
    host.addEventListener('input', e => {
      const box = e.target.closest('[data-i]'); if (!box || !e.target.name) return;
      const it = list[+box.dataset.i];
      it[e.target.name] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      const title = box.querySelector('.item__head b');
      if (title) title.textContent = label(it, +box.dataset.i);
      onChange();
    });
    host.addEventListener('click', e => {
      const btn = e.target.closest('[data-add],[data-del],[data-move],[data-pic]');
      if (!btn) return;
      const box = e.target.closest('[data-i]');
      const i = box ? +box.dataset.i : -1;
      if (btn.matches('[data-add]')) list.push(AD.clone(blank));
      else if (btn.matches('[data-del]')) list.splice(i, 1);
      else if (btn.matches('[data-move]')) {
        const j = i + +btn.dataset.move;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
      } else if (btn.matches('[data-pic]')) return AD.pickPhoto(ph => { list[i].ph = ph; draw(); onChange(); }, clearFailed);
      draw(); onChange();
    });
    // Drag a photo straight onto a tile
    host.addEventListener('dragover', e => { const t = e.target.closest('[data-pic]'); if (t) { e.preventDefault(); t.classList.add('over'); } });
    host.addEventListener('dragleave', e => e.target.closest('[data-pic]')?.classList.remove('over'));
    host.addEventListener('drop', e => {
      const t = e.target.closest('[data-pic]'); if (!t) return;
      e.preventDefault(); t.classList.remove('over');
      const box = e.target.closest('[data-i]'), picked = [];
      AD.acceptFiles([...e.dataTransfer.files].slice(0, 1), picked, 1, clearFailed);
      if (picked.length) { list[+box.dataset.i].ph = picked[0]; draw(); onChange(); }
    });
    draw();
    return draw;
  };
  AD.withPhoto = (item, key = 'image') => ({ ...item, ph: item[key] ? { url: item[key] } : null });
  // Uploads any new photos, then hands back plain rows for saving.
  AD.savePhotos = async function (list, key = 'image', folder = 'pages') {
    const urls = await AD.uploadAll(list.map(it => it.ph), folder);
    return list.map(({ ph, ...rest }, i) => ({ ...rest, [key]: urls[i] || '' }));
  };
  AD.oldPhotos = (list, key = 'image') => list.map(x => x[key]).filter(Boolean);
  AD.dropped = (before, after) => before.filter(u => !after.includes(u) && u.includes('/storage/v1/'));

  return AD;
})();
