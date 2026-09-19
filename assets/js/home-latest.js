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
    return CardUi.project(project);
  }

  function postCardMarkup(post) {
    return CardUi.article(post);
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
