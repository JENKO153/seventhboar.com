/* Single devlog entry page: reads ?id= from the URL and renders the post. */
(function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
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

  function estimateReadingMinutes(blocks) {
    const wordCount = blocks.reduce((total, b) => total + b.text.split(/\s+/).filter(Boolean).length, 0);
    return Math.max(1, Math.round(wordCount / 200));
  }

  function renderNotFound() {
    document.getElementById('postContainer').innerHTML = `
      <section class="page-hero">
        <div class="shell">
          <div class="hero-copy">
            <div class="eyebrow">Devlog</div>
            <h1>Entry not found.</h1>
            <p class="page-lead">This entry may have been removed, unpublished, or the link is incorrect.</p>
            <div class="hero-actions"><a class="button" href="/devlog/">Back to the Devlog</a></div>
          </div>
        </div>
      </section>
    `;
  }

  function renderPost(post) {
    const url = `https://seventhboar.com/post/?id=${encodeURIComponent(post.id)}`;
    window.SeoMeta.apply({
      title: `${post.title} | Seventh Boar Development`,
      description: post.excerpt,
      url,
      image: post.image,
      type: 'article'
    });
    window.SeoMeta.upsertJsonLd('postJsonLd', {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      image: post.image,
      datePublished: post.date,
      author: { '@type': 'Organization', name: 'Seventh Boar Development' },
      publisher: {
        '@type': 'Organization',
        name: 'Seventh Boar Development',
        logo: { '@type': 'ImageObject', url: 'https://seventhboar.com/assets/images/seventh-boar-mark.png' }
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url }
    });

    const blocks = (post.content || []).map(normalizeBlock)
      .filter((b) => b.text.trim() !== '' || (b.style === 'photo' && b.image));
    const bodyHtml = blocks.map(renderBlock).join('');
    const readingMinutes = estimateReadingMinutes(blocks);

    document.getElementById('postContainer').innerHTML = `
      <section class="article-hero">
        <div class="shell">
          <div class="hero-copy reveal">
            <div class="eyebrow">${escapeHtml(post.category)}</div>
            <h1>${escapeHtml(post.title)}</h1>
            <p class="article-lead">${formatDate(post.date)} &middot; by ${escapeHtml(post.author)} &middot; ${readingMinutes} min read</p>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="shell">
          <img class="post-hero-img" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" />
          <div class="article-layout">
            <article class="panel article-body reveal">${bodyHtml}</article>
            <aside class="article-side">
              <div class="panel reveal">
                <h2 class="mini-title">Back to the Devlog</h2>
                <p>More studio notes, project decisions, and behind-the-build writing.</p>
                <a class="text-link" href="/devlog/">All entries</a>
              </div>
            </aside>
          </div>
        </div>
      </section>
    `;
    window.ScrollReveal.scan(document.getElementById('postContainer'));
  }

  function renderRelated(post, allPosts) {
    const related = allPosts.filter((p) => p.id !== post.id && p.category === post.category).slice(0, 3);
    if (related.length === 0) return;

    document.getElementById('relatedSection').style.display = '';
    const grid = document.getElementById('relatedPosts');
    grid.innerHTML = related.map((p) => `
      <a class="card article-card reveal" href="/post/?id=${encodeURIComponent(p.id)}">
        <img class="card-media" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" />
        <div class="card-body">
          <div class="meta">
            <span class="chip">Devlog</span>
            <span class="chip ink">${escapeHtml(p.category)}</span>
          </div>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.excerpt)}</p>
          <footer><span class="text-link">Read entry</span></footer>
        </div>
      </a>
    `).join('');
    window.ScrollReveal.scan(grid);
  }

  (async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const post = id ? await JournalData.getPostById(id) : null;

    if (!post) {
      renderNotFound();
      return;
    }

    renderPost(post);
    const allPosts = await JournalData.getPosts();
    renderRelated(post, allPosts);
  })();
})();
