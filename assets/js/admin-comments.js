/* Studio comment moderation: approve pending devlog comments, or delete
   spam/abuse from either list. Guards the page behind a real Supabase
   session the same way the main dashboard does. */
(function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${date} at ${time}`;
  }

  // ---------- Password re-confirmation modal ----------
  const confirmModal = document.getElementById('confirmModal');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmPassword = document.getElementById('confirmPassword');
  const confirmError = document.getElementById('confirmError');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');

  function confirmWithPassword(actionLabel) {
    confirmMessage.textContent = `Enter your password to ${actionLabel}.`;
    confirmPassword.value = '';
    confirmError.classList.remove('show');
    confirmModal.style.display = 'flex';
    confirmPassword.focus();

    return new Promise((resolve) => {
      function cleanup(result) {
        confirmModal.style.display = 'none';
        confirmSubmitBtn.removeEventListener('click', onSubmit);
        confirmCancelBtn.removeEventListener('click', onCancel);
        confirmPassword.removeEventListener('keydown', onKeydown);
        resolve(result);
      }
      async function onSubmit() {
        const password = confirmPassword.value;
        if (!password) return;
        confirmSubmitBtn.disabled = true;
        confirmSubmitBtn.textContent = 'Checking...';
        try {
          const session = await CmsAuth.getSession();
          await CmsAuth.login(session.user.email, password);
          cleanup(true);
        } catch (err) {
          confirmError.classList.add('show');
          confirmPassword.value = '';
          confirmPassword.focus();
        } finally {
          confirmSubmitBtn.disabled = false;
          confirmSubmitBtn.textContent = 'Confirm';
        }
      }
      function onCancel() { cleanup(false); }
      function onKeydown(e) { if (e.key === 'Enter') onSubmit(); }
      confirmSubmitBtn.addEventListener('click', onSubmit);
      confirmCancelBtn.addEventListener('click', onCancel);
      confirmPassword.addEventListener('keydown', onKeydown);
    });
  }

  let postTitles = {};

  function commentRowHtml(comment, isPending) {
    const postTitle = postTitles[comment.postSlug] || comment.postSlug;
    return `
      <div class="post-row" style="align-items: flex-start">
        <div>
          <div class="post-row-title">${escapeHtml(comment.author)} <span style="color: var(--ink-soft); font-weight: 400">on</span> ${escapeHtml(postTitle)}</div>
          <div class="post-row-meta">${formatDateTime(comment.date)} &middot; ${comment.likes} ${comment.likes === 1 ? 'like' : 'likes'}</div>
          <p style="margin-top: 0.6rem; color: var(--ink-soft); white-space: pre-wrap">${escapeHtml(comment.body)}</p>
        </div>
        <div class="post-row-actions">
          ${isPending ? `<button class="icon-btn" data-approve="${escapeHtml(comment.id)}">Approve</button>` : ''}
          <a class="icon-btn" href="/post/?id=${encodeURIComponent(comment.postSlug)}" target="_blank" rel="noopener">View Post</a>
          <button class="icon-btn danger" data-delete="${escapeHtml(comment.id)}">Delete</button>
        </div>
      </div>`;
  }

  async function renderComments() {
    const pendingList = document.getElementById('pendingList');
    const approvedList = document.getElementById('approvedList');
    pendingList.innerHTML = '<p style="color:var(--ink-soft)">Loading...</p>';
    approvedList.innerHTML = '<p style="color:var(--ink-soft)">Loading...</p>';

    const [comments, posts] = await Promise.all([
      CommentsData.getAllComments(),
      JournalData.getPosts()
    ]);
    postTitles = {};
    posts.forEach((p) => { postTitles[p.id] = p.title; });

    const pending = comments.filter((c) => !c.approved);
    const approved = comments.filter((c) => c.approved);

    pendingList.innerHTML = pending.length
      ? pending.map((c) => commentRowHtml(c, true)).join('')
      : '<p style="color:var(--ink-soft)">Nothing waiting on you.</p>';

    approvedList.innerHTML = approved.length
      ? approved.map((c) => commentRowHtml(c, false)).join('')
      : '<p style="color:var(--ink-soft)">No approved comments yet.</p>';

    document.querySelectorAll('[data-approve]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await confirmWithPassword('approve this comment');
        if (!ok) return;
        await CommentsData.approveComment(btn.getAttribute('data-approve'));
        renderComments();
      });
    });
    document.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await confirmWithPassword('delete this comment');
        if (!ok) return;
        await CommentsData.deleteComment(btn.getAttribute('data-delete'));
        renderComments();
      });
    });
  }

  // ---------- Idle auto-logout ----------
  const IDLE_LIMIT_MS = 5 * 60 * 1000;
  let idleTimer;
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
      await CmsAuth.logout();
      window.location.href = '/admin/login/';
    }, IDLE_LIMIT_MS);
  }
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach((evt) => {
    document.addEventListener(evt, resetIdleTimer);
  });

  // ---------- Auth guard ----------
  (async function init() {
    const session = await CmsAuth.getSession();
    if (!session) {
      window.location.href = '/admin/login/';
      return;
    }

    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await CmsAuth.logout();
      window.location.href = '/admin/login/';
    });

    resetIdleTimer();
    renderComments();
  })();
})();
