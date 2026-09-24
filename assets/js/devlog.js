/* Devlog listing page: category tabs + live search over every entry. */
(async function () {
  const data = await App.boot('devlog');
  const allPosts = data.posts || [];
  const grid = $('#postsGrid');
  const tabs = $('#filterTags');
  let category = 'all';
  let term = '';

  // Tabs for each category in use, most used first.
  const counts = {};
  allPosts.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
  const cats = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  tabs.insertAdjacentHTML('beforeend', cats.map(c => `<button class="tab" type="button" data-category="${esc(c)}">${esc(c)}</button>`).join(''));
  tabs.hidden = cats.length < 2;
  tabs.addEventListener('click', e => {
    const b = e.target.closest('.tab'); if (!b) return;
    category = b.dataset.category;
    $$('.tab', tabs).forEach(x => x.classList.toggle('active', x === b));
    draw();
  });
  $('#searchInput').addEventListener('input', e => { term = e.target.value.trim().toLowerCase(); draw(); });

  function draw() {
    let posts = allPosts;
    if (category !== 'all') posts = posts.filter(p => p.category === category);
    if (term) posts = posts.filter(p => `${p.title} ${p.excerpt} ${p.category}`.toLowerCase().includes(term));
    grid.innerHTML = posts.map(App.Cards.post).join('')
      || `<div class="no-results">${allPosts.length ? 'No entries match that search yet.' : 'No entries published yet. Check back soon.'}</div>`;
    window.ScrollReveal?.scan(grid);
  }
  draw();
})();
