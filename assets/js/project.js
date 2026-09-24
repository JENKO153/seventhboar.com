/* Single project page: reads ?id= from the URL and renders the case study.
   In the admin's live preview (?preview) the project arrives by message instead. */
(async function () {
  const id = new URLSearchParams(location.search).get('id');
  const box = $('#projectContainer');

  if (PREVIEW) {
    await App.boot('work');
    $('#moreSection').remove();
    box.innerHTML = '<div class="wrap muted" style="padding:120px 0;text-align:center">Start filling in the project to see it here…</div>';
    App.onPreview(msg => { if (msg.project) { render(msg.project, true); window.ScrollReveal?.scan(box); } });
    return;
  }

  const [data, project] = await Promise.all([App.boot('work'), id ? CMS.getProject(id).catch(() => null) : null]);
  if (!project) return notFound();
  render(project);
  renderMore(data.projects || []);

  function notFound() {
    document.title = 'Project not found | Seventh Boar Development';
    $('#moreSection').remove();
    box.innerHTML = `
      <div class="page-head"><div class="wrap">
        <div class="crumbs"><a href="/">Home</a> // <a href="/work/">Work</a></div>
        <h1 class="display">Project not found.</h1>
        <p class="lead">This project may have been removed, unpublished, or the link is incorrect.</p>
        <div class="page-head__actions"><a class="btn" href="/work/">Back to work</a></div>
      </div></div>`;
  }

  function clientCard(p) {
    const links = (p.clientLinks || []).filter(l => l.url && safeLink(l.url));
    if (!p.clientLogo && !links.length && !p.client) return '';
    return `<div class="client${p.clientLogo ? '' : ' client--solo'}">
      ${p.clientLogo ? `<div class="client__logo"><img src="${imgSrc(p.clientLogo)}" alt="${esc(p.client || 'Client')} logo"></div>` : ''}
      <div>
        <div class="client__eyebrow">Client</div>
        <div class="client__name">${esc(p.client || 'Client')}</div>
        ${links.length ? `<div class="socials">${links.map(l => `<a href="${esc(safeLink(l.url))}" target="_blank" rel="noopener noreferrer" title="${esc(l.label)}" aria-label="${esc(l.label)}">${socialSvg(l.platform)}</a>`).join('')}</div>` : ''}
      </div>
    </div>`;
  }

  function render(p, preview = false) {
    const types = (p.categories || []).map(c => typeLabel(c)).join(' / ');
    if (!preview) {
      const url = `${SITE.url}/project/?id=${encodeURIComponent(p.id)}`;
      const image = /^https?:/.test(p.banner || '') ? p.banner : SITE.url + (p.banner || '/assets/images/Generic_Banner.png');
      window.SeoMeta.apply({ title: `${p.title} | ${SITE.name}`, description: p.tagline, url, image, type: 'website' });
      window.SeoMeta.upsertJsonLd('projectJsonLd', {
        '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, description: p.tagline, image,
        creator: { '@type': 'Organization', name: SITE.name }, datePublished: p.date, mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      });
    }
    box.innerHTML = `
      <div class="wrap">
        <div class="crumbs" style="padding-top:28px"><a href="/">Home</a> // <a href="/work/">Work</a> // <span>${esc(p.title || 'Project')}</span></div>
        <div class="pdp">
          <div>
            <div class="pdp__hero reveal">${p.banner ? `<img src="${imgSrc(p.banner)}" alt="${esc(p.title)}">` : ''}<span class="corners"></span></div>
            <div class="prose reveal">${Blocks.html(p.brief) || '<p class="muted">Write the brief to see it here…</p>'}</div>
          </div>
          <aside class="pdp__info reveal-right">
            <span class="eyebrow">${esc(types || 'Project')}${p.featured ? ' // Featured' : ''}</span>
            ${p.icon ? `<div class="pdp__icon" style="margin-top:14px"><img src="${imgSrc(p.icon)}" alt="${esc(p.title)} icon"></div>` : ''}
            <h1 class="display">${esc(p.title || 'Project title')}</h1>
            <p class="pdp__tag">${esc(p.tagline || '')}</p>
            <div class="chips">${(p.platforms || []).map(t => `<span class="chip chip--hot">${esc(t)}</span>`).join('')}</div>
            ${clientCard(p)}
            <div class="perks">
              <div><b>${esc(types || '—')}</b>Type</div>
              <div><b>${esc((p.platforms || []).join(', ') || '—')}</b>Tags</div>
              <div><b>${esc(p.client || 'Seventh Boar')}</b>${p.client ? 'Client' : 'Studio'}</div>
              <div><b>${esc(fmtDate(p.date || new Date(), { month: 'short', year: 'numeric' }))}</b>Published</div>
            </div>
            <div class="pdp__ctas">
              <a class="btn" href="/contact/">Talk about a project</a>
              <a class="btn btn--ghost" href="/work/">All work</a>
            </div>
          </aside>
        </div>
      </div>`;
    window.ScrollReveal?.scan(box);
  }

  function renderMore(all) {
    const others = all.filter(p => p.id !== project.id).slice(0, 3);
    if (!others.length) return;
    $('#moreSection').hidden = false;
    $('#moreProjects').innerHTML = others.map(App.Cards.project).join('');
    window.ScrollReveal?.scan($('#moreProjects'));
  }
})();
