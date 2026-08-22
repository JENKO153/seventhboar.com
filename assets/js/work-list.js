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
    return `
      <article class="card project-card reveal">
        <img class="card-media" src="${escapeHtml(project.banner)}" alt="${escapeHtml(project.title)}" />
        <div class="card-body">
          <div class="meta">
            ${(project.categories || []).map((cat) => `<span class="chip">${escapeHtml(cat)}</span>`).join('')}
            ${(project.platforms || []).map((tag) => `<span class="chip ink">${escapeHtml(tag)}</span>`).join('')}
          </div>
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.tagline)}</p>
          <footer><a class="text-link" href="/project/?id=${encodeURIComponent(project.id)}">View project</a></footer>
        </div>
      </article>
    `;
  }

  function renderProjects() {
    let projects = allProjects;
    if (activeCategory !== 'all') {
      projects = projects.filter((p) => (p.categories || []).includes(activeCategory));
    }

    if (projects.length === 0) {
      grid.innerHTML = allProjects.length === 0
        ? '<p class="section-copy">Project pages will appear here as they are published.</p>'
        : '<p class="section-copy">No projects in this category yet.</p>';
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
