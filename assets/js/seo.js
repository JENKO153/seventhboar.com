/* Shared helpers for injecting per-item SEO metadata into pages whose
   content is fetched from the CMS at runtime (single post/project pages),
   where the real title/description/image aren't known until after the
   fetch resolves. */
window.SeoMeta = (function () {
  function upsertMeta(attr, attrValue, content) {
    let el = document.head.querySelector(`meta[${attr}="${attrValue}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function upsertLink(rel, href) {
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function upsertJsonLd(id, data) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  // description/image/url should already be plain text/absolute URLs —
  // callers are responsible for building those from the fetched item.
  function apply({ title, description, url, image, type }) {
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertLink('canonical', url);
    upsertMeta('property', 'og:type', type || 'website');
    upsertMeta('property', 'og:site_name', 'Seventh Boar Development');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
  }

  return { apply, upsertJsonLd };
})();
