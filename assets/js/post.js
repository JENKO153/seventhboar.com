/* Single devlog entry: reads ?id= from the URL and renders the entry, its comments and related entries.
   In the admin's live preview (?preview) the entry arrives by message instead. */
(async function () {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const box = $('#postContainer');
  let post = null;

  if (PREVIEW) {
    // Draft comes from the admin editor. Nothing is fetched.
    await App.boot('devlog');
    $('#commentsSection').remove(); $('#relatedSection').remove();
    box.innerHTML = '<div class="wrap muted" style="padding:120px 0;text-align:center">Start writing to see the entry here…</div>';
    App.onPreview(msg => { if (msg.post) { render(msg.post, true); window.ScrollReveal?.scan(box); } });
    return;
  }

  const [data, found] = await Promise.all([App.boot('devlog'), id ? CMS.getPost(id).catch(() => null) : null]);
  post = found;
  if (!post) return notFound();
  render(post);
  renderRelated(data.posts || []);
  renderComments();

  function notFound() {
    document.title = 'Entry not found | Seventh Boar Development';
    $('#commentsSection').remove(); $('#relatedSection').remove();
    box.innerHTML = `
      <div class="page-head"><div class="wrap">
        <div class="crumbs"><a href="/">Home</a> // <a href="/devlog/">Devlog</a></div>
        <h1 class="display">Entry not found.</h1>
        <p class="lead">This entry may have been removed, unpublished, or the link is incorrect.</p>
        <div class="page-head__actions"><a class="btn" href="/devlog/">Back to the devlog</a></div>
      </div></div>`;
  }

  function render(p, preview = false) {
    if (!preview) {
      const url = `${SITE.url}/post/?id=${encodeURIComponent(p.id)}`;
      const image = /^https?:/.test(p.image || '') ? p.image : SITE.url + (p.image || '/assets/images/Generic_Banner.png');
      window.SeoMeta.apply({ title: `${p.title} | ${SITE.name}`, description: p.excerpt, url, image, type: 'article' });
      window.SeoMeta.upsertJsonLd('postJsonLd', {
        '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.excerpt, image,
        datePublished: p.date, author: { '@type': 'Organization', name: SITE.name },
        publisher: { '@type': 'Organization', name: SITE.name, logo: { '@type': 'ImageObject', url: `${SITE.url}/assets/images/seventh-boar-mark.png` } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      });
    }
    const minutes = Blocks.readingMinutes(p.content);
    box.innerHTML = `
      <header class="article article-head">
        <div class="crumbs"><a href="/">Home</a> // <a href="/devlog/">Devlog</a> // <span>Entry</span></div>
        <div style="margin-top:22px"><span class="chip chip--hot">${esc(p.category || 'Category')}</span></div>
        <h1 class="display">${esc(p.title || 'Your entry title')}</h1>
        <div class="article-meta">${esc(fmtDate(p.date || new Date()))} · by ${esc(p.author || 'Seventh Boar')} · ${minutes} min read</div>
      </header>
      ${p.image ? `<div class="article-wide"><div class="article-hero reveal"><img src="${imgSrc(p.image)}" alt="${esc(p.title)}"><span class="corners"></span></div></div>` : ''}
      <article class="article prose">${Blocks.html(p.content) || '<p class="muted">Start writing to see the entry come together here…</p>'}</article>
      ${preview ? '' : `<div class="article share-row">
        <a class="link-arrow" href="/devlog/">All entries</a>
        <button class="btn btn--ghost" type="button" id="copyLink" style="height:44px">Copy link</button>
      </div>`}`;
    $('#copyLink')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(location.href).then(() => App.toast('Link copied'), () => App.toast('Press Cmd/Ctrl + C to copy the address bar'));
    });
    window.ScrollReveal?.scan(box);
  }

  // Same category first, then the newest of the rest.
  function renderRelated(all) {
    const others = all.filter(p => p.id !== post.id);
    const related = [...others.filter(p => p.category === post.category), ...others.filter(p => p.category !== post.category)].slice(0, 3);
    if (!related.length) return;
    $('#relatedSection').hidden = false;
    const grid = $('#relatedPosts');
    grid.innerHTML = related.map(App.Cards.post).join('');
    window.ScrollReveal?.scan(grid);
  }

  function getLiked() { try { return JSON.parse(localStorage.getItem('sb_liked_comments') || '[]'); } catch { return []; } }
  function markLiked(cid) { try { localStorage.setItem('sb_liked_comments', JSON.stringify([...getLiked(), cid])); } catch { /* still counted, just not remembered */ } }

  function commentHtml(c, liked) {
    const done = liked.includes(c.id);
    return `<div class="comment-item" data-comment-id="${esc(c.id)}">
      <div class="comment-header"><span class="comment-author">${esc(c.author)}</span><span class="comment-date">${esc(fmtDate(c.date))}</span></div>
      <p class="comment-body">${esc(c.body)}</p>
      <button type="button" class="comment-like-btn${done ? ' is-liked' : ''}" data-like-btn ${done ? 'disabled' : ''}>${ICON.thumb}<span data-like-count>${c.likes}</span></button>
    </div>`;
  }

  function renderComments() {
    const section = $('#commentsSection'), list = $('#commentList'), count = $('#commentsCount');
    const form = $('#commentForm'), status = $('#commentFormStatus');
    section.hidden = false;

    // Wire the form and the like buttons up front, before the comments arrive: a visitor who
    // submits before the fetch finishes would otherwise get a plain, unhandled form submit.
    list.addEventListener('click', async e => {
      const btn = e.target.closest('[data-like-btn]');
      if (!btn || btn.disabled) return;
      const cid = btn.closest('.comment-item').dataset.commentId;
      btn.disabled = true;
      try {
        await CMS.likeComment(cid);
        const n = btn.querySelector('[data-like-count]');
        n.textContent = String(Number(n.textContent) + 1);
        btn.classList.add('is-liked');
        markLiked(cid);
      } catch { btn.disabled = false; }
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('#commentAuthor').value.trim(), body = $('#commentBody').value.trim();
      if (!name || !body) return;
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      status.classList.remove('show', 'success', 'error');
      try {
        await CMS.submitComment(post.id, name, body);
        form.reset();
        status.textContent = "Thanks! Your comment is awaiting approval and will appear here once it's reviewed.";
        status.classList.add('show', 'success');
      } catch {
        status.textContent = 'Something went wrong submitting your comment. Please try again.';
        status.classList.add('show', 'error');
      } finally { btn.disabled = false; }
    });

    (async () => {
      count.textContent = 'Loading comments…';
      try {
        const comments = await CMS.getComments(post.id);
        const liked = getLiked();
        count.textContent = comments.length ? `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}` : 'Be the first to comment.';
        list.innerHTML = comments.map(c => commentHtml(c, liked)).join('');
      } catch {
        count.textContent = '';
        list.innerHTML = '<p class="comment-empty">Comments couldn\'t be loaded. Try refreshing the page.</p>';
      }
    })();
  }
})();
