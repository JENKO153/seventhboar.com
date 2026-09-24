/* Seventh Boar admin: the devlog and project editors.
 * Both share one editor (title, web address, visibility, cover photo with a card crop, and the
 * block builder) and differ only in the fields listed in KINDS below. */
(function () {
  const { $, $$, esc, view } = AD;

  const BLOCK_STYLES = [
    ['title', 'Title (large)'], ['subtitle', 'Subtitle'], ['paragraph-lg', 'Paragraph: large'], ['paragraph', 'Paragraph: normal'],
    ['paragraph-sm', 'Paragraph: small'], ['bullets', 'Bullet list'], ['photo', 'Photo'],
  ];
  const LINK_PLATFORMS = [
    ['website', 'Website'], ['instagram', 'Instagram'], ['twitter', 'Twitter / X'], ['facebook', 'Facebook'],
    ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn'],
  ];

  /* =====================================================================
     CROP TOOL: pan and zoom the cover inside a fixed 16:9 frame. Whatever is visible in the
     frame becomes the separate card image used on Home, Work and the Devlog, while the
     original stays as the entry's own hero photo.
     ===================================================================== */
  AD.cropTool = function (host, { onChange = () => {} } = {}) {
    host.innerHTML = `<div class="crop">
      <label>Card image <span class="hint">Drag to move, zoom to fit. This is what shows on the cards.</span></label>
      <div class="crop__frame"><img alt=""></div>
      <label class="crop__zoom">Zoom <input type="range" min="100" max="300" value="100" step="1"><span data-z>100%</span></label>
    </div>`;
    const box = $('.crop', host), frame = $('.crop__frame', host), img = $('img', host), zoomInput = $('input', host), zoomLabel = $('[data-z]', host);
    img.crossOrigin = 'anonymous';
    let nw = 0, nh = 0, base = 1, zoom = 1, panX = 0, panY = 0, touched = false;

    const fsize = () => { const r = frame.getBoundingClientRect(); return { w: r.width, h: r.height }; };
    const clamp = () => {
      const { w, h } = fsize(), s = base * zoom;
      panX = Math.max(w - nw * s, Math.min(0, panX));
      panY = Math.max(h - nh * s, Math.min(0, panY));
    };
    const render = () => {
      const s = base * zoom;
      img.style.width = nw * s + 'px'; img.style.height = nh * s + 'px';
      img.style.transform = `translate(${panX}px, ${panY}px)`;
    };
    // https images get their own cache entry, so a copy cached without CORS headers can't taint the canvas
    const corsSrc = src => (/^https:/.test(src) ? src + (src.includes('?') ? '&' : '?') + 'crop=1' : src);

    function load(src) {
      touched = false;
      return new Promise(resolve => {
        const probe = new Image();
        probe.crossOrigin = 'anonymous';
        probe.onload = () => {
          nw = probe.naturalWidth; nh = probe.naturalHeight;
          img.src = probe.src;
          box.classList.add('show');
          requestAnimationFrame(() => {
            const { w, h } = fsize();
            base = Math.max(w / nw, h / nh);
            zoom = 1; zoomInput.value = 100; zoomLabel.textContent = '100%';
            panX = (w - nw * base) / 2; panY = (h - nh * base) / 2;
            clamp(); render(); resolve(true);
          });
        };
        probe.onerror = () => { hide(); resolve(false); };
        probe.src = corsSrc(src);
      });
    }
    function hide() { box.classList.remove('show'); img.removeAttribute('src'); nw = nh = 0; touched = false; }

    let drag = null;
    const down = e => { if (!nw) return; const p = e.touches ? e.touches[0] : e; drag = { x: p.clientX, y: p.clientY, px: panX, py: panY }; };
    const move = e => {
      if (!drag) return;
      const p = e.touches ? e.touches[0] : e;
      panX = drag.px + (p.clientX - drag.x); panY = drag.py + (p.clientY - drag.y);
      clamp(); render(); touched = true; onChange();
    };
    const up = () => { drag = null; };
    frame.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    frame.addEventListener('touchstart', down, { passive: true });
    frame.addEventListener('touchmove', move, { passive: true });
    frame.addEventListener('touchend', up);
    zoomInput.addEventListener('input', () => {
      if (!nw) return;
      const { w, h } = fsize(), old = base * zoom;
      const cx = (w / 2 - panX) / old, cy = (h / 2 - panY) / old;
      zoom = Number(zoomInput.value) / 100; zoomLabel.textContent = zoomInput.value + '%';
      const s = base * zoom;
      panX = w / 2 - cx * s; panY = h / 2 - cy * s;
      clamp(); render(); touched = true; onChange();
    });

    // Renders whatever is visible inside the frame: the image that gets uploaded for cards.
    function toDataUrl(outW = 800) {
      if (!nw) return null;
      const s = base * zoom, { w, h } = fsize();
      const c = document.createElement('canvas');
      c.width = outW; c.height = Math.round(outW * 9 / 16);
      c.getContext('2d').drawImage(img, -panX / s, -panY / s, w / s, h / s, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.85);
    }
    return { load, hide, toDataUrl, hasImage: () => nw > 0, isTouched: () => touched };
  };

  /* =====================================================================
     BLOCK BUILDER: title / subtitle / paragraph / bullets / photo blocks
     A block is {style, text, ph?}. Text edits don't redraw (so focus is never lost).
     ===================================================================== */
  AD.blockEditor = function (host, blocks, onChange) {
    const draw = () => {
      host.innerHTML = blocks.map((b, i) => `
        <div class="block" data-i="${i}">
          <div class="block__top">
            <select data-style aria-label="Block style">${BLOCK_STYLES.map(([v, l]) => `<option value="${v}" ${v === b.style ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <div class="block__tools">
              <button type="button" data-move="-1" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" data-move="1" title="Move down" ${i === blocks.length - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" class="del" data-del title="Remove block" ${blocks.length < 2 ? 'disabled' : ''}>✕</button>
            </div>
          </div>
          ${b.style === 'photo'
            ? `<div data-photo></div><input type="text" name="text" maxlength="160" placeholder="Caption (optional)" value="${esc(b.text || '')}">`
            : `<textarea name="text" rows="3" placeholder="${b.style === 'bullets' ? 'One point per line…' : 'Write this block…'}">${esc(b.text || '')}</textarea>`}
        </div>`).join('');
      $$('.block', host).forEach(row => {
        const b = blocks[+row.dataset.i];
        const ph = $('[data-photo]', row);
        if (ph) {
          const field = AD.photoField(ph, { value: b.ph?.url || null, aspect: '16/10', onChange: v => { b.ph = v; onChange(); } });
          if (b.ph && !b.ph.url) field.set(b.ph);
        }
      });
    };
    host.addEventListener('input', e => {
      const row = e.target.closest('.block'); if (!row || e.target.name !== 'text') return;
      blocks[+row.dataset.i].text = e.target.value;
      onChange();
    });
    host.addEventListener('change', e => {
      if (!e.target.matches('[data-style]')) return;
      const row = e.target.closest('.block');
      const b = blocks[+row.dataset.i];
      b.style = e.target.value;
      draw(); onChange();
    });
    host.addEventListener('click', e => {
      const btn = e.target.closest('[data-move],[data-del]'); if (!btn) return;
      const i = +btn.closest('.block').dataset.i;
      if (btn.matches('[data-del]')) { if (blocks.length > 1) blocks.splice(i, 1); }
      else {
        const j = i + +btn.dataset.move;
        if (j < 0 || j >= blocks.length) return;
        [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      }
      draw(); onChange();
    });
    draw();
    return { draw, add(style = 'paragraph') { blocks.push({ style, text: '' }); draw(); onChange(); } };
  };
  // What the live preview shows
  AD.blocksDraft = blocks => blocks.map(b => ({ style: b.style, text: b.text, image: b.ph ? AD.photoDraft(b.ph) : '' }));
  // Uploads photo blocks and returns the plain blocks ready to save (empty ones are dropped).
  AD.blocksForSave = async function (blocks, folder) {
    const out = [];
    for (const b of blocks) {
      if (b.style === 'photo') {
        if (!b.ph) continue;
        out.push({ style: 'photo', text: (b.text || '').trim(), image: await AD.uploadOne(b.ph, folder) });
      } else {
        const text = (b.text || '').trim();
        if (text) out.push({ style: b.style, text });
      }
    }
    return out;
  };
  const toBlocks = list => {
    const b = (list || []).map(x => (typeof x === 'string' ? { style: 'paragraph', text: x } : { style: x.style || 'paragraph', text: x.text || '', ph: x.image ? { url: x.image } : null }));
    return b.length ? b : [{ style: 'paragraph-lg', text: '' }];
  };

  /* =====================================================================
     THE TWO KINDS OF CONTENT
     ===================================================================== */
  const now = () => new Date().toISOString();
  const KINDS = {
    post: {
      label: 'devlog entry', title: 'Devlog entry', list: 'posts', route: '#devlog', folder: 'posts',
      cover: 'image', card: 'cardImage', body: 'content', draftKey: 'sb_draft_post',
      prefix: '/post/?id=', preview: '/post/?preview=1', siteUrl: id => `/post/?id=${encodeURIComponent(id)}`,
      blank: () => ({ id: null, title: '', category: 'Devlog', excerpt: '', author: 'Seventh Boar', image: '', cardImage: null, content: [], status: 'draft', date: now() }),
      save: (p, isNew) => CMS.savePost(p, isNew), del: p => CMS.deletePost(p),
      fields: p => `
        <div class="field-row">
          <label>Category<input name="category" list="cats" maxlength="40" required value="${esc(p.category)}" placeholder="Devlog">
            <datalist id="cats">${[...new Set(AD.DATA.posts.map(x => x.category))].map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
          <label>Author<input name="author" maxlength="60" value="${esc(p.author)}"></label>
        </div>
        <label>Excerpt <span class="hint">Shown on the cards and in search results</span><textarea name="excerpt" rows="3" maxlength="300" style="min-height:80px">${esc(p.excerpt)}</textarea></label>
        <div class="counter" id="excerptCount"></div>`,
      read: (f, p) => { p.category = f.category.value.trim(); p.author = f.author.value.trim() || 'Seventh Boar'; p.excerpt = f.excerpt.value.trim(); $('#excerptCount').textContent = `${p.excerpt.length} / 300`; },
      validate: (p, ctx) => {
        if (!p.category) return 'Give the entry a category';
        if (p.status === 'published' && !p.excerpt) return 'Add a short excerpt before putting it live';
        return null;
      },
      previewData: (p, ctx) => ({ post: { id: p.id || 'draft', title: p.title, category: p.category, excerpt: p.excerpt, author: p.author, date: p.date,
        image: ctx.cover.get() ? AD.photoDraft(ctx.cover.get()) : '', content: AD.blocksDraft(ctx.blocks) } }),
      extraSections: () => '', wireExtra: () => ({}), collectExtra: async () => ({}), extraImages: () => [],
    },
    project: {
      label: 'project', title: 'Project', list: 'projects', route: '#projects', folder: 'projects',
      cover: 'banner', card: 'cardBanner', body: 'brief', draftKey: 'sb_draft_project',
      prefix: '/project/?id=', preview: '/project/?preview=1', siteUrl: id => `/project/?id=${encodeURIComponent(id)}`,
      blank: () => ({ id: null, title: '', categories: [], platforms: [], client: '', tagline: '', icon: null, banner: '', cardBanner: null, brief: [], featured: false, clientLogo: null, clientLinks: [], status: 'draft', date: now() }),
      save: (p, isNew) => CMS.saveProject(p, isNew), del: p => CMS.deleteProject(p),
      fields: p => `
        <div><label style="margin-bottom:8px">Type</label>
          <div class="checks">${PROJECT_TYPES.map(t => `<label><input type="checkbox" name="categories" value="${t.key}" ${p.categories.includes(t.key) ? 'checked' : ''}>${t.one}</label>`).join('')}</div></div>
        <label>Tagline<input name="tagline" maxlength="160" required value="${esc(p.tagline)}" placeholder="One line on what it is"></label>
        <label>Tags <span class="hint">Comma separated, e.g. iOS, Android or Survival, Settlement builder</span><input name="platforms" maxlength="160" value="${esc((p.platforms || []).join(', '))}"></label>
        <label class="toggle"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}>Featured (shows first, with a Featured stamp)</label>`,
      read: (f, p) => {
        p.categories = [...f.querySelectorAll('[name=categories]:checked')].map(c => c.value);
        p.tagline = f.tagline.value.trim();
        p.platforms = f.platforms.value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 8);
        p.featured = f.featured.checked;
      },
      validate: p => (!p.categories.length ? 'Pick at least one type (Game, App or Prototype)' : !p.tagline ? 'Add a tagline' : null),
      previewData: (p, ctx) => ({ project: { id: p.id || 'draft', title: p.title, categories: p.categories, platforms: p.platforms, client: p.client || null, tagline: p.tagline,
        featured: p.featured, date: p.date, banner: ctx.cover.get() ? AD.photoDraft(ctx.cover.get()) : '', icon: ctx.extra.icon?.get() ? AD.photoDraft(ctx.extra.icon.get()) : null,
        clientLogo: ctx.extra.logo?.get() ? AD.photoDraft(ctx.extra.logo.get()) : null, clientLinks: p.clientLinks, brief: AD.blocksDraft(ctx.blocks) } }),
      extraSections: p => `
        <div class="section">
          <h3>App icon <small>Optional. Shows above the title on the project page.</small></h3>
          <div id="iconField"></div>
        </div>
        <div class="section">
          <h3>Client card <small>Optional. For commissioned work.</small></h3>
          <label>Client name<input name="client" maxlength="80" value="${esc(p.client || '')}"></label>
          <label>Client logo <span class="hint">Shows like an app icon</span></label>
          <div id="logoField"></div>
          <label>Links <span class="hint">Tick the ones to show. Only the icon appears, no wording.</span></label>
          <div class="client-links" id="clientLinks">${LINK_PLATFORMS.map(([k, l]) => {
            const url = (p.clientLinks || []).find(x => x.platform === k)?.url || '';
            return `<div class="client-link" data-platform="${k}"><label class="toggle"><input type="checkbox" data-on ${url ? 'checked' : ''}>${l}</label><input type="url" data-url placeholder="https://…" maxlength="300" value="${esc(url)}" ${url ? '' : 'disabled'}></div>`;
          }).join('')}</div>
        </div>`,
      // Sets up the icon + logo photo fields and the client links; returns handles to them.
      wireExtra: (p, onChange) => {
        const icon = AD.photoField($('#iconField'), { value: p.icon, aspect: '1', square: true, onChange });
        const logo = AD.photoField($('#logoField'), { value: p.clientLogo, aspect: '1', square: true, onChange });
        $('#clientLinks').addEventListener('change', e => {
          if (!e.target.matches('[data-on]')) return;
          const u = e.target.closest('.client-link').querySelector('[data-url]');
          u.disabled = !e.target.checked; if (e.target.checked) u.focus();
          onChange();
        });
        return { icon, logo };
      },
      readExtra: (f, p) => {
        p.client = f.client.value.trim();
        p.clientLinks = $$('.client-link').map(row => {
          const platform = row.dataset.platform, url = $('[data-url]', row).value.trim();
          return $('[data-on]', row).checked && url ? { platform, label: LINK_PLATFORMS.find(x => x[0] === platform)[1], url } : null;
        }).filter(Boolean);
      },
      collectExtra: async (p, ctx) => ({
        icon: ctx.extra.icon.get() ? await AD.uploadOne(ctx.extra.icon.get(), 'projects') : null,
        clientLogo: ctx.extra.logo.get() ? await AD.uploadOne(ctx.extra.logo.get(), 'projects') : null,
      }),
      extraImages: p => [p.icon, p.clientLogo],
    },
  };
  // Kinds without extra fields still answer the same calls
  KINDS.post.readExtra = () => {};

  /* =====================================================================
     LIST: every entry / project with its status
     ===================================================================== */
  const stateOf = x => (x.status !== 'published' ? ['draft', '<span class="pill pill--draft">Draft</span>']
    : new Date(x.date) > new Date() ? ['scheduled', `<span class="pill pill--draft">Scheduled ${AD.fmtDay(x.date)}</span>`] : ['live', '<span class="pill pill--live">Live</span>']);

  function listView(kind) {
    const K = KINDS[kind], isPost = kind === 'post';
    AD.setTitle(isPost ? 'Devlog' : 'Projects');
    const items = AD.DATA[K.list];
    const commentCount = id => AD.DATA.comments.filter(c => c.postSlug === id).length;
    view.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input id="q" type="search" placeholder="Search ${isPost ? 'entries' : 'projects'}" maxlength="80" aria-label="Search">
          <select id="fState" aria-label="Status"><option value="">All statuses</option><option value="live">Live</option><option value="scheduled">Scheduled</option><option value="draft">Draft</option></select>
          <span style="flex:1"></span>
          <a class="btn" href="#${kind}/new">+ New ${K.label}</a>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>${isPost ? 'Entry' : 'Project'}</th><th>${isPost ? 'Category' : 'Type'}</th><th>Status</th><th class="num">${isPost ? 'Comments' : 'Featured'}</th><th class="num">Date</th></tr></thead>
          <tbody id="rows"></tbody>
        </table></div>
      </div>`;
    const draw = () => {
      const q = $('#q').value.toLowerCase(), st = $('#fState').value;
      const list = items.filter(x => (!q || `${x.title} ${x.category || ''} ${x.tagline || ''}`.toLowerCase().includes(q)) && (!st || stateOf(x)[0] === st));
      $('#rows').innerHTML = list.map(x => `
        <tr data-id="${esc(x.id)}">
          <td><div class="t-prod"><img src="${esc(AD.shown(x[K.card] || x[K.cover]))}" alt="" loading="lazy"><div><b>${esc(x.title)}</b><small>${esc(isPost ? x.excerpt : x.tagline)}</small></div></div></td>
          <td>${isPost ? `<span class="tag">${esc(x.category)}</span>` : x.categories.map(c => `<span class="tag">${esc(typeLabel(c))}</span>`).join('')}</td>
          <td>${stateOf(x)[1]}</td>
          <td class="num">${isPost ? commentCount(x.id) : (x.featured ? '★' : '—')}</td>
          <td class="num">${AD.fmtDay(x.date)}</td>
        </tr>`).join('') || `<tr><td colspan="5"><div class="empty">${items.length ? 'Nothing matches.' : `No ${isPost ? 'entries' : 'projects'} yet. Add your first one.`}</div></td></tr>`;
    };
    ['#q', '#fState'].forEach(s => $(s).addEventListener('input', draw));
    $('#rows').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) AD.go(`#${kind}/${tr.dataset.id}`); });
    draw();
  }

  /* =====================================================================
     EDITOR
     ===================================================================== */
  function editor(kind, id) {
    const K = KINDS[kind];
    const existing = id !== 'new' && AD.DATA[K.list].find(x => x.id === id);
    if (id !== 'new' && !existing) { AD.toast(`That ${K.label} no longer exists`, true); AD.go(K.route); return; }
    const original = existing ? AD.clone(existing) : null;
    const p = existing ? AD.clone(existing) : K.blank();
    const isNew = !existing;
    let slugTouched = !!existing;
    let coverChanged = false;
    let restored = false;

    // A new item's in-progress text is kept in this browser, so an idle logout never loses work.
    // (Photos aren't kept: add them again after a restore.)
    const savedDraft = (() => { if (!isNew) return null; try { return JSON.parse(localStorage.getItem(K.draftKey)); } catch { return null; } })();
    let blocks = toBlocks(p[K.body]);
    if (savedDraft && (savedDraft.p?.title || (savedDraft.blocks || []).some(b => b.text))) {
      Object.assign(p, savedDraft.p, { id: null });
      blocks = (savedDraft.blocks || []).map(b => ({ style: b.style, text: b.text })); if (!blocks.length) blocks = toBlocks([]);
      slugTouched = !!p.slugTouched; restored = true;
    }
    AD.setTitle(existing ? `Edit ${K.label}` : `New ${K.label}`);
    const isLive = () => p.status === 'published';

    view.innerHTML = `
      <div class="editor">
        <form class="editor__form" id="pform" novalidate>
          ${restored ? '<div class="notice notice--demo" id="restored">Restored your unsaved draft. Photos need adding again. <button type="button" class="link" id="discard">Discard draft</button></div>' : ''}
          <div class="section">
            <h3>${K.title} <small>${existing ? `Published ${esc(AD.fmtDay(existing.date))}` : 'Not saved yet'}</small></h3>
            <label>Title<input name="title" maxlength="140" required value="${esc(p.title)}" placeholder="${kind === 'post' ? 'e.g. Where We Return DEVLOG #004' : 'e.g. Where We Return'}"></label>
            <label>Web address
              <div class="prefix"><span>${K.prefix}</span><input name="slug" maxlength="80" value="${esc(p.id || p.slug || '')}" placeholder="filled in from the title" ${existing ? 'disabled' : ''}></div>
              <span class="hint">${existing ? 'The address is fixed once saved, so links and comments keep working.' : 'Lowercase letters, numbers and dashes. Filled in from the title.'}</span>
            </label>
            ${K.fields(p)}
            <div class="field-row">
              <div><label style="margin-bottom:8px">Visibility</label>
                <div class="seg" id="status"><button type="button" data-v="draft" class="${!isLive() ? 'on' : ''}">Draft (hidden)</button><button type="button" data-v="published" class="${isLive() ? 'on' : ''}">Live on site</button></div></div>
              <label>Publish date <span class="hint">A future date schedules it</span><input name="date" type="datetime-local" value="${esc(AD.toInput(p.date))}"></label>
            </div>
          </div>

          <div class="section">
            <h3>Cover photo <small>Wide photos work best. Used as the hero on its own page.</small></h3>
            <div id="coverField"></div>
            <div id="cropHost"></div>
          </div>

          ${K.extraSections(p)}

          <div class="section">
            <h3>${kind === 'post' ? 'Entry' : 'Brief'} <small>Build it from blocks. Add photos between paragraphs.</small></h3>
            <div class="blocks" id="blocks"></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn btn--ghost btn--sm" id="addBlock">+ Add block</button>
              <button type="button" class="btn btn--ghost btn--sm" id="addPhoto">+ Add photo</button>
            </div>
          </div>

          <div class="savebar">
            ${existing ? '<button type="button" class="btn btn--danger btn--sm" id="del">Delete</button>' : ''}
            <span class="dirty" id="dirtyFlag" hidden>Unsaved changes</span>
            <span class="spacer"></span>
            ${existing && isLive() ? `<a class="btn btn--ghost btn--sm" href="${K.siteUrl(existing.id)}" target="_blank" rel="noopener">View on site</a>` : ''}
            <a class="btn btn--ghost btn--sm" href="${K.route}">Back</a>
            <button type="submit" class="btn">Save ${K.label}</button>
          </div>
        </form>
        ${AD.previewPanel(K.preview, 'seventhboar.com' + K.prefix + (p.id || 'new'))}
      </div>`;

    const form = $('#pform');
    const ctx = { cover: null, crop: null, blocks, extra: {} };

    const persistDraft = AD.debounce(() => {
      if (!isNew) return;
      try {
        const { image, banner, cardImage, cardBanner, icon, clientLogo, ...rest } = p;
        localStorage.setItem(K.draftKey, JSON.stringify({ p: { ...rest, slugTouched }, blocks: blocks.map(b => ({ style: b.style, text: b.text })) }));
      } catch { /* storage full or blocked: not fatal */ }
    }, 500);
    const send = AD.wirePreview(() => K.previewData(p, ctx));
    const changed = () => { AD.markDirty(); send(); persistDraft(); };

    ctx.cover = AD.photoField($('#coverField'), {
      value: p[K.cover] || null, aspect: '16/9',
      onChange: ph => { coverChanged = true; if (ph) ctx.crop.load(AD.photoSrc(ph)); else ctx.crop.hide(); changed(); },
    });
    ctx.crop = AD.cropTool($('#cropHost'), { onChange: changed });
    if (p[K.cover]) ctx.crop.load(AD.asset(p[K.cover]));
    ctx.extra = K.wireExtra(p, changed);
    ctx.blocks = blocks;
    const blockUi = AD.blockEditor($('#blocks'), blocks, changed);
    $('#addBlock').addEventListener('click', () => blockUi.add('paragraph'));
    $('#addPhoto').addEventListener('click', () => blockUi.add('photo'));

    const read = () => {
      p.title = form.title.value.trim();
      if (!slugTouched && isNew) form.slug.value = CMS.slugify(p.title);
      if (isNew) p.slug = form.slug.value.trim();
      p.date = form.date.value ? new Date(form.date.value).toISOString() : now();
      K.read(form, p);
      K.readExtra?.(form, p);
      $('#previewUrl').textContent = 'seventhboar.com' + K.prefix + (p.id || p.slug || 'new');
    };
    form.slug.addEventListener('input', () => { slugTouched = true; });
    form.addEventListener('input', e => { if (e.target.closest('.blocks, .crop, .client-links [data-on]')) return; read(); changed(); });
    form.addEventListener('change', e => { if (e.target.closest('.blocks')) return; read(); changed(); });
    $('#status').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      p.status = b.dataset.v;
      $$('#status button').forEach(x => x.classList.toggle('on', x === b));
      changed();
    });
    $('#discard')?.addEventListener('click', () => { try { localStorage.removeItem(K.draftKey); } catch { /* ignore */ } AD.dirty = false; editor(kind, 'new'); });
    read();
    if (restored) AD.dirty = true;

    // save
    form.addEventListener('submit', async e => {
      e.preventDefault();
      read();
      const slug = isNew ? p.slug : existing.id;
      if (!p.title) return AD.toast('Give it a title', true);
      if (!AD.SLUG_RE.test(slug || '')) return AD.toast('Web address can only use lowercase letters, numbers and dashes', true);
      if (isNew && AD.DATA[K.list].some(x => x.id === slug)) return AD.toast('Another one already uses that web address', true);
      const problem = K.validate(p, ctx);
      if (problem) return AD.toast(problem, true);
      if (isLive() && !ctx.cover.get()) return AD.toast('Add a cover photo before putting it live', true);
      if (isLive() && !AD.blocksDraft(blocks).some(b => b.text.trim() || b.image)) return AD.toast('Add some content before putting it live', true);
      const scheduled = isLive() && new Date(p.date) > new Date();
      const verb = !isLive() ? 'save this draft' : scheduled ? `schedule this for ${AD.fmtDate(p.date)}` : existing ? `save changes to "${p.title}"` : 'publish this';
      let saved;
      const ok = await AD.withWrite(`Enter your admin password to ${verb}.`, async () => {
        const cover = ctx.cover.get() ? await AD.uploadOne(ctx.cover.get(), K.folder) : '';
        let card = null;
        if (ctx.crop.hasImage()) {
          card = (!ctx.crop.isTouched() && !coverChanged && p[K.card]) ? p[K.card] : await AD.uploadDataUrl(ctx.crop.toDataUrl(), K.folder);
        }
        const body = await AD.blocksForSave(blocks, K.folder);
        const extra = await K.collectExtra(p, ctx);
        AD.progress('Saving…');
        const { slug: _s, slugTouched: _t, ...model } = p;
        saved = { ...model, id: slug, [K.cover]: cover, [K.card]: card, [K.body]: body, ...extra, date: p.date };
        await K.save(saved, isNew);
        // photos that are no longer used come out of storage
        const before = [original?.[K.cover], original?.[K.card], ...(original?.[K.body] || []).map(b => b.image), ...(original ? K.extraImages(original) : [])].filter(Boolean);
        const after = [saved[K.cover], saved[K.card], ...saved[K.body].map(b => b.image), ...K.extraImages(saved)].filter(Boolean);
        await CMS.removeImages(AD.dropped(before, after));
      });
      if (!ok) return;
      AD.dirty = false;
      if (isNew) { try { localStorage.removeItem(K.draftKey); } catch { /* ignore */ } }
      AD.toast(!isLive() ? 'Saved as a draft' : scheduled ? 'Scheduled' : "Saved. It's live on the site");
      const list = AD.DATA[K.list], at = list.findIndex(x => x.id === saved.id);
      at === -1 ? list.unshift(saved) : (list[at] = saved);
      if (isNew) { AD.ignoreHash = true; location.hash = `#${kind}/${saved.id}`; AD.lastHash = location.hash; }
      editor(kind, saved.id);
      AD.refreshLater();
    });

    $('#del')?.addEventListener('click', async () => {
      if (!confirm(`Delete "${existing.title}"? This removes it from the site${kind === 'post' ? ', with its comments,' : ''} and can't be undone.`)) return;
      const ok = await AD.withWrite(`Enter your admin password to delete "${existing.title}".`, () => K.del(existing));
      if (!ok) return;
      AD.toast(`${K.title} deleted`);
      AD.DATA[K.list] = AD.DATA[K.list].filter(x => x.id !== existing.id);
      AD.go(K.route);
      AD.refreshLater();
    });
  }

  AD.routes.devlog = () => listView('post');
  AD.routes.post = id => editor('post', id);
  AD.routes.projects = () => listView('project');
  AD.routes.project = id => editor('project', id);
  AD.navKey.post = 'devlog';
  AD.navKey.project = 'projects';
})();
