/* Work listing page: category filter pills over all published projects. */
(function () {
  const grid = document.getElementById('projectsGrid');
  const filterTagsContainer = document.getElementById('filterTags');

  let activeCategory = 'all';
  let allProjects = [];

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function projectCardMarkup(project) {
    const visual = project.icon
      ? `
        <div class="project-visual project-visual--brand">
          <div class="project-banner project-banner--card project-banner--photo" style="background-image:url('${escapeHtml(project.banner)}')">
            <div class="project-banner__copy">
              <span class="project-banner__eyebrow">${escapeHtml((project.categories || [])[0] || 'Project')}</span>
              <strong>${escapeHtml(project.title)}</strong>
              <span>${escapeHtml(project.tagline)}</span>
            </div>
            <div class="app-icon-frame app-icon-frame--card">
              <img src="${escapeHtml(project.icon)}" alt="${escapeHtml(project.title)} icon" />
            </div>
          </div>
        </div>
      `
      : `
        <div class="project-visual project-visual--brand">
          <div class="project-banner project-banner--card project-banner--photo" style="background-image:url('${escapeHtml(project.banner)}')">
            <div class="project-banner__copy">
              <span class="project-banner__eyebrow">${escapeHtml((project.categories || [])[0] || 'Project')}</span>
              <strong>${escapeHtml(project.title)}</strong>
              <span>${escapeHtml(project.tagline)}</span>
            </div>
          </div>
        </div>
      `;

    return `
      <article class="card project-card reveal">
        ${visual}
        <div class="meta">
          ${(project.platforms || []).map((tag) => `<span class="chip ink">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <h3>${escapeHtml(project.title)}</h3>
        <footer><a class="text-link" href="/projects/detail.html?id=${encodeURIComponent(project.id)}">View project</a></footer>
      </article>
    `;
  }

  function renderProjects() {
    let projects = allProjects;
    if (activeCategory !== 'all') {
      projects = projects.filter((p) => (p.categories || []).includes(activeCategory));
    }

    if (projects.length === 0) {
      grid.innerHTML = '<p class="section-copy">No projects in this category yet.</p>';
      return;
    }

    grid.innerHTML = projects.map(projectCardMarkup).join('');
    window.ScrollReveal.scan(grid);
  }

  filterTagsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;
    activeCategory = btn.dataset.category;
    filterTagsContainer.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    renderProjects();
  });

  (async function init() {
    allProjects = await ProjectData.getProjects();
    renderProjects();
  })();
})();
