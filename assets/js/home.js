/* Seventh Boar — homepage. Every heading, promise, person, client quote and photo comes from
   Site settings (Admin -> Homepage & settings, and Team & clients). Project tiles and devlog
   cards come from the projects and devlog entries themselves. */
(async function () {
  let DATA = await App.boot('home');
  renderHome();

  // Admin -> live preview: unsaved settings arrive here and the page redraws.
  App.onPreview(msg => {
    if (!msg.settings) return;
    SETTINGS = CMS.mergeSettings(msg.settings);
    App.renderChrome();
    renderHome();
  });

  $$('[data-rail]').forEach(b => b.addEventListener('click', () => {
    const r = $('#rail'); r.scrollBy({ left: r.clientWidth * 0.75 * +b.dataset.rail, behavior: 'smooth' });
  }));
  $('#best-tabs').addEventListener('click', e => {
    const t = e.target.closest('.tab'); if (!t) return;
    $$('#best-tabs .tab').forEach(x => x.classList.toggle('active', x === t));
    renderDevlog(t.dataset.c);
  });
  $('#event-notify').addEventListener('submit', e => subscribe(e, "You're on the list for release news"));
  $('#news').addEventListener('submit', e => subscribe(e, SETTINGS.newsletter.thanks));
  setInterval(tick, 1000);

  async function subscribe(e, message) {
    e.preventDefault();
    const form = e.target;
    if (form.website?.value) return;                         // the hidden field: only bots fill it in
    const btn = form.querySelector('button'), input = form.querySelector('input[type=email]');
    const email = input.value.trim();
    if (!email) return;
    btn.disabled = true;
    try {
      if (PREVIEW) { App.toast('Preview only: sign-ups are switched off here'); return; }
      await CMS.subscribe(email);
      form.reset();
      App.toast(message);
    } catch (err) { App.toast(err.message); }
    finally { btn.disabled = false; }
  }

  // Shortcuts: set text, and set a link's text + address (hiding it when there's no address)
  function txt(sel, value) { const el = $(sel); if (el) el.textContent = value || ''; }
  function linkTo(sel, text, url) {
    const el = $(sel); if (!el) return;
    (el.querySelector('span') || el).textContent = text || '';
    el.href = safeLink(url) || '#';
    el.hidden = !text;
  }

  function renderHome() {
    const s = SETTINGS, h = s.hero;
    const projects = DATA.projects || [], posts = DATA.posts || [];

    // Hero
    $('#hero-img').src = safeUrl(h.image) || '/assets/images/Home_Page_Banner.jpg';
    txt('#hero-eyebrow', h.eyebrow);
    $('#hero-title').innerHTML = `${esc(h.line1)}${h.line2 ? `<br><em>${esc(h.line2)}</em>` : ''}`;
    txt('#hero-sub', h.subtitle);
    linkTo('#hero-cta', h.cta, h.ctaUrl || '/request/');
    linkTo('#hero-cta2', h.cta2, h.cta2Url || '/work/');
    const promises = (h.bar || []).filter(Boolean);
    const bar = $('#hero-bar');
    bar.innerHTML = promises.map((t, i) => `<div><small>0${i + 1} //</small>${esc(t)}</div>`).join('');
    bar.dataset.count = promises.length;
    bar.style.setProperty('--count', Math.max(1, promises.length));
    bar.hidden = !promises.length;

    renderServices();
    renderTypes(projects);
    renderLatest(projects);
    renderTeam();
    renderEvent();
    txt('#best-eyebrow', s.devlogSection.eyebrow);
    txt('#best-title', s.devlogSection.title);
    $('#devlog').hidden = !posts.length;
    renderDevlogTabs(posts);
    renderDevlog($('#best-tabs .tab.active')?.dataset.c || 'All');
    renderBuild();
    renderReports();

    const so = s.cta;
    $('#served').hidden = !so.show;
    txt('#served-title', so.title);
    txt('#served-text', so.text);
    linkTo('#served-cta', so.ctaText, so.ctaUrl);

    const nl = s.newsletter;
    $('#newsletter').hidden = !nl.show;
    txt('#news-eyebrow', nl.eyebrow);
    txt('#news-title', nl.title);
    txt('#news-text', nl.text);
    txt('#news-fine', nl.fine);
    window.ScrollReveal?.scan();
  }

  // Sec. 01: what the studio sells.
  function renderServices() {
    const sv = SETTINGS.servicesSection;
    $('#services').hidden = !sv.show;
    txt('#services-eyebrow', sv.eyebrow);
    txt('#services-title', sv.title);
    txt('#services-intro', sv.intro);
    $('#services-grid').innerHTML = App.servicesHtml(sv.items);
  }

  // Sec. 02: one slanted tile per kind of project that has something published.
  function renderTypes(projects) {
    const t = SETTINGS.typesSection;
    const tiles = PROJECT_TYPES.map(type => {
      const list = projects.filter(p => (p.categories || []).includes(type.key));
      return list.length ? { type, count: list.length, cover: list[0].cardBanner || list[0].banner } : null;
    }).filter(Boolean);
    $('#types').hidden = !tiles.length;
    txt('#types-eyebrow', t.eyebrow);
    txt('#types-title', t.title);
    txt('#types-link', t.link);
    const disc = $('#disc');
    disc.style.setProperty('--tiles', Math.max(tiles.length, 1));
    disc.innerHTML = tiles.map((x, i) => `
      <a href="/work/?type=${encodeURIComponent(x.type.key)}"><img src="${imgSrc(x.cover)}" alt="${esc(x.type.label)}" loading="lazy">
        <div class="disc__label"><span class="code">Type 0${i + 1} // ${x.count} ${x.count === 1 ? 'project' : 'projects'}</span><h3>${esc(x.type.label)}</h3></div></a>`).join('');
  }

  // Sec. 02: featured work first, then the newest.
  function renderLatest(projects) {
    const l = SETTINGS.latestSection;
    $('#latest').hidden = !projects.length;
    txt('#latest-eyebrow', l.eyebrow);
    txt('#latest-title', l.title);
    txt('#latest-intro', l.intro);
    const ordered = [...projects.filter(p => p.featured), ...projects.filter(p => !p.featured)].slice(0, 8);
    $('#rail').innerHTML = ordered.map(App.Cards.project).join('');
  }

  // Sec. 03: the people. Hidden until at least one is added in the admin.
  function renderTeam() {
    const t = SETTINGS.teamSection;
    txt('#team-eyebrow', t.eyebrow);
    txt('#team-title', t.title);
    txt('#team-intro', t.intro);
    linkTo('#team-cta', t.ctaText, t.ctaUrl);
    const people = (SETTINGS.team || []).filter(r => r.name);
    $('#team').hidden = !people.length;
    $('#team-grid').innerHTML = people.map(r => {
      const link = safeLink(r.link);
      return `<article class="rider">
        <div class="rider__img${r.image ? '' : ' rider__img--mark'}"><img src="${imgSrc(r.image, SITE.brand.mark)}" alt="${esc(r.name)}" loading="lazy">${r.number ? `<span class="rider__num">#${esc(r.number)}</span>` : ''}<span class="corners"></span></div>
        <div class="rider__body">
          <span class="eyebrow">${esc(r.role)}</span>
          <h3>${esc(r.name)}</h3>
          <div class="rider__stats">${personStats(r).map(x => `<div><b>${esc(x.value)}</b>${esc(x.label)}</div>`).join('')}</div>
          ${link ? `<a class="link-arrow" href="${esc(link)}"${external(link) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(r.linkText || 'Find out more')} ${ICON.arrow}</a>` : ''}
        </div>
      </article>`;
    }).join('');
  }
  // Home plus whatever stats suit the person.
  function personStats(r) {
    const stats = (r.stats || []).filter(x => x && (x.label || x.value));
    return [...(r.home ? [{ label: 'Based in', value: r.home }] : []), ...stats].slice(0, 4);
  }

  // Sec. 04: the countdown block. Either a release (a drop date) or an event (date + doors + venue).
  function renderEvent() {
    const ev = SETTINGS.release, event = ev.kind === 'event';
    $('#event').hidden = !ev.show;
    if (!ev.show) return;
    $('#event-img').src = safeUrl(ev.image) || '/assets/images/Home_Page_Banner.jpg';
    linkTo('#event-cta', ev.ctaText, ev.ctaUrl);
    const d = new Date(ev.date), valid = !!ev.date && !isNaN(d);
    txt('#event-eyebrow', `Sec. 05 // ${event ? 'Next event' : 'Next release'}`);
    $('#event-title').innerHTML = `${esc(ev.name)}${ev.round ? `<br><em>${esc(ev.round)}</em>` : ''}`;
    txt('#event-blurb', ev.blurb);
    $('#event-meta').innerHTML = [
      valid ? ['Date', d.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })] : null,
      valid && event ? ['Doors', d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })] : null,
      ev.place ? [event ? 'Venue' : 'Platform', ev.place] : null,
    ].filter(Boolean).map(([k, v]) => `<div><b>${esc(v)}</b>${k}</div>`).join('');
    $('#clock').hidden = !valid;
    tick();
  }
  function tick() {
    const ev = SETTINGS.release, event = ev.kind === 'event';
    if (!ev.show) return;
    const ms = new Date(ev.date) - Date.now();
    const valid = !!ev.date && !isNaN(ms);
    const t = Math.max(0, ms) / 1000 || 0;
    const v = { d: t / 86400, h: t / 3600 % 24, m: t / 60 % 60, s: t % 60 };
    $$('#clock b').forEach(b => { b.textContent = String(Math.floor(v[b.dataset.u])).padStart(2, '0'); });
    txt('#clock-label', !valid ? 'Coming soon' : ms > 0 ? (event ? 'Doors open in' : 'Releases in') : (event ? 'Live now' : 'Out now'));
  }

  // Sec. 05: latest devlog entries, with tabs for the categories in use.
  function renderDevlogTabs(posts) {
    const current = $('#best-tabs .tab.active')?.dataset.c || 'All';
    const counts = {};
    posts.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 4);
    const active = types.includes(current) ? current : 'All';
    $('#best-tabs').innerHTML = ['All', ...types].map(c => `<button class="tab ${c === active ? 'active' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
    $('#best-tabs').hidden = types.length < 2;
  }
  function renderDevlog(c) {
    const list = (DATA.posts || []).filter(p => c === 'All' || p.category === c).slice(0, 6);
    $('#best').innerHTML = list.map(App.Cards.post).join('') || '<p class="muted">Nothing here yet.</p>';
    window.ScrollReveal?.scan($('#best'));
  }

  // Sec. 06: the photos and the spec table.
  function renderBuild() {
    const t = SETTINGS.build;
    $('#build').hidden = !t.show;
    if (!t.show) return;
    txt('#build-eyebrow', t.eyebrow);
    txt('#build-title', t.title);
    txt('#build-intro', t.intro);
    linkTo('#build-cta', t.cta, t.ctaUrl || '/work/');
    const imgs = (t.images || []).filter(Boolean);
    $('#build-imgs').hidden = !imgs.length;
    $('#build .field').classList.toggle('field--solo', !imgs.length);
    $('#build-imgs').innerHTML = imgs.map((src, i) => `<div><img src="${imgSrc(src)}" alt="" loading="lazy">${i === 0 ? '<span class="corners"></span>' : ''}</div>`).join('');
    $('#build-specs').innerHTML = (t.specs || []).filter(r => r.label || r.value)
      .map(r => `<tr><td>${esc(r.label)}</td><td>${esc(r.value)}</td></tr>`).join('');
  }

  // Sec. 07: what clients say, plus an optional photo strip.
  function renderReports() {
    const s = SETTINGS;
    txt('#reports-eyebrow', s.reportsSection.eyebrow);
    txt('#reports-title', s.reportsSection.title);
    const initials = name => String(name || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const all = (s.reports || []).filter(r => r.quote).slice(0, 9);
    const igList = (s.ig || []).filter(x => x.image);
    $('#reports-section').hidden = !all.length && !igList.length;
    $('#reports').hidden = !all.length;
    $('#reports').innerHTML = all.map(r => `
      <blockquote class="report">
        <div class="report__top"><span class="stars">${'★'.repeat(Math.max(1, Math.min(5, +r.stars || 5)))}</span>${r.verified ? '<span class="verified">✔ Client</span>' : ''}</div>
        <q>${esc(r.quote)}</q>
        <footer><i>${esc(initials(r.name))}</i><div>${esc(r.name)}<small>${esc(r.meta)}</small></div></footer>
      </blockquote>`).join('');
    // Photo strip: each photo opens its own link if one was pasted.
    $('#ig').innerHTML = igList.map(x => {
      const u = safeLink(x.url);
      return `<a href="${esc(u || '#')}"${u && external(u) ? ' target="_blank" rel="noopener noreferrer"' : ''}><img src="${imgSrc(x.image)}" alt="" loading="lazy"></a>`;
    }).join('');
  }
})();
