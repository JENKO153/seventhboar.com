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
    el.classList.add('is-visible');
    if (observer) observer.unobserve(el);
    if (el.__revealFallback) {
      clearTimeout(el.__revealFallback);
      el.__revealFallback = null;
    }
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
