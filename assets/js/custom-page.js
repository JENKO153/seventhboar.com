/* A page made in Admin -> Pages: reads ?id= from the URL and draws that page from the site settings.
   In the admin's live preview (?preview) the page arrives by message instead. */
(async function () {
  const id = new URLSearchParams(location.search).get('id');
  const box = $('#pageContainer');

  if (PREVIEW) {
    await App.boot('page');
    box.innerHTML = '<div class="wrap muted" style="padding:120px 0;text-align:center">Start writing to see the page here…</div>';
    App.onPreview(msg => { if (msg.page) { render(msg.page, true); window.ScrollReveal?.scan(box); } });
    return;
  }

  await App.boot('p:' + id);
  const page = App.customPages().find(p => p.id === id);
  if (!page) return notFound();
  render(page);
  window.ScrollReveal?.scan(box);

  function notFound() {
    document.title = `Page not found | ${SITE.name}`;
    document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="noindex">');
    box.innerHTML = `
      <div class="page-head"><span class="corners"></span><div class="wrap">
        <div class="crumbs"><a href="/">Home</a></div>
        <h1 class="display">Page not found.</h1>
        <p class="lead">This page may have been removed, unpublished, or the link is incorrect.</p>
        <div class="page-head__actions"><a class="btn" href="/">Back to home</a></div>
      </div></div>`;
  }

  function render(p, preview = false) {
    const image = safeUrl(p.image) || '/assets/images/Generic_Banner.png';
    if (!preview) {
      const url = `${SITE.url}${customPageUrl(p.id)}`;
      window.SeoMeta.apply({
        title: `${p.title} | ${SITE.name}`, description: p.intro || `${p.title}, from ${SITE.name}.`, url,
        image: /^https?:/.test(image) ? image : SITE.url + image, type: 'website',
      });
    }
    const body = Blocks.html(p.blocks);
    box.innerHTML = `
      <div class="page-head">
        <div class="page-head__bg" style="background-image:url('${esc(image)}');background-position:center"></div>
        <span class="corners"></span>
        <div class="wrap">
          <div class="crumbs"><a href="/">Home</a> // <span>${esc(p.navLabel || p.title)}</span></div>
          <h1 class="display">${esc(p.title || 'Untitled page')}</h1>
          ${p.intro ? `<p class="lead">${esc(p.intro)}</p>` : ''}
        </div>
      </div>
      ${body ? `<section class="section"><div class="article prose reveal">${body}</div></section>` : ''}`;
  }
})();
