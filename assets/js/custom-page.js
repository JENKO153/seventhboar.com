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
    // A Q&A page (the FAQ) also tells search engines which parts are questions and answers.
    if (!preview && p.faq) {
      const qa = [];
      let cur = null;
      Blocks.clean(p.blocks).forEach(b => {
        if (b.style === 'subtitle' || b.style === 'title') { cur = { '@type': 'Question', name: b.text, acceptedAnswer: { '@type': 'Answer', text: '' } }; qa.push(cur); }
        else if (cur && b.style !== 'photo') cur.acceptedAnswer.text += (cur.acceptedAnswer.text ? ' ' : '') + b.text.replace(/\n/g, ' ');
      });
      const entities = qa.filter(q => q.acceptedAnswer.text);
      if (entities.length) window.SeoMeta.upsertJsonLd('faqJsonLd', { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: entities });
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
      ${body ? `<section class="section"><div class="article prose reveal">${body}</div></section>` : ''}
      <section class="section section--flush"><div class="article">${extras(p)}</div></section>`;
    App.fillReach();
  }

  // Under every page: a few other pages to read next (the same kind first), and a way to start a project.
  function extras(p) {
    const others = App.customPages().filter(x => x.id !== p.id);
    const same = p.group ? others.filter(x => x.group === p.group) : [];
    const related = [...same, ...others.filter(x => !same.includes(x))].slice(0, 3);
    return `${related.length ? `<div class="related"><h4>Keep reading</h4>${related.map(x => `<a href="${esc(customPageUrl(x.id))}"><span>${esc(x.navLabel || x.title)}</span><span aria-hidden="true">&rarr;</span></a>`).join('')}</div>` : ''}
      <div class="page-cta">
        <h3>Ready to start?</h3>
        <p>Tell us what you need and we'll come back with a yes or no, and what it would involve.</p>
        <p class="promise" data-promise hidden></p>
        <div class="page-cta__actions"><a class="btn" href="/request/">Start a project</a><a class="btn btn--ghost" href="/services/#pricing">See pricing</a><a class="btn btn--ghost" data-call hidden href="#" target="_blank" rel="noopener">Book a call</a></div>
      </div>`;
  }
})();
