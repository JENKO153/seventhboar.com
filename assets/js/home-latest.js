/* Homepage: hero parallax, and renders the latest projects + devlog entries from the live CMS. */
(function () {
  // Subtle parallax on the hero photo as the page scrolls.
  const heroBg = document.getElementById('heroBg');
  if (heroBg && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        heroBg.style.transform = `translateY(${window.scrollY * 0.22}px)`;
        ticking = false;
      });
    }, { passive: true });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function projectCardMarkup(project) {
    return `
      <article class="card project-card reveal">
        <img class="card-media" src="${escapeHtml(project.banner)}" alt="${escapeHtml(project.title)}" />
        <div class="card-body">
          <div class="meta">
            ${(project.platforms || []).map((tag) => `<span class="chip ink">${escapeHtml(tag)}</span>`).join('')}
          </div>
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.tagline)}</p>
          <footer><a class="text-link" href="/project/?id=${encodeURIComponent(project.id)}">View project</a></footer>
        </div>
      </article>
    `;
  }

  function postCardMarkup(post) {
    return `
      <article class="card article-card reveal">
        <img class="card-media" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" />
        <div class="card-body">
          <div class="meta">
            <span class="chip">Devlog</span>
            <span class="chip ink">${escapeHtml(post.category)}</span>
          </div>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.excerpt)}</p>
          <footer>
            <p class="microcopy">Published ${formatDate(post.date)}</p>
            <a class="text-link" href="/post/?id=${encodeURIComponent(post.id)}">Read entry</a>
          </footer>
        </div>
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
      : '<p class="section-copy">Devlog entries will appear here as they are published.</p>';
    window.ScrollReveal.scan(postsTarget);
  })();
})();
