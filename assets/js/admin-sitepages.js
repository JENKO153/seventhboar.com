/* Seventh Boar admin: Pages. Switch the built-in pages (Work, Services, Devlog, About, Contact) on and off,
   and add, edit or delete pages of your own. Everything here lives in the site settings
   (settings.pages), so it saves through the same password-confirmed write as the homepage. */
(function () {
  const { $, $$, esc, view } = AD;
  const pages = () => AD.DATA.settings.pages || { hidden: [], custom: [] };
  // The site settings have a size cap in the database (100 KB); stay well inside it.
  const MAX_SETTINGS = 90000;

  async function savePages(nextPages) {
    const next = { ...AD.clone(AD.DATA.settings), pages: nextPages };
    if (JSON.stringify(next).length > MAX_SETTINGS) {
      throw new Error('That is more than the site settings can hold. Shorten some page text, or split it across fewer pages.');
    }
    await CMS.saveSettings(next);
    AD.DATA.settings = CMS.mergeSettings(next);
  }
  // Starter pages (data.js) that aren't in the saved list yet: a saved list replaces the defaults, so offer them here.
  const missingStarters = () => STARTER_PAGES.filter(sp => !(pages().custom || []).some(c => c.id === sp.id));
  const WHERE_LABEL = { both: 'Menu and footer', footer: 'Footer', none: 'Nowhere' };
  const stateTag = p => (p.status === 'published' ? '<span class="tag tag--ok">Live</span>' : '<span class="tag">Draft</span>');

  /* =====================================================================
     LIST: built-in pages on/off + your pages
     ===================================================================== */
  function list() {
    AD.setTitle('Pages');
    const { hidden = [], custom = [] } = pages();
    view.innerHTML = `
      <div class="panel">
        <div class="panel__head"><h2>Main pages</h2></div>
        <div class="panel__body">
          <p class="hint" style="margin:0 0 14px">A hidden page comes out of the menu and footer, links to it disappear, and anyone who goes to its address is told it isn't available. Switch it back on any time and everything returns as it was.</p>
          <div class="table-wrap"><table>
            <thead><tr><th>Page</th><th>What hiding it does</th><th class="num">On the site</th></tr></thead>
            <tbody>
              <tr><td><b>Home</b><br><small class="muted">/</small></td><td class="muted">Always on.</td><td class="num"><span class="tag tag--ok">Showing</span></td></tr>
              ${SITE_PAGES.map(p => {
                const off = hidden.includes(p.key);
                return `<tr>
                  <td><b>${esc(p.label)}</b><br><small class="muted">${esc(p.path)}</small></td>
                  <td class="muted">${esc(p.note || '')}</td>
                  <td class="num"><div class="seg" data-key="${esc(p.key)}">
                    <button type="button" data-v="on" class="${off ? '' : 'on'}">Showing</button><button type="button" data-v="off" class="${off ? 'on' : ''}">Hidden</button>
                  </div></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>
        </div>
      </div>

      ${missingStarters().length ? `<div class="notice notice--demo" style="margin:14px 0 0;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <span style="flex:1;min-width:240px"><b>Starter pages ready to add:</b> ${missingStarters().map(x => esc(x.navLabel || x.title)).join(', ')}. Written for you to edit; they go live as soon as they're added.</span>
        <button type="button" class="btn btn--sm" id="addStarters">Add ${missingStarters().length === 1 ? 'it' : 'them'} to the site</button></div>` : ''}

      <div class="panel" style="margin-top:14px">
        <div class="toolbar">
          <h2 style="margin:0;font-size:inherit">Your pages</h2>
          <span style="flex:1"></span>
          <a class="btn" href="#page/new">+ New page</a>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Page</th><th>Address</th><th>Linked from</th><th class="num">Status</th></tr></thead>
          <tbody id="customRows">
            ${custom.map(p => `
              <tr data-id="${esc(p.id)}">
                <td><b>${esc(p.title)}</b>${p.intro ? `<br><small class="muted">${esc(p.intro)}</small>` : ''}</td>
                <td><code>${esc(customPageUrl(p.id))}</code></td>
                <td>${WHERE_LABEL[pageWhere(p)]}${p.group === 'industry' ? ' · Services page' : ''}</td>
                <td class="num">${stateTag(p)}</td>
              </tr>`).join('') || '<tr><td colspan="4"><div class="empty">No pages of your own yet. Add one for an FAQ, hosting plans, or anything else.</div></td></tr>'}
          </tbody>
        </table></div>
      </div>`;

    $$('.seg[data-key]').forEach(seg => seg.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      const key = seg.dataset.key, hide = b.dataset.v === 'off';
      const now = pages().hidden || [];
      if (now.includes(key) === hide) return;
      const label = SITE_PAGES.find(p => p.key === key).label;
      const ok = await AD.withWrite(`Enter your admin password to ${hide ? 'hide' : 'show'} the ${label} page.`, () =>
        savePages({ ...pages(), hidden: hide ? [...now, key] : now.filter(k => k !== key) }));
      if (!ok) return;
      AD.toast(hide ? `${label} is hidden from the site` : `${label} is back on the site`);
      list();
      AD.refreshLater();
    }));
    $('#addStarters')?.addEventListener('click', async () => {
      const add = missingStarters();
      const ok = await AD.withWrite(`Enter your admin password to add ${add.length} starter page${add.length === 1 ? '' : 's'} to the site.`, () =>
        savePages({ ...pages(), custom: [...(pages().custom || []), ...add.map(x => AD.clone(x))] }));
      if (!ok) return;
      AD.toast(`Added ${add.length} page${add.length === 1 ? '' : 's'}. They're live on the site`);
      list();
      AD.refreshLater();
    });
    $('#customRows').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) AD.go(`#page/${tr.dataset.id}`); });
  }

  /* =====================================================================
     EDITOR: one page of your own
     ===================================================================== */
  const toBlocks = list => {
    const b = (list || []).map(x => ({ style: x.style || 'paragraph', text: x.text || '', ph: x.image ? { url: x.image } : null }));
    return b.length ? b : [{ style: 'paragraph-lg', text: '' }];
  };
  // Addresses already taken by the site itself would be confusing as page names.
  const RESERVED = new Set(['new', ...SITE_PAGES.map(p => p.key), 'home', 'request', 'track', 'privacy', 'admin', 'hello', 'post', 'project']);

  function editor(id) {
    const existing = id !== 'new' && (pages().custom || []).find(p => p.id === id);
    if (id !== 'new' && !existing) { AD.toast('That page no longer exists', true); AD.go('#pages'); return; }
    const isNew = !existing;
    const p = existing ? AD.clone(existing) : { id: null, title: '', navLabel: '', intro: '', image: '', blocks: [], inNav: true, where: 'both', group: '', faq: false, status: 'draft' };
    const blocks = toBlocks(p.blocks);
    let slugTouched = !!existing;
    AD.setTitle(existing ? 'Edit page' : 'New page');
    const isLive = () => p.status === 'published';

    view.innerHTML = `
      <div class="editor">
        <form class="editor__form" id="pgform" novalidate>
          <div class="section">
            <h3>Page <small>${existing ? 'Saved' : 'Not saved yet'}</small></h3>
            <label>Title<input name="title" maxlength="80" required value="${esc(p.title)}" placeholder="e.g. Hosting & care plans"></label>
            <label>Web address
              <div class="prefix"><span>/p/?id=</span><input name="slug" maxlength="60" value="${esc(p.id || '')}" placeholder="filled in from the title" ${existing ? 'disabled' : ''}></div>
              <span class="hint">${existing ? 'The address is fixed once saved, so links keep working.' : 'Lowercase letters, numbers and dashes. Filled in from the title.'}</span>
            </label>
            <label>Intro <span class="hint">Optional. A line or two under the title.</span><textarea name="intro" rows="2" maxlength="300" style="min-height:70px">${esc(p.intro || '')}</textarea></label>
            <div class="field-row">
              <label>Menu label <span class="hint">Optional, a shorter name for the menu</span><input name="navLabel" maxlength="24" value="${esc(p.navLabel || '')}" placeholder="${esc(p.title || 'Hosting')}"></label>
              <label>Where it's linked<select name="where"><option value="both">Menu and footer</option><option value="footer">Footer only</option><option value="none">Nowhere (link it yourself)</option></select></label>
            </div>
            <div class="field-row">
              <label>Kind of page <span class="hint">Industry pages are listed on the Services page</span><select name="group"><option value="">General: guides, FAQ, plans…</option><option value="industry">Industry or local page</option></select></label>
              <div style="align-self:end;padding-bottom:12px"><label class="toggle"><input type="checkbox" name="faq" ${p.faq ? 'checked' : ''}>This is a Q&amp;A page</label><span class="hint" style="display:block">A title or subtitle is a question and the text under it is the answer. Adds search-engine markup.</span></div>
            </div>
            <div><label style="margin-bottom:8px">Visibility</label>
              <div class="seg" id="status"><button type="button" data-v="draft" class="${!isLive() ? 'on' : ''}">Draft (hidden)</button><button type="button" data-v="published" class="${isLive() ? 'on' : ''}">Live on site</button></div>
              <p class="hint" style="margin:8px 0 0">Drafts don't appear on the site, but they aren't private either. Don't put anything secret in one.</p></div>
          </div>

          <div class="section">
            <h3>Header photo <small>Optional. Sits behind the title, like the other pages. Leave it empty for the default banner.</small></h3>
            <div id="headerField"></div>
          </div>

          <div class="section">
            <h3>Content <small>Build it from blocks. Add photos between paragraphs.</small></h3>
            ${AD.pastePanel('page')}
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
            ${existing && isLive() ? `<a class="btn btn--ghost btn--sm" href="${esc(customPageUrl(existing.id))}" target="_blank" rel="noopener">View on site</a>` : ''}
            <a class="btn btn--ghost btn--sm" href="#pages">Back</a>
            <button type="submit" class="btn">Save page</button>
          </div>
        </form>
        ${AD.previewPanel('/p/?preview=1', 'seventhboar.com' + customPageUrl(p.id || 'new'))}
      </div>`;

    const form = $('#pgform');
    form.where.value = pageWhere(p); form.group.value = p.group || '';
    const header = AD.photoField($('#headerField'), { value: p.image || null, aspect: '16/6', onChange: () => changed() });
    const draft = () => ({ page: {
      ...p, image: header.get() ? AD.photoDraft(header.get()) : '',
      blocks: AD.blocksDraft(blocks),
    } });
    const send = AD.wirePreview(draft);
    const changed = () => { AD.markDirty(); send(); };

    const fill = { title: t => { if (!form.title.value.trim()) { form.title.value = t; read(); } } };
    const blockUi = AD.blockEditor($('#blocks'), blocks, changed, fill);
    $('#addBlock').addEventListener('click', () => blockUi.add('paragraph'));
    $('#addPhoto').addEventListener('click', () => blockUi.add('photo'));
    AD.wirePastePanel(form, blocks, blockUi, changed, fill);

    const read = () => {
      p.title = form.title.value.trim();
      if (isNew && !slugTouched) form.slug.value = CMS.slugify(p.title).slice(0, 60);
      p.intro = form.intro.value.trim();
      p.navLabel = form.navLabel.value.trim();
      p.where = form.where.value; p.group = form.group.value; p.faq = form.faq.checked; p.inNav = p.where !== 'none';
      $('#previewUrl').textContent = 'seventhboar.com' + customPageUrl((isNew ? form.slug.value.trim() : p.id) || 'new');
    };
    form.slug.addEventListener('input', () => { slugTouched = true; });
    form.addEventListener('input', e => { if (e.target.closest('.blocks, .paste')) return; read(); changed(); });
    form.addEventListener('change', e => { if (e.target.closest('.blocks')) return; read(); changed(); });
    $('#status').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      p.status = b.dataset.v;
      $$('#status button').forEach(x => x.classList.toggle('on', x === b));
      changed();
    });
    read();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      read();
      const slug = isNew ? form.slug.value.trim() : existing.id;
      const others = (pages().custom || []).filter(x => x.id !== (existing && existing.id));
      if (!p.title) return AD.toast('Give the page a title', true);
      if (!AD.SLUG_RE.test(slug || '')) return AD.toast('Web address can only use lowercase letters, numbers and dashes', true);
      if (isNew && (RESERVED.has(slug) || others.some(x => x.id === slug))) return AD.toast('That web address is already taken. Try another.', true);
      if (isLive() && !p.intro && !AD.blocksDraft(blocks).some(b => b.text.trim() || b.image)) return AD.toast('Add some content before putting it live', true);
      const before = [existing?.image, ...(existing?.blocks || []).map(b => b.image)].filter(Boolean);
      let saved;
      const ok = await AD.withWrite(`Enter your admin password to ${isLive() ? (existing ? `save "${p.title}"` : 'publish this page') : 'save this draft'}.`, async () => {
        const image = header.get() ? await AD.uploadOne(header.get(), 'pages') : '';
        const body = await AD.blocksForSave(blocks, 'pages');
        AD.progress('Saving…');
        saved = { id: slug, title: p.title, navLabel: p.navLabel, intro: p.intro, image, blocks: body, inNav: p.inNav, where: p.where, group: p.group, faq: p.faq, status: p.status };
        const custom = existing ? (pages().custom || []).map(x => (x.id === existing.id ? saved : x)) : [...(pages().custom || []), saved];
        await savePages({ ...pages(), custom });
        await CMS.removeImages(AD.dropped(before, [saved.image, ...saved.blocks.map(b => b.image)].filter(Boolean)));
      });
      if (!ok) return;
      AD.dirty = false;
      AD.toast(isLive() ? "Saved. It's live on the site" : 'Saved as a draft');
      if (isNew) { AD.ignoreHash = true; location.hash = `#page/${saved.id}`; AD.lastHash = location.hash; }
      editor(saved.id);
      AD.refreshLater();
    });

    $('#del')?.addEventListener('click', async () => {
      if (!confirm(`Delete "${existing.title}"? It comes off the site straight away and can't be undone.`)) return;
      const ok = await AD.withWrite(`Enter your admin password to delete "${existing.title}".`, async () => {
        await savePages({ ...pages(), custom: (pages().custom || []).filter(x => x.id !== existing.id) });
        await CMS.removeImages(AD.dropped([existing.image, ...(existing.blocks || []).map(b => b.image)].filter(Boolean), []));
      });
      if (!ok) return;
      AD.toast('Page deleted');
      AD.go('#pages');
      AD.refreshLater();
    });
  }

  AD.routes.pages = list;
  AD.routes.page = editor;
  AD.navKey.page = 'pages';
})();
