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
          <article class="panel article-body article-body--full reveal">${bodyHtml}</article>
        </div>
      </section>
    `;
    window.ScrollReveal.scan(document.getElementById('postContainer'));
  }

  function commentIconSvg() {
    return '<svg viewBox="0 0 24 24"><path d="M2 22h3V10H2v12zm19.83-11.55c.11-.25.17-.53.17-.83v-1.66C22 6.9 21.1 6 20 6h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 0 7.59 5.59C7.22 5.95 7 6.45 7 7v10.99c0 1.11.9 2.01 2.01 2.01H17c.83 0 1.54-.5 1.84-1.22l2.99-6.98z"/></svg>';
  }

  function getLikedCommentIds() {
    try {
      return JSON.parse(localStorage.getItem('sb_liked_comments') || '[]');
    } catch (e) {
      return [];
    }
  }

  function markCommentLiked(id) {
    try {
      const ids = getLikedCommentIds();
      ids.push(id);
      localStorage.setItem('sb_liked_comments', JSON.stringify(ids));
    } catch (e) { /* localStorage unavailable — like still goes through, just isn't remembered */ }
  }

  function commentItemHtml(comment, likedIds) {
    const isLiked = likedIds.includes(comment.id);
    return `
      <div class="comment-item" data-comment-id="${escapeHtml(comment.id)}">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(comment.author)}</span>
          <span class="comment-date">${formatDate(comment.date)}</span>
        </div>
        <p class="comment-body">${escapeHtml(comment.body)}</p>
        <button type="button" class="comment-like-btn${isLiked ? ' is-liked' : ''}" data-like-btn ${isLiked ? 'disabled' : ''}>
          ${commentIconSvg()}<span data-like-count>${comment.likes}</span>
        </button>
      </div>
    `;
  }

  async function renderComments(post) {
    const section = document.getElementById('commentsSection');
    const listEl = document.getElementById('commentList');
    const countEl = document.getElementById('commentsCount');
    section.style.display = '';

    const comments = await CommentsData.getApprovedComments(post.id);
    const likedIds = getLikedCommentIds();

    countEl.textContent = comments.length
      ? `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`
      : 'Be the first to comment.';
    listEl.innerHTML = comments.map((c) => commentItemHtml(c, likedIds)).join('');

    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-like-btn]');
      if (!btn || btn.disabled) return;
      const commentId = btn.closest('.comment-item').dataset.commentId;
      btn.disabled = true;
      try {
        await CommentsData.likeComment(commentId);
        const countSpan = btn.querySelector('[data-like-count]');
        countSpan.textContent = String(Number(countSpan.textContent) + 1);
        btn.classList.add('is-liked');
        markCommentLiked(commentId);
      } catch (err) {
        btn.disabled = false;
      }
    });

    const form = document.getElementById('commentForm');
    const statusEl = document.getElementById('commentFormStatus');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('commentAuthor');
      const bodyInput = document.getElementById('commentBody');
      const name = nameInput.value.trim();
      const body = bodyInput.value.trim();
      if (!name || !body) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      statusEl.classList.remove('show', 'success', 'error');
      try {
        await CommentsData.submitComment(post.id, name, body);
        form.reset();
        statusEl.textContent = "Thanks! Your comment is awaiting approval and will appear here once it's reviewed.";
        statusEl.classList.add('show', 'success');
      } catch (err) {
        statusEl.textContent = 'Something went wrong submitting your comment. Please try again.';
        statusEl.classList.add('show', 'error');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function renderRelated(post, allPosts) {
    const related = allPosts.filter((p) => p.id !== post.id && p.category === post.category).slice(0, 3);
    if (related.length === 0) return;

    document.getElementById('relatedSection').style.display = '';
    const grid = document.getElementById('relatedPosts');
    grid.innerHTML = related.map((p) => `
      <a class="card article-card reveal" href="/post/?id=${encodeURIComponent(p.id)}">
        <img class="card-media" src="${escapeHtml(p.cardImage || p.image)}" alt="${escapeHtml(p.title)}" />
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
    renderComments(post);
  })();
})();
