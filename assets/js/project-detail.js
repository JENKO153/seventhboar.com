/* Single project page: reads ?id= from the URL and renders the case study. */
(function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function normalizeBlock(block) {
    if (typeof block === 'string') return { style: 'paragraph', text: block };
    return { style: block.style || 'paragraph', text: block.text || '' };
  }

  function renderBlock(block) {
    const text = escapeHtml(block.text);
    switch (block.style) {
      case 'title': return `<h2>${text}</h2>`;
      case 'subtitle': return `<h3>${text}</h3>`;
      case 'paragraph-lg': return `<p style="font-size:1.15rem;">${text}</p>`;
      case 'paragraph-sm': return `<p style="font-size:0.92rem;color:var(--ink-soft);">${text}</p>`;
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
            <div class="hero-actions"><a class="button" href="/work.html">Back to Work</a></div>
          </div>
        </div>
      </section>
    `;
  }

  function renderProject(project) {
    document.getElementById('pageTitle').textContent = `${project.title} | Seventh Boar Development`;

    const blocks = (project.brief || []).map(normalizeBlock).filter((b) => b.text.trim() !== '');
    const briefHtml = blocks.map(renderBlock).join('');
    const categoryLabel = (project.categories || []).map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(' / ');

    const iconHtml = project.icon
      ? `<div class="app-icon-frame app-icon-frame--hero"><img src="${escapeHtml(project.icon)}" alt="${escapeHtml(project.title)} icon" /></div>`
      : '';

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
