/* Seventh Boar Development — motion. The premium layer over the site:

     - labels decode from binary into their real text as they come into view
     - big headlines rise word by word out of a mask
     - the hero assembles itself once the page has loaded
     - cards tilt towards the pointer, with a glare that follows it
     - buttons lean magnetically towards the cursor
     - backdrop photos drift at their own pace as you scroll
     - a reticle cursor trails the pointer and locks around whatever you're about to click
     - moving to another page shows the loading screen: the boar mark, with its binary typing out
     - a progress line across the top fills as you scroll

   Nothing here runs with "reduce motion" on. Tilt, magnet and cursor only run with a real mouse.
   The admin's live preview (?preview) gets none of it, so drafts don't animate on every keystroke. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const preview = new URLSearchParams(location.search).has('preview');
  if (reduce || preview) return;
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  root.classList.add('motion');
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const BITS = '01';
  const bit = () => BITS[(Math.random() * 2) | 0];

  /* ---------------- wait for the page ----------------
     Pages fade in once site.js has drawn them (html.is-loading). Entrances wait for that,
     so nothing plays to an empty screen. */
  function whenShown(fn) {
    if (!root.classList.contains('is-loading')) return fn();
    const mo = new MutationObserver(() => {
      if (!root.classList.contains('is-loading')) { mo.disconnect(); fn(); }
    });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------------- progress line ---------------- */
  const bar = document.createElement('div');
  bar.className = 'scroll-line';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  /* ---------------- decode: labels resolve out of binary ----------------
     Only the text nodes change, and these labels are set in a fixed-width font, so the
     layout never shifts while it runs. */
  const DECODE = '.eyebrow, .code, .crumbs, .hero__grid span, .card__sku span, .card__badge, .status-chip, .footer h5, .clock__label';
  function decode(el) {
    if (el.dataset.decoded) return;
    el.dataset.decoded = '1';
    const nodes = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) if (walk.currentNode.data.trim()) nodes.push(walk.currentNode);
    if (!nodes.length) return;
    const finals = nodes.map(n => n.data);
    const total = finals.reduce((a, s) => a + s.length, 0);
    if (total > 90) return;                              // long text just appears
    const dur = Math.min(600, 260 + total * 9), t0 = performance.now();
    el.setAttribute('aria-label', finals.join(''));
    let last = null;
    (function frame(now) {
      // Something else rewrote the label mid-decode (e.g. content loading in): leave its new text alone.
      if (last && nodes.some((n, i) => !n.isConnected || n.data !== last[i])) { el.removeAttribute('aria-label'); return; }
      const p = Math.min(1, (now - t0) / dur);
      let seen = 0;
      nodes.forEach((n, i) => {
        const f = finals[i];
        let out = '';
        for (let k = 0; k < f.length; k++, seen++) {
          const ch = f[k];
          out += (ch === ' ' || ch === '/' || seen / total < p) ? ch : bit();
        }
        n.data = out;
      });
      last = nodes.map(n => n.data);
      if (p < 1) requestAnimationFrame(frame);
      else { nodes.forEach((n, i) => { n.data = finals[i]; }); el.removeAttribute('aria-label'); }
    })(t0);
  }

  /* ---------------- headlines rise word by word ----------------
     Each word sits in a mask and slides up into it. Split at the moment it comes into view,
     so headings filled in from the database are split with their real words. */
  const HEADLINES = '.hero h1, .page-head h1, .section-head h2, .event h2, .newsletter h2, .spec h2, .wl-hero h1, .wl-connect h2, .article-head h1, .pdp__info h1, .soon__wrap .display';
  function rise(h) {
    if (h.dataset.risen) return;
    h.dataset.risen = '1';
    const texts = [];
    const walk = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) if (walk.currentNode.data.trim()) texts.push(walk.currentNode);
    let i = 0;
    texts.forEach(node => {
      const frag = document.createDocumentFragment();
      node.data.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const w = document.createElement('span'); w.className = 'w';
        const inner = document.createElement('span'); inner.className = 'w__i';
        inner.style.transitionDelay = `${Math.min(i++ * 40, 360)}ms`;
        inner.textContent = part;
        w.appendChild(inner); frag.appendChild(w);
      });
      node.replaceWith(frag);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => h.classList.add('risen')));
  }

  /* one observer for everything that animates as it arrives */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    if (e.target.matches(HEADLINES)) rise(e.target);
    if (e.target.matches(DECODE)) decode(e.target);
  }), { threshold: 0.2, rootMargin: '0px 0px -30px 0px' });
  const watched = new WeakSet();
  function scan() {
    $$(`${HEADLINES}, ${DECODE}`).forEach(el => {
      if (watched.has(el) || !el.textContent.trim()) return;
      watched.add(el); io.observe(el);
    });
    if (mouse) wireTilt();
  }

  /* ---------------- tilt + glare ---------------- */
  const TILT = '.card .card__media, .service, .tier, .rider, .report, .pdp__hero, .article-hero';
  function wireTilt() {
    $$(TILT).forEach(el => {
      if (el.dataset.tilt) return;
      el.dataset.tilt = '1';
      el.classList.add('tilt');
      const host = el.closest('.card') || el;
      const max = el.matches('.card__media, .pdp__hero, .article-hero') ? 7 : 4;
      host.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--rx', `${((0.5 - y) * max).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${((x - 0.5) * max).toFixed(2)}deg`);
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        el.classList.add('tilting');
      });
      host.addEventListener('pointerleave', () => {
        el.classList.remove('tilting');
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------------- magnetic buttons ---------------- */
  if (mouse) {
    document.addEventListener('pointermove', e => {
      const b = e.target.closest?.('.btn, .rail-ctrls button, .socials a');
      if (!b) return;
      const r = b.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      b.style.setProperty('--bx', `${(dx * 10).toFixed(1)}px`);
      b.style.setProperty('--by', `${(dy * 8).toFixed(1)}px`);
      b.classList.add('magnet');
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const b = e.target.closest?.('.magnet');
      if (b && !b.contains(e.relatedTarget)) { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); }
    }, { passive: true });
  }

  /* ---------------- reticle cursor ----------------
     The site's corner brackets, following the pointer. Over anything clickable it locks
     around it, like a sight settling on a target. The normal cursor stays, so nothing
     about using the page changes. */
  if (mouse) {
    const ret = document.createElement('div');
    ret.className = 'reticle';
    ret.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ret);
    let px = -100, py = -100, x = -100, y = -100, w = 22, h = 22, tw = 22, th = 22, lockEl = null, on = false;
    const LOCK = 'a, button, [role="button"], .card, select, label.check, summary';
    document.addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      if (!on) { on = true; x = px; y = py; ret.classList.add('on'); }
      const t = e.target.closest?.(LOCK);
      lockEl = t && !t.closest('.mobile-nav, .reticle') ? t : null;
      ret.classList.toggle('locked', !!lockEl);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { on = false; ret.classList.remove('on'); });
    document.addEventListener('pointerdown', () => ret.classList.add('press'));
    document.addEventListener('pointerup', () => ret.classList.remove('press'));
    (function loop() {
      let cx = px, cy = py;
      tw = th = 22;
      if (lockEl && lockEl.isConnected) {
        const r = (lockEl.closest('.card') ? lockEl.closest('.card').querySelector('.card__media') || lockEl : lockEl).getBoundingClientRect();
        cx = r.left + r.width / 2; cy = r.top + r.height / 2;
        tw = r.width + 14; th = r.height + 14;
      }
      x += (cx - x) * 0.22; y += (cy - y) * 0.22;
      w += (tw - w) * 0.2; h += (th - h) * 0.2;
      ret.style.transform = `translate3d(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px, 0)`;
      ret.style.width = `${w.toFixed(1)}px`; ret.style.height = `${h.toFixed(1)}px`;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------- scroll: progress line + parallax ---------------- */
  const DRIFT = '.hero__img img, .page-head__bg, .newsletter__bg img, .event__bg img, .wl-hero__img img';
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      const vh = innerHeight;
      $$(DRIFT).forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);   // -1 … 1 through the screen
        el.style.translate = `0 ${(p * -26).toFixed(1)}px`;
      });
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });

  /* ---------------- page changes: the loading screen, every time ----------------
     Clicking through: the page fades out and the loader (pulsing mark, binary typing out) comes
     up straight away. The next page opens on that same loader and holds it until the page is
     drawn and the loader has had a moment on screen, then fades in. */
  const NAV = 'sb-nav', MIN_LOADER = 650;
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || /^\/admin\//.test(url.pathname) || /\.(xml|pdf|png|jpe?g|webp)$/i.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;   // same page, # links
    e.preventDefault();
    try { sessionStorage.setItem(NAV, String(Date.now())); } catch { /* private mode: still navigates */ }
    root.classList.add('is-nav');
    setTimeout(() => { location.href = url.href; }, 260);
  });
  let navAt = 0;
  try { navAt = +sessionStorage.getItem(NAV) || 0; sessionStorage.removeItem(NAV); } catch { /* ignore */ }
  if (navAt && Date.now() - navAt < 6000) {
    root.classList.add('is-nav');
    const lift = () => root.classList.remove('is-nav');
    whenShown(() => setTimeout(lift, Math.max(0, MIN_LOADER - (Date.now() - navAt))));
    setTimeout(lift, 7000);                      // never stay on the loader
  }
  // Back/forward can restore the page exactly as it was left: under the loader. Bring it back.
  addEventListener('pageshow', e => { if (e.persisted) root.classList.remove('is-nav'); });

  /* ---------------- start ---------------- */
  // Safety nets: the hero always finishes assembling, and no headline already on screen is
  // ever left waiting on an observer that didn't fire.
  setTimeout(() => root.classList.add('motion-in'), 9000);
  whenShown(() => setTimeout(() => $$(HEADLINES).forEach(h => {
    const r = h.getBoundingClientRect();
    if (h.textContent.trim() && r.top < innerHeight && r.bottom > 0) rise(h);
  }), 2500));

  whenShown(() => {
    root.classList.add('motion-in');            // the hero assembles itself
    scan(); onScroll();
    // Sections are filled in from the database after load: keep catching new headings and cards.
    let t;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 80); })
      .observe(document.body, { childList: true, subtree: true });
  });
})();
