/* Single project page: reads ?id= from the URL and renders the case study. */
(function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  const SOCIAL_ICON_PATHS = {
    website: 'M12 2a10 10 0 100 20 10 10 0 000-20zm7.94 9h-3.05a15.9 15.9 0 00-1.14-5.26A8.03 8.03 0 0119.94 11zM12 4c.9 1.02 1.94 3 2.25 7H9.75C10.06 7 11.1 5.02 12 4zM4.06 11a8.03 8.03 0 015.19-6.26A15.9 15.9 0 008.11 11H4.06zm0 2h4.05a15.9 15.9 0 001.14 5.26A8.03 8.03 0 014.06 13zM12 20c-.9-1.02-1.94-3-2.25-7h4.5c-.31 4-1.35 5.98-2.25 7zm2.81-1.26A15.9 15.9 0 0015.95 13h4.05a8.03 8.03 0 01-5.19 6.26z',
    instagram: 'M12 2c2.7 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.55.55.89 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.42.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76 4.9 4.9 0 0 1-1.76 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.42.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.7 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76A4.9 4.9 0 0 1 5.44 2.53c.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5.25-3.5a1.17 1.17 0 1 0 0 2.33 1.17 1.17 0 0 0 0-2.33z',
    twitter: 'M18.9 2H22l-7.6 8.7L23 22h-6.8l-5.3-6.9L4.8 22H2l8.1-9.3L1.5 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z',
    facebook: 'M13.5 22v-8.4h2.8l.4-3.3h-3.2V8.1c0-.96.27-1.62 1.65-1.62H17V3.5A22 22 0 0014.5 3.3c-2.5 0-4.2 1.53-4.2 4.34v2.63H7.5v3.3h2.8V22h3.2z',
    tiktok: 'M16.6 5.82c-.9-.83-1.4-2-1.4-3.32h-3.13v13.4c0 1.6-1.3 2.9-2.9 2.9s-2.9-1.3-2.9-2.9 1.3-2.9 2.9-2.9c.3 0 .58.05.85.13V9.9a6.1 6.1 0 0 0-.85-.06 6.1 6.1 0 1 0 6.1 6.1V9.03a8.2 8.2 0 0 0 4.83 1.55V7.45c-1.2 0-2.3-.4-3.5-1.63z',
    youtube: 'M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.5v-7l6.3 3.5-6.3 3.5z',
    linkedin: 'M4.98 3.5a2.5 2.5 0 11-.02 5.01A2.5 2.5 0 014.98 3.5zM.5 21.5h4.4V8.9H.5v12.6zM8.3 8.9h4.2v1.72h.06c.59-1.1 2.02-2.26 4.16-2.26 4.44 0 5.26 2.92 5.26 6.72v6.42h-4.4v-5.69c0-1.36-.02-3.1-1.9-3.1-1.9 0-2.19 1.48-2.19 3v5.79H8.3V8.9z'
  };

  function renderClientCard(project) {
    if (!project.clientLogo && !(project.clientLinks || []).length) return '';
    const links = (project.clientLinks || []).map((l) => `
      <a class="client-social-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="${SOCIAL_ICON_PATHS[l.platform] || ''}"/></svg>
        <span>${escapeHtml(l.label)}</span>
      </a>
    `).join('');
    const logoHtml = project.clientLogo
      ? `<img src="${escapeHtml(project.clientLogo)}" alt="${escapeHtml(project.client || 'Client')} logo" />`
      : '';
    return `
      <div class="client-card reveal">
        <div class="client-card-logo">${logoHtml}</div>
        <div class="client-card-body">
          <div class="client-card-label">Built For</div>
          <div class="client-card-name">${escapeHtml(project.client || 'Client')}</div>
          ${links ? `<div class="client-card-links">${links}</div>` : ''}
        </div>
      </div>
    `;
  }

  function normalizeBlock(block) {
    if (typeof block === 'string') return { style: 'paragraph', text: block };
    return { style: block.style || 'paragraph', text: block.text || '', image: block.image || '' };
  }

  function renderBlock(block) {
    if (block.style === 'photo') {
      if (!block.image) return '';
      const caption = block.text ? `<figcaption>${escapeHtml(block.text)}</figcaption>` : '';
      return `<figure class="post-block-photo"><img src="${escapeHtml(block.image)}" alt="${escapeHtml(block.text || '')}" loading="lazy" />${caption}</figure>`;
    }
    const text = escapeHtml(block.text);
    switch (block.style) {
      case 'title': return `<h2>${text}</h2>`;
      case 'subtitle': return `<h3>${text}</h3>`;
      case 'paragraph-lg': return `<p style="font-size:1.25rem;color:var(--maroon);">${text}</p>`;
      case 'paragraph-sm': return `<p style="font-size:0.92rem;color:var(--ink-soft);">${text}</p>`;
      case 'bullets': {
        const items = text.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => `<li>${s}</li>`).join('');
        return items ? `<ul>${items}</ul>` : '';
      }
      default: return `<p>${text}</p>`;
    }
  }

  function renderNotFound() {
    document.getElementById('projectContainer').innerHTML = `
      <section class="page-hero">
        <div class="shell">
          <div class="hero-copy">
            <div class="eyebrow">Work</div>
            <h1>Project not found.</h1>
            <p class="page-lead">This project may have been removed, unpublished, or the link is incorrect.</p>
            <div class="hero-actions"><a class="button" href="/work/">Back to Work</a></div>
          </div>
        </div>
      </section>
    `;
  }

  function renderProject(project) {
    document.getElementById('pageTitle').textContent = `${project.title} | Seventh Boar Development`;

    const blocks = (project.brief || []).map(normalizeBlock)
      .filter((b) => b.text.trim() !== '' || (b.style === 'photo' && b.image));
    const briefHtml = blocks.map(renderBlock).join('');
    const categoryLabel = (project.categories || []).map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(' / ');

    const iconHtml = project.icon
      ? `<div class="app-icon-frame app-icon-frame--hero"><img src="${escapeHtml(project.icon)}" alt="${escapeHtml(project.title)} icon" /></div>`
      : '';
    const clientCardHtml = renderClientCard(project);

    document.getElementById('projectContainer').innerHTML = `
      <section class="case-study">
        <div class="shell">
          <div class="hero-copy reveal">
            <div class="eyebrow">${escapeHtml(categoryLabel || 'Project')}</div>
            <h1>${escapeHtml(project.title)}</h1>
            <p class="page-lead">${escapeHtml(project.tagline)}</p>
            <div class="case-meta">
              ${(project.platforms || []).map((tag) => `<span class="chip ink">${escapeHtml(tag)}</span>`).join('')}
              ${project.client ? `<span class="chip">Client: ${escapeHtml(project.client)}</span>` : ''}
            </div>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="shell">
          <div class="project-banner project-banner--hero project-banner--photo reveal" style="background-image:url('${escapeHtml(project.banner)}')">
            <div class="project-banner__copy">
              <span class="project-banner__eyebrow">${escapeHtml(categoryLabel || 'Project')}</span>
              <strong>${escapeHtml(project.title)}</strong>
              <span>${escapeHtml(project.tagline)}</span>
            </div>
            ${iconHtml}
          </div>
        </div>
      </section>
      ${clientCardHtml ? `
      <section class="section">
        <div class="shell">${clientCardHtml}</div>
      </section>` : ''}
      <section class="section">
        <div class="shell">
          <article class="panel case-block reveal">${briefHtml}</article>
        </div>
      </section>
    `;
    window.ScrollReveal.scan(document.getElementById('projectContainer'));
  }

  (async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const project = id ? await ProjectData.getProjectById(id) : null;

    if (!project) {
      renderNotFound();
      return;
    }

    renderProject(project);
  })();
})();
