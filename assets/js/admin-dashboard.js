/* Studio dashboard: guards the page behind a real Supabase session, switches
   between a Journal Post form and a Project form, auto-saves an in-progress
   draft per type so an idle logout never loses work, requires a password
   re-check before any publish/delete, and supports scheduling for later. */
(function () {
  const DRAFT_KEYS = { journal: 'sb_journal_draft', project: 'sb_project_draft' };
  const BLOCK_STYLES = [
    { value: 'title', label: 'Title (large)' },
    { value: 'subtitle', label: 'Subtitle' },
    { value: 'paragraph-lg', label: 'Paragraph — Large' },
    { value: 'paragraph', label: 'Paragraph — Normal' },
    { value: 'paragraph-sm', label: 'Paragraph — Small' }
  ];

  let activeType = 'journal';

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${date} at ${time}`;
  }

  function nowForInput() {
    const d = new Date();
    d.setSeconds(0, 0);
    const tzOffsetMs = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function renderBlockHtml(block) {
    const text = escapeHtml(block.text);
    switch (block.style) {
      case 'title': return `<h2>${text}</h2>`;
      case 'subtitle': return `<h3 class="post-block-subtitle">${text}</h3>`;
      case 'paragraph-lg': return `<p class="post-block-lead">${text}</p>`;
      case 'paragraph-sm': return `<p class="post-block-sm">${text}</p>`;
      default: return `<p>${text}</p>`;
    }
  }

  // ---------- Type toggle ----------
  const journalForm = document.getElementById('journalForm');
  const projectForm = document.getElementById('projectForm');
  const formTitle = document.getElementById('formTitle');
  const previewUrl = document.getElementById('previewUrl');

  document.querySelectorAll('.type-toggle-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeType = btn.dataset.type;
      document.querySelectorAll('.type-toggle-option').forEach((b) => b.classList.toggle('is-active', b === btn));
      journalForm.style.display = activeType === 'journal' ? '' : 'none';
      projectForm.style.display = activeType === 'project' ? '' : 'none';
      formTitle.textContent = activeType === 'journal' ? 'Write a Devlog Entry' : 'Add a Project';
      previewUrl.textContent = activeType === 'journal'
        ? 'seventhboar.com/post/'
        : 'seventhboar.com/project/';
      document.getElementById('draftRestored').classList.remove('show');
      updatePreview();
    });
  });

  // ---------- Block editor (shared factory for journal + project) ----------
  function createBlockRow(style, text) {
    const row = document.createElement('div');
    row.className = 'content-block-row';
    const options = BLOCK_STYLES.map((s) => `<option value="${s.value}">${s.label}</option>`).join('');
    row.innerHTML = `
      <div class="block-row-top">
        <select class="block-style">${options}</select>
        <div class="block-row-actions">
          <button type="button" class="icon-btn move-up" title="Move up">&uarr;</button>
          <button type="button" class="icon-btn move-down" title="Move down">&darr;</button>
          <button type="button" class="icon-btn danger remove-block" title="Remove block">Remove</button>
        </div>
      </div>
      <textarea class="block-text" placeholder="Write this block's text..."></textarea>
    `;
    row.querySelector('.block-style').value = style || 'paragraph';
    row.querySelector('.block-text').value = text || '';
    return row;
  }

  function makeBlockEditor(containerId, onChange) {
    const container = document.getElementById(containerId);

    function addBlock(style, text) {
      container.appendChild(createBlockRow(style, text));
    }

    function reset() {
      container.innerHTML = '';
      addBlock('paragraph-lg', '');
    }

    container.addEventListener('click', (e) => {
      const row = e.target.closest('.content-block-row');
      if (!row) return;
      if (e.target.classList.contains('remove-block')) {
        if (container.children.length > 1) row.remove();
        onChange();
        return;
      }
      if (e.target.classList.contains('move-up')) {
        const prev = row.previousElementSibling;
        if (prev) container.insertBefore(row, prev);
        onChange();
        return;
      }
      if (e.target.classList.contains('move-down')) {
        const next = row.nextElementSibling;
        if (next) container.insertBefore(next, row);
        onChange();
      }
    });

    function collectRaw() {
      return Array.from(container.querySelectorAll('.content-block-row')).map((row) => ({
        style: row.querySelector('.block-style').value,
        text: row.querySelector('.block-text').value
      }));
    }

    function collect() {
      return collectRaw().map((b) => ({ style: b.style, text: b.text.trim() })).filter((b) => b.text !== '');
    }

    function restore(blocks) {
      container.innerHTML = '';
      if (!blocks || blocks.length === 0) {
        addBlock('paragraph-lg', '');
        return;
      }
      blocks.forEach((b) => addBlock(b.style, b.text));
    }

    reset();
    return { addBlock, reset, collectRaw, collect, restore };
  }

  const handleFormChangeDebounced = debounce(() => handleFormChange(), 400);

  const journalBlocks = makeBlockEditor('journalBlocks', handleFormChangeDebounced);
  const projectBlocks = makeBlockEditor('projectBlocks', handleFormChangeDebounced);

  document.getElementById('jAddBlockBtn').addEventListener('click', () => {
    journalBlocks.addBlock('paragraph', '');
    handleFormChangeDebounced();
  });
  document.getElementById('pAddBlockBtn').addEventListener('click', () => {
    projectBlocks.addBlock('paragraph', '');
    handleFormChangeDebounced();
  });

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

  // ---------- Published lists ----------
  async function renderJournalList() {
    const list = document.getElementById('journalList');
    list.innerHTML = '<p style="color:var(--ink-soft)">Loading...</p>';
    const posts = await JournalData.getPosts();
    if (posts.length === 0) {
      list.innerHTML = '<p style="color:var(--ink-soft)">No posts yet.</p>';
      return;
    }
    list.innerHTML = posts.map((post) => {
      const scheduled = new Date(post.date) > new Date();
      const meta = scheduled ? `Scheduled for ${formatDateTime(post.date)}` : formatDate(post.date);
      return `
        <div class="post-row">
          <div>
            <div class="post-row-title">${escapeHtml(post.title)}</div>
            <div class="post-row-meta">${escapeHtml(post.category)} &middot; ${meta}</div>
          </div>
          <div class="post-row-actions">
            <a class="icon-btn" href="/post/?id=${encodeURIComponent(post.id)}">View</a>
            <button class="icon-btn danger" data-delete-post="${escapeHtml(post.id)}">Delete</button>
          </div>
        </div>`;
    }).join('');
    list.querySelectorAll('[data-delete-post]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await confirmWithPassword('delete this post');
        if (!ok) return;
        await JournalData.deletePost(btn.getAttribute('data-delete-post'));
        renderJournalList();
      });
    });
  }

  async function renderProjectList() {
    const list = document.getElementById('projectList');
    list.innerHTML = '<p style="color:var(--ink-soft)">Loading...</p>';
    const projects = await ProjectData.getProjects();
    if (projects.length === 0) {
      list.innerHTML = '<p style="color:var(--ink-soft)">No projects yet.</p>';
      return;
    }
    list.innerHTML = projects.map((project) => {
      const scheduled = new Date(project.date) > new Date();
      const meta = scheduled ? `Scheduled for ${formatDateTime(project.date)}` : formatDate(project.date);
      return `
        <div class="post-row">
          <div>
            <div class="post-row-title">${escapeHtml(project.title)}${project.featured ? ' &middot; Featured' : ''}</div>
            <div class="post-row-meta">${escapeHtml((project.categories || []).join(', '))} &middot; ${meta}</div>
          </div>
          <div class="post-row-actions">
            <a class="icon-btn" href="/project/?id=${encodeURIComponent(project.id)}">View</a>
            <button class="icon-btn danger" data-delete-project="${escapeHtml(project.id)}">Delete</button>
          </div>
        </div>`;
    }).join('');
    list.querySelectorAll('[data-delete-project]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await confirmWithPassword('delete this project');
        if (!ok) return;
        await ProjectData.deleteProject(btn.getAttribute('data-delete-project'));
        renderProjectList();
      });
    });
  }

  // ---------- Cover images ----------
  let journalImageDataUrl = null;
  let projectBannerDataUrl = null;
  let projectIconDataUrl = null;

  function wireImageInput(inputId, previewId, onSet) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) {
        onSet(null);
        preview.classList.remove('show');
        handleFormChange();
        return;
      }
      const dataUrl = await CmsImages.resizeImageToDataUrl(file);
      onSet(dataUrl);
      preview.src = dataUrl;
      preview.classList.add('show');
      handleFormChange();
    });
  }

  wireImageInput('jImage', 'jImagePreview', (v) => { journalImageDataUrl = v; });
  wireImageInput('pBanner', 'pBannerPreview', (v) => { projectBannerDataUrl = v; });
  wireImageInput('pIcon', 'pIconPreview', (v) => { projectIconDataUrl = v; });

  // ---------- Schedule toggles ----------
  function wireSchedule(toggleId, panelId, inputId) {
    const toggle = document.getElementById(toggleId);
    const panel = document.getElementById(panelId);
    const input = document.getElementById(inputId);
    toggle.addEventListener('change', () => {
      if (toggle.checked) {
        panel.classList.add('open');
        if (!input.value) input.value = nowForInput();
      } else {
        panel.classList.remove('open');
      }
      handleFormChangeDebounced();
    });
  }
  wireSchedule('jScheduleToggle', 'jSchedulePanel', 'jPublishAt');
  wireSchedule('pScheduleToggle', 'pSchedulePanel', 'pPublishAt');

  // ---------- Live preview ----------
  const previewContent = document.getElementById('previewContent');

  function estimateReadingMinutes(blocks) {
    const wordCount = blocks.reduce((total, b) => total + b.text.split(/\s+/).filter(Boolean).length, 0);
    return Math.max(1, Math.round(wordCount / 200));
  }

  function updatePreview() {
    let html;
    if (activeType === 'journal') {
      const title = document.getElementById('jTitle').value.trim();
      const category = document.getElementById('jCategory').value.trim();
      const blocks = journalBlocks.collect();
      const bodyHtml = blocks.length
        ? blocks.map(renderBlockHtml).join('')
        : '<p class="preview-placeholder">Start writing to see the post come together here...</p>';
      const imageHtml = journalImageDataUrl ? `<img class="post-hero-img" src="${journalImageDataUrl}" alt="">` : '';
      const readingMinutes = blocks.length ? estimateReadingMinutes(blocks) : 1;
      html = `
        <span class="chip ink">${escapeHtml(category || 'Category')}</span>
        <h1>${escapeHtml(title || 'Your Post Title')}</h1>
        <div class="post-meta">${formatDate(new Date().toISOString())} &middot; ${readingMinutes} min read</div>
        ${imageHtml}
        <div>${bodyHtml}</div>
      `;
    } else {
      const title = document.getElementById('pTitle').value.trim();
      const tagline = document.getElementById('pTagline').value.trim();
      const client = document.getElementById('pClient').value.trim();
      const blocks = projectBlocks.collect();
      const bodyHtml = blocks.length
        ? blocks.map(renderBlockHtml).join('')
        : '<p class="preview-placeholder">Start writing the brief to see it come together here...</p>';
      const imageHtml = projectBannerDataUrl ? `<img class="post-hero-img" src="${projectBannerDataUrl}" alt="">` : '';
      html = `
        <h1>${escapeHtml(title || 'Project Title')}</h1>
        <div class="project-meta">${escapeHtml(tagline || 'Tagline goes here')}${client ? ' &middot; for ' + escapeHtml(client) : ''}</div>
        ${imageHtml}
        <div>${bodyHtml}</div>
      `;
    }

    previewContent.classList.add('fade-swap');
    requestAnimationFrame(() => {
      previewContent.innerHTML = html;
      requestAnimationFrame(() => previewContent.classList.remove('fade-swap'));
    });
  }

  // ---------- Draft autosave ----------
  function saveDraft() {
    if (activeType === 'journal') {
      const draft = {
        title: document.getElementById('jTitle').value,
        category: document.getElementById('jCategory').value,
        excerpt: document.getElementById('jExcerpt').value,
        scheduled: document.getElementById('jScheduleToggle').checked,
        publishAt: document.getElementById('jPublishAt').value,
        blocks: journalBlocks.collectRaw(),
        imageDataUrl: journalImageDataUrl
      };
      localStorage.setItem(DRAFT_KEYS.journal, JSON.stringify(draft));
    } else {
      const draft = {
        title: document.getElementById('pTitle').value,
        categories: Array.from(document.querySelectorAll('.pCategory:checked')).map((c) => c.value),
        platforms: document.getElementById('pPlatforms').value,
        client: document.getElementById('pClient').value,
        tagline: document.getElementById('pTagline').value,
        featured: document.getElementById('pFeatured').checked,
        scheduled: document.getElementById('pScheduleToggle').checked,
        publishAt: document.getElementById('pPublishAt').value,
        blocks: projectBlocks.collectRaw(),
        bannerDataUrl: projectBannerDataUrl,
        iconDataUrl: projectIconDataUrl
      };
      localStorage.setItem(DRAFT_KEYS.project, JSON.stringify(draft));
    }
  }

  function handleFormChange() {
    saveDraft();
    updatePreview();
  }

  function loadDraft(type) {
    try {
      const raw = localStorage.getItem(DRAFT_KEYS[type]);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearDraft(type) {
    localStorage.removeItem(DRAFT_KEYS[type]);
  }

  function applyJournalDraft(draft) {
    document.getElementById('jTitle').value = draft.title || '';
    document.getElementById('jCategory').value = draft.category || '';
    document.getElementById('jExcerpt').value = draft.excerpt || '';
    document.getElementById('jScheduleToggle').checked = !!draft.scheduled;
    document.getElementById('jPublishAt').value = draft.publishAt || '';
    document.getElementById('jSchedulePanel').classList.toggle('open', !!draft.scheduled);
    journalBlocks.restore(draft.blocks);
    if (draft.imageDataUrl) {
      journalImageDataUrl = draft.imageDataUrl;
      const preview = document.getElementById('jImagePreview');
      preview.src = draft.imageDataUrl;
      preview.classList.add('show');
    }
  }

  function applyProjectDraft(draft) {
    document.getElementById('pTitle').value = draft.title || '';
    document.querySelectorAll('.pCategory').forEach((c) => { c.checked = (draft.categories || []).includes(c.value); });
    document.getElementById('pPlatforms').value = draft.platforms || '';
    document.getElementById('pClient').value = draft.client || '';
    document.getElementById('pTagline').value = draft.tagline || '';
    document.getElementById('pFeatured').checked = !!draft.featured;
    document.getElementById('pScheduleToggle').checked = !!draft.scheduled;
    document.getElementById('pPublishAt').value = draft.publishAt || '';
    document.getElementById('pSchedulePanel').classList.toggle('open', !!draft.scheduled);
    projectBlocks.restore(draft.blocks);
    if (draft.bannerDataUrl) {
      projectBannerDataUrl = draft.bannerDataUrl;
      const preview = document.getElementById('pBannerPreview');
      preview.src = draft.bannerDataUrl;
      preview.classList.add('show');
    }
    if (draft.iconDataUrl) {
      projectIconDataUrl = draft.iconDataUrl;
      const preview = document.getElementById('pIconPreview');
      preview.src = draft.iconDataUrl;
      preview.classList.add('show');
    }
  }

  function draftHasContent(draft) {
    if (!draft) return false;
    return !!(draft.title || draft.excerpt || draft.tagline || draft.imageDataUrl || draft.bannerDataUrl ||
      (draft.blocks || []).some((b) => b.text));
  }

  function resetJournalForm() {
    document.getElementById('journalForm').reset();
    journalImageDataUrl = null;
    const preview = document.getElementById('jImagePreview');
    preview.classList.remove('show');
    preview.src = '';
    journalBlocks.reset();
    document.getElementById('jSchedulePanel').classList.remove('open');
    document.getElementById('jPublishAt').value = '';
  }

  function resetProjectForm() {
    document.getElementById('projectForm').reset();
    projectBannerDataUrl = null;
    projectIconDataUrl = null;
    ['pBannerPreview', 'pIconPreview'].forEach((id) => {
      const preview = document.getElementById(id);
      preview.classList.remove('show');
      preview.src = '';
    });
    projectBlocks.reset();
    document.getElementById('pSchedulePanel').classList.remove('open');
    document.getElementById('pPublishAt').value = '';
  }

  journalForm.addEventListener('input', handleFormChangeDebounced);
  journalForm.addEventListener('change', handleFormChangeDebounced);
  projectForm.addEventListener('input', handleFormChangeDebounced);
  projectForm.addEventListener('change', handleFormChangeDebounced);

  document.getElementById('discardDraftBtn').addEventListener('click', () => {
    clearDraft(activeType);
    if (activeType === 'journal') resetJournalForm(); else resetProjectForm();
    updatePreview();
    document.getElementById('draftRestored').classList.remove('show');
  });

  // ---------- Publish: journal ----------
  journalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const imageFile = document.getElementById('jImage').files[0];
    if (!imageFile && !journalImageDataUrl) {
      alert('Add a cover image before publishing.');
      return;
    }
    const content = journalBlocks.collect();
    if (content.length === 0) {
      alert('Add at least one content block with some text.');
      return;
    }

    const publishAtDate = (document.getElementById('jScheduleToggle').checked && document.getElementById('jPublishAt').value)
      ? new Date(document.getElementById('jPublishAt').value)
      : new Date();
    const isScheduled = publishAtDate.getTime() > Date.now();
    const actionLabel = isScheduled ? `schedule this post for ${formatDateTime(publishAtDate.toISOString())}` : 'publish this post';

    const ok = await confirmWithPassword(actionLabel);
    if (!ok) return;

    const submitBtn = document.getElementById('jSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = isScheduled ? 'Scheduling...' : 'Publishing...';

    try {
      const image = imageFile
        ? await CmsImages.uploadImage(imageFile)
        : await CmsImages.uploadImageFromDataUrl(journalImageDataUrl);

      await JournalData.addPost({
        title: document.getElementById('jTitle').value.trim(),
        category: document.getElementById('jCategory').value.trim(),
        excerpt: document.getElementById('jExcerpt').value.trim(),
        image,
        content,
        publishAt: publishAtDate.toISOString()
      });

      clearDraft('journal');
      resetJournalForm();
      updatePreview();
      document.getElementById('draftRestored').classList.remove('show');
      showSuccess(isScheduled ? `Post scheduled for ${formatDateTime(publishAtDate.toISOString())}!` : 'Post published!');
      renderJournalList();
    } catch (err) {
      alert('Something went wrong publishing this post: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publish Post';
    }
  });

  // ---------- Publish: project ----------
  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bannerFile = document.getElementById('pBanner').files[0];
    if (!bannerFile && !projectBannerDataUrl) {
      alert('Add a cover/banner photo before publishing.');
      return;
    }
    const brief = projectBlocks.collect();
    if (brief.length === 0) {
      alert('Add at least one brief block with some text.');
      return;
    }
    const categories = Array.from(document.querySelectorAll('.pCategory:checked')).map((c) => c.value);
    if (categories.length === 0) {
      alert('Pick at least one type (Game, App, or Prototype).');
      return;
    }

    const publishAtDate = (document.getElementById('pScheduleToggle').checked && document.getElementById('pPublishAt').value)
      ? new Date(document.getElementById('pPublishAt').value)
      : new Date();
    const isScheduled = publishAtDate.getTime() > Date.now();
    const actionLabel = isScheduled ? `schedule this project for ${formatDateTime(publishAtDate.toISOString())}` : 'publish this project';

    const ok = await confirmWithPassword(actionLabel);
    if (!ok) return;

    const submitBtn = document.getElementById('pSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = isScheduled ? 'Scheduling...' : 'Publishing...';

    try {
      const banner = bannerFile
        ? await CmsImages.uploadImage(bannerFile)
        : await CmsImages.uploadImageFromDataUrl(projectBannerDataUrl);
      const iconFile = document.getElementById('pIcon').files[0];
      const icon = iconFile
        ? await CmsImages.uploadImage(iconFile)
        : (projectIconDataUrl ? await CmsImages.uploadImageFromDataUrl(projectIconDataUrl) : null);

      const platforms = document.getElementById('pPlatforms').value
        .split(',').map((s) => s.trim()).filter(Boolean);

      await ProjectData.addProject({
        title: document.getElementById('pTitle').value.trim(),
        categories,
        platforms,
        client: document.getElementById('pClient').value.trim() || null,
        tagline: document.getElementById('pTagline').value.trim(),
        banner,
        icon,
        brief,
        featured: document.getElementById('pFeatured').checked,
        publishAt: publishAtDate.toISOString()
      });

      clearDraft('project');
      resetProjectForm();
      updatePreview();
      document.getElementById('draftRestored').classList.remove('show');
      showSuccess(isScheduled ? `Project scheduled for ${formatDateTime(publishAtDate.toISOString())}!` : 'Project published!');
      renderProjectList();
    } catch (err) {
      alert('Something went wrong publishing this project: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publish Project';
    }
  });

  function showSuccess(message) {
    const box = document.getElementById('formSuccess');
    box.textContent = message;
    box.classList.add('show');
    setTimeout(() => box.classList.remove('show'), 4000);
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

    const jDraft = loadDraft('journal');
    if (draftHasContent(jDraft)) {
      applyJournalDraft(jDraft);
      document.getElementById('draftRestored').classList.add('show');
    }
    const pDraft = loadDraft('project');
    if (draftHasContent(pDraft)) {
      applyProjectDraft(pDraft);
    }

    updatePreview();
    resetIdleTimer();
    renderJournalList();
    renderProjectList();
  })();
})();
