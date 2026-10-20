/* =========================================================
   Seventh Boar Development — public site behaviour (shared by every page)
   Content comes from CMS (Supabase, or demo data). Every stored
   string is passed through esc() before it's written into HTML.
   ========================================================= */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const PREVIEW = new URLSearchParams(location.search).has('preview');

// Only real image addresses get through: https, this site's own images, uploaded photos (demo) or a blob: preview.
const safeUrl = u => (/^(https:\/\/|\/assets\/|assets\/|data:image\/(webp|jpeg|png);base64,|blob:)/.test(u || '') ? u : '');
const imgSrc = (u, fallback = '/assets/images/Generic_Banner.png') => esc(safeUrl(u) || fallback);
// Only real addresses: this site's pages, or an https / mailto link the admin pasted.
const safeLink = u => (/^(https:\/\/|mailto:|\/|#|\.\/)/i.test(u || '') ? u : '');
const external = u => /^https:\/\//i.test(u || '');

const ICON = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  arrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5"><path d="m5 12 5 5 9-10"/></svg>',
  thumb: '<svg viewBox="0 0 24 24"><path d="M2 22h3V10H2v12zm19.83-11.55c.11-.25.17-.53.17-.83v-1.66C22 6.9 21.1 6 20 6h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 0 7.59 5.59C7.22 5.95 7 6.45 7 7v10.99c0 1.11.9 2.01 2.01 2.01H17c.83 0 1.54-.5 1.84-1.22l2.99-6.98z"/></svg>',
  rss: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6.18 17.82a2.18 2.18 0 100 4.36 2.18 2.18 0 000-4.36zM3 3v4c9.4 0 17 7.6 17 17h4C24 12.4 14.6 3 3 3zm0 8v4a10 10 0 0110 10h4A14 14 0 003 11z"/></svg>',
};
// "SEVENTH BOAR DEVELOPMENT" spelled out in binary, signed along the bottom of the footer.
const BINARY_NAME = [...'SEVENTH BOAR DEVELOPMENT'].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
const socialSvg = name => `<svg viewBox="0 0 24 24"><path d="${SOCIAL_ICON_PATHS[name] || SOCIAL_ICON_PATHS.website}"/></svg>`;

const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => new Date(d).toLocaleDateString('en-AU', opts);
const daysSince = d => (Date.now() - new Date(d).getTime()) / 86400e3;

// Shared state, filled by App.boot()
let SETTINGS = CMS.mergeSettings({});

const App = (() => {
  const CACHE_KEY = 'sb_settings_cache';
  let chromeSig = '';

  // The last settings this browser saw, so the header/footer are right from the first paint.
  function cachedSettings() {
    try { const v = JSON.parse(localStorage.getItem(CACHE_KEY)); return v ? CMS.mergeSettings(v) : null; } catch { return null; }
  }
  const cacheSettings = s => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch { /* private mode */ } };

  /* ---------------- chrome (header, footer, ticker) ---------------- */
  /* Pages: built-in ones can be switched off in Admin -> Pages, and pages made there join the menu. */
  const visible = key => !(SETTINGS.pages?.hidden || []).includes(key);
  const customPages = () => (SETTINGS.pages?.custom || []).filter(p => p && p.id && p.title && p.status === 'published');
  // The built-in page a path belongs to, if that page is switched off.
  const hiddenPageFor = path => SITE_PAGES.find(p => !visible(p.key) && p.paths.some(x => path.startsWith(x)));
  // [address, label, key] for the menu: Home, the visible built-in pages, your pages, then Contact last.
  function navItems() {
    const items = [['/', 'Home', 'home'], ...SITE_PAGES.filter(p => p.key !== 'contact' && visible(p.key)).map(p => [p.path, p.label, p.key])];
    customPages().filter(p => p.inNav !== false).forEach(p => items.push([customPageUrl(p.id), p.navLabel || p.title, 'p:' + p.id]));
    if (visible('contact')) items.push(['/contact/', 'Contact', 'contact']);
    return items;
  }
  const footerLink = (href, label) => `<li><a href="${esc(href)}">${esc(label)}</a></li>`;

  const logoHtml = () => `<a href="/" class="logo" aria-label="${esc(SITE.name)} home">
    <img class="logo__mark" src="${SITE.brand.mark}" alt="" width="44" height="44">
    <span><span class="logo__text">${esc(SITE.short)}</span><span class="logo__sub">Development</span></span></a>`;

  function renderChrome(active = document.body.dataset.page || '') {
    const s = SETTINGS;
    const sig = JSON.stringify([s.status, s.footer, s.socials, s.pages, active]);
    if (sig === chromeSig) return;
    chromeSig = sig;
    const socials = (s.socials || []).filter(x => x.label && safeLink(x.url));
    const NAV = navItems();
    const nav = NAV.map(([h, l, k]) => `<a href="${esc(h)}" class="${k === active ? 'active' : ''}"${k === active ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('');

    if (!$('#chrome-top')) { window.sbAccent?.apply(s.theme?.accent); return; }     // a page with its own layout (the welcome page)
    $('#chrome-top').innerHTML = `
      <a class="skip" href="#main">Skip to content</a>
      <header class="header">
        <div class="wrap header__row">
          <div style="display:flex;align-items:center;gap:6px">
            <button class="icon-btn menu-btn" aria-label="Open menu" data-open-menu>${ICON.menu}</button>
            ${logoHtml()}
          </div>
          <nav class="nav" aria-label="Primary">${nav}</nav>
          <div class="header__icons">${s.status ? `<span class="status-chip"><i></i>${esc(s.status)}</span>` : ''}<a class="btn nav-cta" href="/request/">Start a project</a></div>
        </div>
      </header>
      <div class="mobile-nav" aria-hidden="true">
        <div class="mobile-nav__top">${logoHtml()}<button class="icon-btn" data-close-menu aria-label="Close menu">${ICON.close}</button></div>
        ${NAV.map(([h, l]) => `<a class="big" href="${esc(h)}">${esc(l)}</a>`).join('')}
        <a class="big" href="/request/" style="color:var(--hot-text)">Start a project</a>
      </div>`;

    const email = s.footer.email || SITE.email;
    $('#chrome-bottom').innerHTML = `
      <footer class="footer">
        <div class="wrap">
          <div class="footer__grid">
            <div>
              ${logoHtml()}
              <p class="footer__motto">${esc(s.footer.tagline)}</p>
              <p style="max-width:380px;margin:0 0 18px">${esc(s.footer.blurb)}</p>
              <div class="socials">${socials.map(x => `<a href="${esc(safeLink(x.url))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(x.label)}" title="${esc(x.label)}">${socialSvg(iconFor(x.label, x.url))}</a>`).join('')}</div>
            </div>
            <div><h5>// Explore</h5><ul>${[['work', '/work/', 'Work'], ['devlog', '/devlog/', 'Devlog'], ['services', '/services/', 'Services']].filter(([k]) => visible(k)).map(([, h, l]) => footerLink(h, l)).join('')}${customPages().filter(p => p.inNav !== false).map(p => footerLink(customPageUrl(p.id), p.navLabel || p.title)).join('')}</ul></div>
            <div><h5>// Studio</h5><ul>${[['about', '/about/', 'About'], ['contact', '/contact/', 'Contact']].filter(([k]) => visible(k)).map(([, h, l]) => footerLink(h, l)).join('')}<li><a href="/privacy/">Privacy</a></li></ul></div>
            <div><h5>// Connect</h5><ul><li><a href="mailto:${esc(email)}">Email</a></li>${socials.map(x => `<li><a href="${esc(safeLink(x.url))}" target="_blank" rel="noopener noreferrer">${esc(x.label)}</a></li>`).join('')}${visible('devlog') ? '<li><a href="/devlog/feed.xml">RSS</a></li>' : ''}</ul></div>
          </div>
          <div class="footer__bottom">
            <span>© ${new Date().getFullYear()} ${esc(SITE.name)} · ${esc(s.footer.tagline)}</span>
            <span>${esc(email)}</span>
          </div>
          <span class="footer__binary" aria-hidden="true">${BINARY_NAME}</span>
        </div>
        <div class="footer__giant" aria-hidden="true" style="-webkit-mask-image:url('${SITE.brand.giant}');mask-image:url('${SITE.brand.giant}')"><span class="giant__liquid"><span class="giant__wave"></span></span></div>
      </footer>
      <div class="toast" role="status">${ICON.check}<span></span></div>`;

    // Brand accent from Admin -> Customise
    window.sbAccent?.apply(s.theme?.accent);
    if (!renderChrome.wired) {
      renderChrome.wired = true;
      document.addEventListener('click', onDocumentClick);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') $('.mobile-nav')?.classList.remove('open'); });
    }
  }

  function onDocumentClick(e) {
    if (PREVIEW && e.target.closest('a[href]')) { e.preventDefault(); return; }   // admin preview: stay on the page
    if (e.target.closest('a[href="#"]')) { e.preventDefault(); return; }
    const t = e.target.closest('[data-open-menu],[data-close-menu]');
    if (!t) return;
    $('.mobile-nav').classList.toggle('open', t.matches('[data-open-menu]'));
  }

  let toastTimer;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { document.body.insertAdjacentHTML('beforeend', `<div class="toast" role="status">${ICON.check}<span></span></div>`); t = $('.toast'); }
    $('span', t).textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------------- coming soon curtain ---------------- */
  function showComingSoon() {
    const badKey = CMS.previewKeyTried?.();
    CMS.forgetPreviewKey?.();          // it didn't work, so don't keep trying it on every page
    const c = { ...(CMS.mergeSettings({}).comingSoon || {}), ...(SETTINGS.comingSoon || {}) };
    const socials = (SETTINGS.socials || []).filter(x => x.label && safeLink(x.url));
    document.title = `${c.title || 'Coming soon'} — ${SITE.name}`;
    document.body.className = 'soon';
    document.body.innerHTML = `
      <main class="soon__wrap">
        <img class="soon__mark" src="${SITE.brand.mark}" alt="${esc(SITE.name)}">
        <span class="eyebrow">${esc(c.eyebrow || '')}</span>
        <h1 class="display">${esc(c.title || 'Something\'s coming.')}</h1>
        <p>${esc(c.text || '')}</p>
        ${c.showEmail === false ? '' : `<form class="soon__form" id="soon-notify">
          <input type="email" required maxlength="120" placeholder="Your email" aria-label="Your email">
          <button class="btn" type="submit">Notify me</button>
        </form>`}
        ${badKey ? `<p class="soon__bad">That preview link didn't work. It may have been cut short when it was copied, or replaced with a new one. Ask for a fresh link from Admin → Homepage &amp; settings.</p>` : ''}
        <div class="socials">${socials.map(x => `<a href="${esc(safeLink(x.url))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(x.label)}">${socialSvg(iconFor(x.label, x.url))}</a>`).join('')}</div>
      </main>`;
    $('#soon-notify')?.addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target, input = form.querySelector('input'), btn = form.querySelector('button');
      const email = input.value.trim();
      if (!email) return;
      btn.disabled = true; btn.textContent = 'Adding…';
      try {
        await CMS.subscribe(email);
        const done = document.createElement('div');
        done.className = 'soon__thanks';
        done.textContent = "You're on the list. See you at launch.";
        form.replaceWith(done);
      } catch (err) {
        let bad = $('.soon__bad');
        if (!bad) { bad = document.createElement('p'); bad.className = 'soon__bad'; form.after(bad); }
        bad.textContent = err.message;
        btn.disabled = false; btn.textContent = 'Notify me';
      }
    });
  }

  // Shown to whoever is looking around with the preview link while the site is closed.
  function previewBar() {
    if ($('.preview-bar')) return;
    document.body.insertAdjacentHTML('afterbegin',
      `<div class="preview-bar">Preview // the site is still closed to the public
         <button type="button" id="leave-preview">Leave preview</button></div>`);
    $('#leave-preview').addEventListener('click', () => { CMS.forgetPreviewKey?.(); location.href = location.pathname; });
  }

  /* ---------------- admin live preview ----------------
     The admin loads these pages in an iframe with ?preview and posts unsaved drafts in.
     Only messages from this same site, sent by the parent window, are accepted. */
  function previewData() {
    return new Promise(resolve => {
      let settled = false;
      const finish = data => { if (settled) return; settled = true; window.removeEventListener('message', onMsg); resolve(data); };
      const onMsg = e => { if (e.origin === location.origin && e.source === window.parent && e.data?.type === 'sb:preview-data') finish(e.data.data); };
      window.addEventListener('message', onMsg);
      window.parent.postMessage({ type: 'sb:preview-hello' }, location.origin);
      setTimeout(() => { if (!settled) CMS.loadPublic().then(finish, () => finish({ posts: [], projects: [], settings: SETTINGS })); }, 1500);
    });
  }
  function onPreview(handler) {
    if (!PREVIEW) return;
    window.addEventListener('message', e => {
      if (e.origin !== location.origin || e.source !== window.parent || e.data?.type !== 'sb:preview') return;
      // If drawing the draft ever fails, the preview would quietly freeze on the last good version
      // and look like the edits aren't saving. Say so instead.
      try { handler(e.data); previewProblem(false); }
      catch (err) { console.error(err); previewProblem(true); }
    });
    window.parent.postMessage({ type: 'sb:preview-ready' }, location.origin);
  }
  function previewProblem(show) {
    let bar = $('#preview-problem');
    if (!show) { bar?.remove(); return; }
    if (bar) return;
    document.body.insertAdjacentHTML('afterbegin',
      `<div id="preview-problem" class="preview-problem">This preview is out of date, so it has stopped following your edits.
         Press <b>Cmd/Ctrl + Shift + R</b> to refresh the admin. Your changes are still safe: save as normal.</div>`);
  }

  /* ---------------- boot ---------------- */
  // Every page calls this first. It draws the header/footer straight away (from the last
  // settings this browser saw), then loads the content and returns it.
  // Lifts the loading screen. A timer (not requestAnimationFrame, which background tabs pause) lets the
  // page's own script draw its content first.
  const shown = () => setTimeout(() => document.documentElement.classList.remove('is-loading'), 30);

  async function boot(active) {
    if (PREVIEW) document.documentElement.classList.remove('is-loading');   // the admin's live preview
    if (/\/index\.html$/.test(location.pathname) && /^https?:$/.test(location.protocol)) {
      history.replaceState(null, '', location.pathname.replace(/index\.html$/, '') + location.search + location.hash);
    }
    if (active) document.body.dataset.page = active;
    SETTINGS = cachedSettings() || SETTINGS;
    renderChrome(active);
    wireContactForm();
    let data;
    try {
      data = PREVIEW ? await previewData() : await CMS.loadPublic();
    } catch (err) {
      console.error(err);
      document.body.insertAdjacentHTML('afterbegin', '<div class="preview-problem">The site is having trouble loading. Please refresh in a moment.</div>');
      shown();
      return { settings: SETTINGS, posts: [], projects: [], failed: true };
    }
    SETTINGS = data.settings;
    // Closed to the public: the database held the content back, so there's nothing to show but the curtain.
    if (data.locked) { showComingSoon(); shown(); await new Promise(() => {}); }
    if (data.comingSoon) previewBar();
    if (!PREVIEW) cacheSettings(SETTINGS);
    renderChrome(active);
    // A page switched off in Admin -> Pages: say so instead of drawing it (the admin's own preview still shows it).
    const off = !PREVIEW && hiddenPageFor(location.pathname);
    if (off) { showUnavailable(); shown(); await new Promise(() => {}); }
    hideLinksToHiddenPages();
    shown();
    return data;
  }

  function showUnavailable() {
    document.title = `Page not available | ${SITE.name}`;
    document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="noindex">');
    const main = $('#main');
    if (!main) return;
    main.innerHTML = `
      <div class="page-head"><span class="corners"></span><div class="wrap">
        <div class="crumbs"><a href="/">Home</a></div>
        <h1 class="display">This page isn't<br><em>available.</em></h1>
        <p class="lead">It's switched off for now. Head back to the homepage, or tell us what you're after.</p>
        <div class="page-head__actions"><a class="btn" href="/">Back to home</a><a class="btn btn--ghost" href="/request/">Start a project</a></div>
      </div></div>`;
  }

  // Links in the page itself (buttons, "see all" links, cards) that point at a switched-off page are
  // hidden, including ones drawn later from the database.
  function hideLinksToHiddenPages() {
    if (PREVIEW || !SITE_PAGES.some(p => !visible(p.key))) return;
    const main = $('#main');
    if (!main) return;
    const sweep = () => $$('a[href]', main).forEach(a => {
      const url = new URL(a.getAttribute('href'), location.href);
      if (url.origin === location.origin && hiddenPageFor(url.pathname)) a.hidden = true;
    });
    sweep();
    new MutationObserver(sweep).observe(main, { childList: true, subtree: true });
  }

  // The contact page's form opens an email draft addressed to the studio.
  function wireContactForm() {
    const form = $('[data-contact-form]');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';
    form.addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(form);
      const head = [`Name: ${f.get('name') || ''}`, `Email: ${f.get('email') || ''}`, f.get('company') ? `Company: ${f.get('company')}` : '',
        f.get('reason') ? `Reason: ${f.get('reason')}` : ''].filter(Boolean).join('\n');
      const body = `${head}\n\n${f.get('message') || ''}`;
      // Existing-client help and site feedback go to support; new work and everything else to admin.
      const to = form.querySelector('[name="reason"]')?.selectedOptions[0]?.dataset.to === 'support' ? SITE.supportEmail : SITE.email;
      location.href = `mailto:${to}?subject=${encodeURIComponent(f.get('subject') || 'Website contact')}&body=${encodeURIComponent(body)}`;
    });
  }

  /* ---------------- shared markup: cards ---------------- */
  const projectMeta = p => (p.platforms || []).join(' · ') || typeLabel((p.categories || [])[0]);
  const Cards = {
    post(p) {
      const isNew = daysSince(p.date) < 14;
      return `<a class="card reveal" href="/post/?id=${encodeURIComponent(p.id)}">
        <div class="card__media"><img src="${imgSrc(p.cardImage || p.image)}" alt="" loading="lazy">
          <span class="card__badge">${esc(p.category)}</span>${isNew ? '<span class="stamp card__stamp">New</span>' : ''}<span class="corners"></span></div>
        <div class="card__info">
          <div class="card__sku"><span>Devlog // ${esc(fmtDate(p.date))}</span><span>${esc(p.author || '')}</span></div>
          <h3 class="card__name">${esc(p.title)}</h3>
          <p class="card__blurb">${esc(p.excerpt)}</p>
          <span class="card__more">Read entry ${ICON.arrow}</span>
        </div></a>`;
    },
    project(p) {
      return `<a class="card reveal" href="/project/?id=${encodeURIComponent(p.id)}">
        <div class="card__media"><img src="${imgSrc(p.cardBanner || p.banner)}" alt="" loading="lazy">
          <span class="card__badge">${esc(typeLabel((p.categories || [])[0]))}</span>${p.featured ? '<span class="stamp card__stamp">Featured</span>' : ''}<span class="corners"></span></div>
        <div class="card__info">
          <div class="card__sku"><span>Work // ${esc(projectMeta(p))}</span><span>${esc(fmtDate(p.date, { month: 'short', year: 'numeric' }))}</span></div>
          <h3 class="card__name">${esc(p.title)}</h3>
          <p class="card__blurb">${esc(p.tagline)}</p>
          <span class="card__more">View project ${ICON.arrow}</span>
        </div></a>`;
    },
  };

  // When the admin saves something in another tab of this browser, reload so it shows straight away.
  if (!PREVIEW && 'BroadcastChannel' in window) {
    new BroadcastChannel('sb-site').onmessage = e => { if (e.data?.type === 'content-changed') location.reload(); };
  }

  // The service cards (Websites, Apps...) shown on the homepage and the Services page.
  function servicesHtml(items) {
    return (items || []).filter(x => x.title).map((s, i) => {
      const link = safeLink(s.ctaUrl);
      const bullets = (s.bullets || []).filter(Boolean);
      return `<article class="service${i === 0 ? ' service--main' : ''} reveal">
        <span class="code">${esc(s.tag)}</span>
        <h3 class="display">${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
        ${bullets.length ? `<ul class="feature-list">${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        ${link && s.ctaText ? `<a class="btn${i ? ' btn--ghost' : ''}" href="${esc(link)}">${esc(s.ctaText)}</a>` : ''}
      </article>`;
    }).join('');
  }

  // The pricing tier cards (Home, Services, and the /hello/ welcome page).
  function pricingHtml(tiers) {
    return (tiers || []).filter(t => t && t.title).map(t => `
      <article class="tier reveal">
        ${t.tag ? `<span class="code">${esc(t.tag)}</span>` : ''}
        <h3 class="display">${esc(t.title)}</h3>
        <div class="tier__price">${esc(t.price)}</div>
        ${t.text ? `<p>${esc(t.text)}</p>` : ''}
        ${(t.bullets || []).length ? `<ul class="feature-list">${t.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        <a class="btn" href="/request/${t.kind === 'app' ? '?type=app' : ''}">Send a request</a>
      </article>`).join('');
  }

  return { boot, renderChrome, toast, Cards, onPreview, previewBar, servicesHtml, pricingHtml, visible, customPages };
})();
