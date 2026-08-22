/* Devlog listing page: category filter pills + live search over all entries. */
(function () {
  const grid = document.getElementById('postsGrid');
  const filterTagsContainer = document.getElementById('filterTags');
  const searchInput = document.getElementById('searchInput');

  let activeCategory = 'all';
  let searchTerm = '';
  let allPosts = [];

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function buildFilterTags() {
    const categories = Array.from(new Set(allPosts.map((p) => p.category))).sort();
    const extraButtons = categories.map((cat) => `
      <button class="filter-pill" type="button" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
    `).join('');
    filterTagsContainer.insertAdjacentHTML('beforeend', extraButtons);

    filterTagsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (!btn) return;
      activeCategory = btn.dataset.category;
      filterTagsContainer.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderPosts();
    });
  }

  function renderPosts() {
    let posts = allPosts;

    if (activeCategory !== 'all') {
      posts = posts.filter((p) => p.category === activeCategory);
    }
    if (searchTerm.trim() !== '') {
      const term = searchTerm.trim().toLowerCase();
      posts = posts.filter((p) =>
        p.title.toLowerCase().includes(term) ||
        p.excerpt.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      );
    }

    if (posts.length === 0) {
      grid.innerHTML = allPosts.length === 0
        ? '<p class="section-copy">No entries published yet — check back soon.</p>'
        : '<p class="section-copy">No entries match that search yet.</p>';
      return;
    }

    grid.innerHTML = posts.map((post) => `
      <a class="card article-card reveal" href="/post/?id=${encodeURIComponent(post.id)}">
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
            <span class="text-link">Read entry</span>
          </footer>
        </div>
      </a>
    `).join('');

    window.ScrollReveal.scan(grid);
  }

  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderPosts();
  });

  (async function init() {
    allPosts = await JournalData.getPosts();
    buildFilterTags();
    renderPosts();
  })();
})();
