/* Shared card markup for devlog posts and projects, used by the homepage,
   Work, Devlog and related-posts grids so every card looks identical. */
window.CardUi = (function () {
  const NEW_WINDOW_DAYS = 14;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function formatShortDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function isRecent(dateStr) {
    return Date.now() - new Date(dateStr).getTime() < NEW_WINDOW_DAYS * 86400000;
  }

  function article(post) {
    return `
      <a class="card article-card reveal" href="/post/?id=${encodeURIComponent(post.id)}">
        <div class="card-media-frame">
          <img class="card-media" src="${escapeHtml(post.cardImage || post.image)}" alt="${escapeHtml(post.title)}" />
          <span class="card-badge">${escapeHtml(post.category)}</span>
          ${isRecent(post.date) ? '<span class="card-stamp">New</span>' : ''}
        </div>
        <div class="card-body">
          <div class="card-code"><span>Devlog //</span><span>${formatShortDate(post.date)}</span></div>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.excerpt)}</p>
          <footer><span class="text-link">Read entry</span></footer>
        </div>
      </a>
    `;
  }

  function project(p) {
    const kind = (p.categories || [])[0] || 'project';
    const platforms = (p.platforms || []).join(' · ');
    return `
      <a class="card project-card reveal" href="/project/?id=${encodeURIComponent(p.id)}">
        <div class="card-media-frame">
          <img class="card-media" src="${escapeHtml(p.cardBanner || p.banner)}" alt="${escapeHtml(p.title)}" />
          <span class="card-badge">${escapeHtml(kind)}</span>
          ${p.featured ? '<span class="card-stamp">Featured</span>' : ''}
        </div>
        <div class="card-body">
          <div class="card-code"><span>Work //</span><span>${escapeHtml(platforms)}</span></div>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.tagline)}</p>
          <footer><span class="text-link">View project</span></footer>
        </div>
      </a>
    `;
  }

  return { article, project };
})();
