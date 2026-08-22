/* Homepage: renders the latest projects + journal posts from the live CMS. */
(function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function projectCardMarkup(project) {
    const visual = `
      <div class="project-visual project-visual--brand">
        <div class="project-banner project-banner--card project-banner--photo" style="background-image:url('${escapeHtml(project.banner)}')">
          <div class="project-banner__copy">
            <span class="project-banner__eyebrow">${escapeHtml((project.categories || [])[0] || 'Project')}</span>
            <strong>${escapeHtml(project.title)}</strong>
            <span>${escapeHtml(project.tagline)}</span>
          </div>
          ${project.icon ? `<div class="app-icon-frame app-icon-frame--card"><img src="${escapeHtml(project.icon)}" alt="${escapeHtml(project.title)} icon" /></div>` : ''}
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

  function postCardMarkup(post) {
    return `
      <article class="card article-card reveal">
        <div class="meta">
          <span class="chip">Journal</span>
          <span class="chip ink">${escapeHtml(post.category)}</span>
        </div>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt)}</p>
        <footer>
          <p class="microcopy">Published ${formatDate(post.date)}</p>
          <a class="text-link" href="/journal/post.html?id=${encodeURIComponent(post.id)}">Read post</a>
        </footer>
      </article>
    `;
  }

  (async function init() {
    const projectsTarget = document.getElementById('homeProjects');
    const postsTarget = document.getElementById('homePosts');

    const allProjects = await ProjectData.getProjects();
    const featured = allProjects.filter((p) => p.featured);
    const latestProjects = (featured.length ? featured : allProjects).slice(0, 3);

    projectsTarget.innerHTML = latestProjects.length
      ? latestProjects.map(projectCardMarkup).join('')
      : '<p class="section-copy">Project pages will appear here as they are published.</p>';
    window.ScrollReveal.scan(projectsTarget);

    const allPosts = await JournalData.getPosts();
    const latestPosts = allPosts.slice(0, 2);

    postsTarget.innerHTML = latestPosts.length
      ? latestPosts.map(postCardMarkup).join('')
      : '<p class="section-copy">Journal posts will appear here as they are published.</p>';
    window.ScrollReveal.scan(postsTarget);
  })();
})();
