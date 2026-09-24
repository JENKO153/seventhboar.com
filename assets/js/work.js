/* Work page: browse every published project with filters (type, platform), search and sort. */
(async function () {
  const data = await App.boot('work');
  const all = data.projects || [];
  const params = new URLSearchParams(location.search);
  const state = {
    types: new Set(params.getAll('type').filter(Boolean)),
    platforms: new Set(params.getAll('platform').filter(Boolean)),
    q: params.get('q') || '',
    sort: ['new', 'featured', 'az'].includes(params.get('sort')) ? params.get('sort') : 'new',
  };

  const platformsOf = p => (p.platforms || []).map(x => x.trim()).filter(Boolean);
  const counts = (list, keyOf) => {
    const c = new Map();
    list.forEach(p => keyOf(p).forEach(k => c.set(k, (c.get(k) || 0) + 1)));
    return c;
  };

  function drawFilters() {
    const types = counts(all, p => p.categories || []);
    $('#f-type').innerHTML = PROJECT_TYPES.filter(t => types.has(t.key)).map(t =>
      `<label class="check"><input type="checkbox" data-type="${esc(t.key)}" ${state.types.has(t.key) ? 'checked' : ''}>${esc(t.label)}<small>${types.get(t.key)}</small></label>`).join('')
      || '<span class="muted">Nothing yet</span>';
    const plats = counts(all, platformsOf);
    $('#f-platform-group').hidden = !plats.size;
    $('#f-platform').innerHTML = [...plats.keys()].sort().map(k =>
      `<label class="check"><input type="checkbox" data-platform="${esc(k)}" ${state.platforms.has(k) ? 'checked' : ''}>${esc(k)}<small>${plats.get(k)}</small></label>`).join('');
  }

  function matches(p) {
    if (state.types.size && !(p.categories || []).some(c => state.types.has(c))) return false;
    if (state.platforms.size && !platformsOf(p).some(x => state.platforms.has(x))) return false;
    if (state.q) {
      const hay = `${p.title} ${p.tagline} ${p.client || ''} ${platformsOf(p).join(' ')}`.toLowerCase();
      if (!hay.includes(state.q.toLowerCase())) return false;
    }
    return true;
  }

  function draw() {
    let list = all.filter(matches);
    if (state.sort === 'featured') list = [...list].sort((a, b) => (b.featured - a.featured) || (new Date(b.date) - new Date(a.date)));
    if (state.sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    $('#count').textContent = `${list.length} ${list.length === 1 ? 'project' : 'projects'}`;
    $('#grid').innerHTML = list.map(App.Cards.project).join('')
      || `<div class="no-results">${all.length ? 'No projects match those filters.' : 'No projects published yet. Check back soon.'}</div>`;
    window.ScrollReveal?.scan($('#grid'));
    // keep the address shareable
    const next = new URLSearchParams();
    state.types.forEach(t => next.append('type', t));
    state.platforms.forEach(t => next.append('platform', t));
    if (state.q) next.set('q', state.q);
    if (state.sort !== 'new') next.set('sort', state.sort);
    history.replaceState(null, '', location.pathname + (next.toString() ? `?${next}` : ''));
  }

  $('#filters').addEventListener('change', e => {
    const t = e.target;
    const [set, key] = t.dataset.type ? [state.types, t.dataset.type] : [state.platforms, t.dataset.platform];
    if (!key) return;
    t.checked ? set.add(key) : set.delete(key);
    draw();
  });
  $('#clear').addEventListener('click', () => { state.types.clear(); state.platforms.clear(); state.q = ''; $('#q').value = ''; drawFilters(); draw(); });
  $('#q').value = state.q;
  $('#q').addEventListener('input', e => { state.q = e.target.value.trim(); draw(); });
  $('#sort').value = state.sort;
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; draw(); });
  $('#filter-toggle').addEventListener('click', () => $('#filters').classList.toggle('open'));

  drawFilters();
  draw();
})();
