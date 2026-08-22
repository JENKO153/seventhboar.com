/* Sitewide scroll-reveal: fades/slides in any .reveal, .reveal-left,
   .reveal-right, or .reveal-group element as it enters the viewport.
   Pages that render content dynamically (post grids, etc.) should call
   ScrollReveal.observe(el) right after rendering, since it won't exist yet
   for the initial DOMContentLoaded scan. */
window.ScrollReveal = (function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const observer = prefersReduced ? null : new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) reveal(entry.target);
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

  function reveal(el) {
    if (observer) observer.unobserve(el);
    if (el.__revealFallback) {
      clearTimeout(el.__revealFallback);
      el.__revealFallback = null;
    }
    // If the element already satisfies the intersection threshold the
    // instant observe() starts watching it (very common on short mobile
    // viewports), the class can flip before the browser ever paints the
    // hidden starting state — the fade/slide then has nothing to animate
    // from and just snaps straight to visible. Deferring a frame guarantees
    // that first paint happens first, so the transition always plays.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add('is-visible');
      });
    });
  }

  function observe(el) {
    if (!el) return;
    if (prefersReduced) {
      el.classList.add('is-visible');
      return;
    }
    el.classList.remove('is-visible');
    observer.observe(el);
    // Safety net: mobile browsers occasionally fail to fire the intersection
    // callback for content inserted after the initial page load (the devlog
    // and work grids populate from the CMS on a delay) — never leave a card
    // stuck invisible if that happens.
    el.__revealFallback = setTimeout(() => reveal(el), 1500);
  }

  function scan(root) {
    const scope = root || document;
    scope.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-group').forEach(observe);
  }

  document.addEventListener('DOMContentLoaded', () => scan());

  return { scan, observe };
})();
