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
    { value: 'paragraph-sm', label: 'Paragraph — Small' },
    { value: 'bullets', label: 'Bullet List' },
    { value: 'photo', label: 'Photo' }
  ];

  const CLIENT_LINK_PLATFORMS = [
    { value: 'website', label: 'Website' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter / X' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'linkedin', label: 'LinkedIn' }
  ];

  const SOCIAL_ICON_PATHS = {
    website: 'M12 2a10 10 0 100 20 10 10 0 000-20zm7.94 9h-3.05a15.9 15.9 0 00-1.14-5.26A8.03 8.03 0 0119.94 11zM12 4c.9 1.02 1.94 3 2.25 7H9.75C10.06 7 11.1 5.02 12 4zM4.06 11a8.03 8.03 0 015.19-6.26A15.9 15.9 0 008.11 11H4.06zm0 2h4.05a15.9 15.9 0 001.14 5.26A8.03 8.03 0 014.06 13zM12 20c-.9-1.02-1.94-3-2.25-7h4.5c-.31 4-1.35 5.98-2.25 7zm2.81-1.26A15.9 15.9 0 0015.95 13h4.05a8.03 8.03 0 01-5.19 6.26z',
    instagram: 'M12 2c2.7 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.55.55.89 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.42.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76 4.9 4.9 0 0 1-1.76 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.42.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.7 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76A4.9 4.9 0 0 1 5.44 2.53c.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5.25-3.5a1.17 1.17 0 1 0 0 2.33 1.17 1.17 0 0 0 0-2.33z',
    twitter: 'M18.9 2H22l-7.6 8.7L23 22h-6.8l-5.3-6.9L4.8 22H2l8.1-9.3L1.5 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z',
    facebook: 'M13.5 22v-8.4h2.8l.4-3.3h-3.2V8.1c0-.96.27-1.62 1.65-1.62H17V3.5A22 22 0 0014.5 3.3c-2.5 0-4.2 1.53-4.2 4.34v2.63H7.5v3.3h2.8V22h3.2z',
    tiktok: 'M16.6 5.82c-.9-.83-1.4-2-1.4-3.32h-3.13v13.4c0 1.6-1.3 2.9-2.9 2.9s-2.9-1.3-2.9-2.9 1.3-2.9 2.9-2.9c.3 0 .58.05.85.13V9.9a6.1 6.1 0 0 0-.85-.06 6.1 6.1 0 1 0 6.1 6.1V9.03a8.2 8.2 0 0 0 4.83 1.55V7.45c-1.2 0-2.3-.4-3.5-1.63z',
    youtube: 'M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.5v-7l6.3 3.5-6.3 3.5z',
    linkedin: 'M4.98 3.5a2.5 2.5 0 11-.02 5.01A2.5 2.5 0 014.98 3.5zM.5 21.5h4.4V8.9H.5v12.6zM8.3 8.9h4.2v1.72h.06c.59-1.1 2.02-2.26 4.16-2.26 4.44 0 5.26 2.92 5.26 6.72v6.42h-4.4v-5.69c0-1.36-.02-3.1-1.9-3.1-1.9 0-2.19 1.48-2.19 3v5.79H8.3V8.9z'
  };

  function socialIconSvg(platform) {
    const path = SOCIAL_ICON_PATHS[platform];
    return path ? `<svg viewBox="0 0 24 24"><path d="${path}"/></svg>` : '';
  }

  function renderClientCardHtml(project) {
    if (!project.clientLogo && !(project.clientLinks || []).length) return '';
    const links = (project.clientLinks || []).map((l) => `
      <a class="client-social-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener" title="${escapeHtml(l.label)}" aria-label="${escapeHtml(l.label)}">
        ${socialIconSvg(l.platform)}
      </a>
    `).join('');
    const logoHtml = project.clientLogo
      ? `<div class="app-icon-frame app-icon-frame--client"><img src="${escapeHtml(project.clientLogo)}" alt="${escapeHtml(project.client || 'Client')} logo" /></div>`
      : '';
    return `
      <div class="client-card">
        ${logoHtml}
        <div class="client-card-body">
          <div class="client-card-name">${escapeHtml(project.client || 'Client')}</div>
          ${links ? `<div class="client-card-links">${links}</div>` : ''}
        </div>
      </div>
    `;
  }

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

  function nowForInput(date) {
    const d = date ? new Date(date) : new Date();
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
    if (block.style === 'photo') {
      if (!block.image) return '';
      const caption = block.text ? `<figcaption>${escapeHtml(block.text)}</figcaption>` : '';
      return `<figure class="post-block-photo"><img src="${escapeHtml(block.image)}" alt="${escapeHtml(block.text || '')}" />${caption}</figure>`;
    }
    const text = escapeHtml(block.text);
    switch (block.style) {
      case 'title': return `<h2>${text}</h2>`;
      case 'subtitle': return `<h3 class="post-block-subtitle">${text}</h3>`;
      case 'paragraph-lg': return `<p class="post-block-lead">${text}</p>`;
      case 'paragraph-sm': return `<p class="post-block-sm">${text}</p>`;
      case 'bullets': {
        const items = text.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => `<li>${s}</li>`).join('');
        return items ? `<ul>${items}</ul>` : '';
      }
      default: return `<p>${text}</p>`;
    }
  }

  // ---------- Type toggle ----------
  const journalForm = document.getElementById('journalForm');
  const projectForm = document.getElementById('projectForm');
  const formTitle = document.getElementById('formTitle');
  const previewUrl = document.getElementById('previewUrl');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  let editingJournalId = null;
  let editingJournalOriginalDate = null;
  let editingProjectId = null;
  let editingProjectOriginalDate = null;

  function setActiveType(type) {
    activeType = type;
    document.querySelectorAll('.type-toggle-option').forEach((b) => b.classList.toggle('is-active', b.dataset.type === type));
    journalForm.style.display = type === 'journal' ? '' : 'none';
    projectForm.style.display = type === 'project' ? '' : 'none';
    if (type === 'journal') {
      formTitle.textContent = editingJournalId ? 'Edit Devlog Entry' : 'Write a Devlog Entry';
      cancelEditBtn.style.display = editingJournalId ? '' : 'none';
    } else {
      formTitle.textContent = editingProjectId ? 'Edit Project' : 'Add a Project';
      cancelEditBtn.style.display = editingProjectId ? '' : 'none';
    }
    previewUrl.textContent = type === 'journal'
      ? 'seventhboar.com/post/'
      : 'seventhboar.com/project/';
    document.getElementById('draftRestored').classList.remove('show');
    updatePreview();
  }

  document.querySelectorAll('.type-toggle-option').forEach((btn) => {
    btn.addEventListener('click', () => setActiveType(btn.dataset.type));
  });

  cancelEditBtn.addEventListener('click', () => {
    if (activeType === 'journal') exitJournalEditMode(); else exitProjectEditMode();
  });

  // ---------- Block editor (shared factory for journal + project) ----------
  function setRowMode(row, style) {
    const isPhoto = style === 'photo';
    const textEl = row.querySelector('.block-text');
    textEl.style.display = isPhoto ? 'none' : '';
    textEl.placeholder = style === 'bullets' ? 'One point per line...' : "Write this block's text...";
    row.querySelector('.block-photo-field').classList.toggle('show', isPhoto);
  }

  function createBlockRow(style, text, image) {
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
      <div class="block-photo-field">
        <input type="file" class="block-photo-file" accept="image/*" />
        <img class="image-preview block-photo-preview" alt="" />
        <input type="text" class="block-photo-caption" placeholder="Caption (optional)" />
      </div>
    `;
    const resolvedStyle = style || 'paragraph';
    row.querySelector('.block-style').value = resolvedStyle;
    if (resolvedStyle === 'photo') {
      row.querySelector('.block-photo-caption').value = text || '';
    } else {
      row.querySelector('.block-text').value = text || '';
    }
    if (image) {
      const preview = row.querySelector('.block-photo-preview');
      preview.src = image;
      preview.classList.add('show');
    }
    setRowMode(row, resolvedStyle);
    return row;
  }

  function makeBlockEditor(containerId, onChange) {
    const container = document.getElementById(containerId);

    function addBlock(style, text, image) {
      container.appendChild(createBlockRow(style, text, image));
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

    container.addEventListener('change', async (e) => {
      const row = e.target.closest('.content-block-row');
      if (!row) return;
      if (e.target.classList.contains('block-style')) {
        setRowMode(row, e.target.value);
        onChange();
        return;
      }
      if (e.target.classList.contains('block-photo-file')) {
        const file = e.target.files[0];
        if (!file) return;
        const dataUrl = await CmsImages.resizeImageToDataUrl(file);
        const preview = row.querySelector('.block-photo-preview');
        preview.src = dataUrl;
        preview.classList.add('show');
        onChange();
      }
    });

    function collectRaw() {
      return Array.from(container.querySelectorAll('.content-block-row')).map((row) => {
        const style = row.querySelector('.block-style').value;
        if (style === 'photo') {
          const preview = row.querySelector('.block-photo-preview');
          return {
            style,
            text: row.querySelector('.block-photo-caption').value,
            image: preview.classList.contains('show') ? preview.src : ''
          };
        }
        return { style, text: row.querySelector('.block-text').value };
      });
    }

    function collect() {
      return collectRaw()
        .map((b) => ({ style: b.style, text: (b.text || '').trim(), image: b.image }))
        .filter((b) => (b.style === 'photo' ? !!b.image : b.text !== ''));
    }

    // Uploads any pending photo-block files to storage (or promotes a
    // restored-draft data URL) and returns the final blocks ready to save.
    async function collectForPublish() {
      const rows = Array.from(container.querySelectorAll('.content-block-row'));
      const result = [];
      for (const row of rows) {
        const style = row.querySelector('.block-style').value;
        if (style === 'photo') {
          const file = row.querySelector('.block-photo-file').files[0];
          const preview = row.querySelector('.block-photo-preview');
          const existingSrc = preview.classList.contains('show') ? preview.src : null;
          if (!file && !existingSrc) continue;
          const image = file
            ? await CmsImages.uploadImage(file)
            : (existingSrc.startsWith('data:') ? await CmsImages.uploadImageFromDataUrl(existingSrc) : existingSrc);
          const caption = row.querySelector('.block-photo-caption').value.trim();
          result.push({ style: 'photo', text: caption, image });
        } else {
          const text = row.querySelector('.block-text').value.trim();
          if (text === '') continue;
          result.push({ style, text });
        }
      }
      return result;
    }

    function restore(blocks) {
      container.innerHTML = '';
      if (!blocks || blocks.length === 0) {
        addBlock('paragraph-lg', '');
        return;
      }
      blocks.forEach((b) => addBlock(b.style, b.text, b.image));
    }

    reset();
    return { addBlock, reset, collectRaw, collect, collectForPublish, restore };
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
            <button class="icon-btn" data-edit-post="${escapeHtml(post.id)}">Edit</button>
            <a class="icon-btn" href="/post/?id=${encodeURIComponent(post.id)}">View</a>
            <button class="icon-btn danger" data-delete-post="${escapeHtml(post.id)}">Delete</button>
          </div>
        </div>`;
    }).join('');
    list.querySelectorAll('[data-edit-post]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const post = await JournalData.getPostById(btn.getAttribute('data-edit-post'));
        if (post) enterJournalEditMode(post);
      });
    });
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
            <button class="icon-btn" data-edit-project="${escapeHtml(project.id)}">Edit</button>
            <a class="icon-btn" href="/project/?id=${encodeURIComponent(project.id)}">View</a>
            <button class="icon-btn danger" data-delete-project="${escapeHtml(project.id)}">Delete</button>
          </div>
        </div>`;
    }).join('');
    list.querySelectorAll('[data-edit-project]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const project = await ProjectData.getProjectById(btn.getAttribute('data-edit-project'));
        if (project) enterProjectEditMode(project);
      });
    });
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
  // Each of these holds either null, a fresh "data:" URL pending upload, or
  // (when editing a published item) the already-hosted https:// URL as-is.
  let journalImageDataUrl = null;
  let projectBannerDataUrl = null;
  let projectIconDataUrl = null;
  let projectClientLogoDataUrl = null;

  function wireImageInput(inputId, previewId, onSet) {
    const input = document.getElementById(inputId);
    const preview = previewId ? document.getElementById(previewId) : null;
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) {
        onSet(null);
        if (preview) preview.classList.remove('show');
        handleFormChange();
        return;
      }
      const dataUrl = await CmsImages.resizeImageToDataUrl(file);
      onSet(dataUrl);
      if (preview) {
        preview.src = dataUrl;
        preview.classList.add('show');
      }
      handleFormChange();
    });
  }

  // ---------- Crop tool (cover/banner image -> a separate cropped card image) ----------
  // A fixed 16:9 frame the source image is panned/zoomed inside; whatever is
  // visible in the frame is rendered to a canvas on demand as the actual
  // image used on cards (Home/Work/Devlog), completely separate from the
  // original full image used as the post/project's own hero photo.
  const CROP_ASPECT = 16 / 9;

  function makeCropPicker({ imgId, editorId, frameId, zoomId, onChange }) {
    const img = document.getElementById(imgId);
    const editor = document.getElementById(editorId);
    const frame = document.getElementById(frameId);
    const zoomInput = document.getElementById(zoomId);
    img.crossOrigin = 'anonymous';

    let naturalW = 0;
    let naturalH = 0;
    let baseScale = 1;
    let zoom = 1;
    let panX = 0;
    let panY = 0;

    function frameSize() {
      const rect = frame.getBoundingClientRect();
      return { w: rect.width, h: rect.height };
    }

    function clampPan() {
      const { w: fw, h: fh } = frameSize();
      const scale = baseScale * zoom;
      panX = Math.max(fw - naturalW * scale, Math.min(0, panX));
      panY = Math.max(fh - naturalH * scale, Math.min(0, panY));
    }

    function render() {
      const scale = baseScale * zoom;
      img.style.width = (naturalW * scale) + 'px';
      img.style.height = (naturalH * scale) + 'px';
      img.style.transform = `translate(${panX}px, ${panY}px)`;
    }

    function emitChange() {
      onChange(toDataUrl());
    }

    function load(dataUrl) {
      return new Promise((resolve) => {
        const probe = new Image();
        probe.crossOrigin = 'anonymous';
        probe.onload = () => {
          naturalW = probe.naturalWidth;
          naturalH = probe.naturalHeight;
          img.src = dataUrl;
          editor.classList.add('show');
          requestAnimationFrame(() => {
            const { w: fw, h: fh } = frameSize();
            baseScale = Math.max(fw / naturalW, fh / naturalH);
            zoom = 1;
            zoomInput.value = 100;
            panX = (fw - naturalW * baseScale) / 2;
            panY = (fh - naturalH * baseScale) / 2;
            clampPan();
            render();
            emitChange();
            resolve();
          });
        };
        probe.src = dataUrl;
      });
    }

    function hide() {
      editor.classList.remove('show');
      img.removeAttribute('src');
      naturalW = 0;
      naturalH = 0;
    }

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;

    function pointerDown(e) {
      if (!naturalW) return;
      dragging = true;
      const p = e.touches ? e.touches[0] : e;
      startX = p.clientX;
      startY = p.clientY;
      startPanX = panX;
      startPanY = panY;
    }

    function pointerMove(e) {
      if (!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      panX = startPanX + (p.clientX - startX);
      panY = startPanY + (p.clientY - startY);
      clampPan();
      render();
      emitChange();
    }

    function pointerUp() { dragging = false; }

    frame.addEventListener('mousedown', pointerDown);
    window.addEventListener('mousemove', pointerMove);
    window.addEventListener('mouseup', pointerUp);
    frame.addEventListener('touchstart', pointerDown, { passive: true });
    frame.addEventListener('touchmove', pointerMove, { passive: true });
    frame.addEventListener('touchend', pointerUp);

    zoomInput.addEventListener('input', () => {
      if (!naturalW) return;
      const { w: fw, h: fh } = frameSize();
      const oldScale = baseScale * zoom;
      const centerImgX = (fw / 2 - panX) / oldScale;
      const centerImgY = (fh / 2 - panY) / oldScale;
      zoom = Number(zoomInput.value) / 100;
      const newScale = baseScale * zoom;
      panX = fw / 2 - centerImgX * newScale;
      panY = fh / 2 - centerImgY * newScale;
      clampPan();
      render();
      emitChange();
    });

    // Renders whatever is currently visible inside the frame to a canvas —
    // this is the actual cropped image that gets uploaded for cards.
    function toDataUrl(outputW = 800) {
      if (!naturalW) return null;
      const outputH = Math.round(outputW / CROP_ASPECT);
      const scale = baseScale * zoom;
      const { w: fw, h: fh } = frameSize();
      const sx = -panX / scale;
      const sy = -panY / scale;
      const sw = fw / scale;
      const sh = fh / scale;
      const canvas = document.createElement('canvas');
      canvas.width = outputW;
      canvas.height = outputH;
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, outputW, outputH);
      return canvas.toDataURL('image/jpeg', 0.85);
    }

    function hasImage() { return naturalW > 0; }

    return { load, hide, toDataUrl, hasImage };
  }

  let journalCardImageDataUrl = null;
  let projectCardBannerDataUrl = null;

  const journalCropPicker = makeCropPicker({
    imgId: 'jImageCropImg', editorId: 'jImageCropEditor', frameId: 'jImageCropFrame', zoomId: 'jImageCropZoom',
    onChange: (dataUrl) => { journalCardImageDataUrl = dataUrl; handleFormChangeDebounced(); }
  });
  const projectCropPicker = makeCropPicker({
    imgId: 'pBannerCropImg', editorId: 'pBannerCropEditor', frameId: 'pBannerCropFrame', zoomId: 'pBannerCropZoom',
    onChange: (dataUrl) => { projectCardBannerDataUrl = dataUrl; handleFormChangeDebounced(); }
  });

  wireImageInput('jImage', null, (v) => {
    journalImageDataUrl = v;
    if (v) journalCropPicker.load(v); else { journalCropPicker.hide(); journalCardImageDataUrl = null; }
  });
  wireImageInput('pBanner', null, (v) => {
    projectBannerDataUrl = v;
    if (v) projectCropPicker.load(v); else { projectCropPicker.hide(); projectCardBannerDataUrl = null; }
  });
  wireImageInput('pIcon', 'pIconPreview', (v) => { projectIconDataUrl = v; });
  wireImageInput('pClientLogo', 'pClientLogoPreview', (v) => { projectClientLogoDataUrl = v; });

  // Resolves one of the image-tracking vars above into a final URL to save:
  // uploads a freshly-picked file or data URL, or passes an existing hosted
  // URL straight through untouched.
  async function resolveImageForSave(fileInputId, currentValue) {
    const file = document.getElementById(fileInputId).files[0];
    if (file) return CmsImages.uploadImage(file);
    if (!currentValue) return null;
    return currentValue.startsWith('data:') ? CmsImages.uploadImageFromDataUrl(currentValue) : currentValue;
  }

  // Cropped card images only ever exist as a canvas-rendered data URL (fresh
  // crop) or an already-hosted URL carried over unchanged from edit mode —
  // never a raw <input type=file>, so this is simpler than resolveImageForSave.
  async function resolveCardImageForSave(dataUrlOrUrl) {
    if (!dataUrlOrUrl) return null;
    return dataUrlOrUrl.startsWith('data:') ? CmsImages.uploadImageFromDataUrl(dataUrlOrUrl) : dataUrlOrUrl;
  }

  // ---------- Client social links ----------
  const clientLinksEditor = document.getElementById('clientLinksEditor');
  clientLinksEditor.innerHTML = CLIENT_LINK_PLATFORMS.map((p) => `
    <div class="client-link-row" data-platform="${p.value}">
      <label class="checkbox-label"><input type="checkbox" class="client-link-toggle" /> ${p.label}</label>
      <input type="url" class="client-link-url" placeholder="https://..." disabled />
    </div>
  `).join('');

  clientLinksEditor.addEventListener('change', (e) => {
    if (!e.target.classList.contains('client-link-toggle')) return;
    const row = e.target.closest('.client-link-row');
    const urlInput = row.querySelector('.client-link-url');
    urlInput.disabled = !e.target.checked;
    if (e.target.checked) urlInput.focus();
  });

  function collectClientLinks() {
    return Array.from(clientLinksEditor.querySelectorAll('.client-link-row'))
      .map((row) => {
        const platform = row.dataset.platform;
        const label = CLIENT_LINK_PLATFORMS.find((p) => p.value === platform).label;
        const checked = row.querySelector('.client-link-toggle').checked;
        const url = row.querySelector('.client-link-url').value.trim();
        return { platform, label, url, checked };
      })
      .filter((l) => l.checked && l.url)
      .map(({ platform, label, url }) => ({ platform, label, url }));
  }

  function restoreClientLinks(links) {
    const byPlatform = {};
    (links || []).forEach((l) => { byPlatform[l.platform] = l.url; });
    clientLinksEditor.querySelectorAll('.client-link-row').forEach((row) => {
      const toggle = row.querySelector('.client-link-toggle');
      const urlInput = row.querySelector('.client-link-url');
      const url = byPlatform[row.dataset.platform];
      toggle.checked = !!url;
      urlInput.disabled = !url;
      urlInput.value = url || '';
    });
  }

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
        <div class="eyebrow">${escapeHtml(category || 'Category')}</div>
        <h1>${escapeHtml(title || 'Your Post Title')}</h1>
        <p class="article-lead">${formatDate(new Date().toISOString())} &middot; ${readingMinutes} min read</p>
        ${imageHtml}
        <div class="article-body">${bodyHtml}</div>
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
      const clientCardHtml = renderClientCardHtml({
        client,
        clientLogo: projectClientLogoDataUrl,
        clientLinks: collectClientLinks()
      });
      html = `
        <h1>${escapeHtml(title || 'Project Title')}</h1>
        <p class="page-lead">${escapeHtml(tagline || 'Tagline goes here')}${client ? ' &middot; for ' + escapeHtml(client) : ''}</p>
        ${imageHtml}
        ${clientCardHtml}
        <div class="case-block">${bodyHtml}</div>
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
        imageDataUrl: journalImageDataUrl,
        cardImageDataUrl: journalCardImageDataUrl
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
        cardBannerDataUrl: projectCardBannerDataUrl,
        iconDataUrl: projectIconDataUrl,
        clientLogoDataUrl: projectClientLogoDataUrl,
        clientLinks: collectClientLinks()
      };
      localStorage.setItem(DRAFT_KEYS.project, JSON.stringify(draft));
    }
  }

  // Editing an existing published item is never autosaved as a "draft" —
  // that would risk restoring it as a fresh create-new item (and publishing
  // a duplicate) after a reload, since the editing state itself is in-memory
  // only. The live preview still updates as normal.
  function handleFormChange() {
    if ((activeType === 'journal' && editingJournalId) || (activeType === 'project' && editingProjectId)) {
      updatePreview();
      return;
    }
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
      journalCropPicker.load(draft.imageDataUrl).then(() => {
        if (draft.cardImageDataUrl) journalCardImageDataUrl = draft.cardImageDataUrl;
      });
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
      projectCropPicker.load(draft.bannerDataUrl).then(() => {
        if (draft.cardBannerDataUrl) projectCardBannerDataUrl = draft.cardBannerDataUrl;
      });
    }
    if (draft.iconDataUrl) {
      projectIconDataUrl = draft.iconDataUrl;
      const preview = document.getElementById('pIconPreview');
      preview.src = draft.iconDataUrl;
      preview.classList.add('show');
    }
    if (draft.clientLogoDataUrl) {
      projectClientLogoDataUrl = draft.clientLogoDataUrl;
      const preview = document.getElementById('pClientLogoPreview');
      preview.src = draft.clientLogoDataUrl;
      preview.classList.add('show');
    }
    restoreClientLinks(draft.clientLinks);
  }

  function draftHasContent(draft) {
    if (!draft) return false;
    return !!(draft.title || draft.excerpt || draft.tagline || draft.imageDataUrl || draft.bannerDataUrl ||
      (draft.blocks || []).some((b) => b.text));
  }

  function resetJournalForm() {
    document.getElementById('journalForm').reset();
    journalImageDataUrl = null;
    journalCardImageDataUrl = null;
    journalCropPicker.hide();
    journalBlocks.reset();
    document.getElementById('jSchedulePanel').classList.remove('open');
    document.getElementById('jPublishAt').value = '';
  }

  function resetProjectForm() {
    document.getElementById('projectForm').reset();
    projectBannerDataUrl = null;
    projectCardBannerDataUrl = null;
    projectIconDataUrl = null;
    projectClientLogoDataUrl = null;
    ['pIconPreview', 'pClientLogoPreview'].forEach((id) => {
      const preview = document.getElementById(id);
      preview.classList.remove('show');
      preview.src = '';
    });
    projectCropPicker.hide();
    restoreClientLinks([]);
    projectBlocks.reset();
    document.getElementById('pSchedulePanel').classList.remove('open');
    document.getElementById('pPublishAt').value = '';
  }

  // ---------- Edit mode (loads a published entry/project back into its form) ----------
  function enterJournalEditMode(post) {
    clearDraft('journal');
    editingJournalId = post.id;
    editingJournalOriginalDate = post.date;

    document.getElementById('jTitle').value = post.title;
    document.getElementById('jCategory').value = post.category;
    document.getElementById('jExcerpt').value = post.excerpt;

    journalImageDataUrl = post.image;
    journalCropPicker.load(post.image).then(() => {
      if (post.cardImage) journalCardImageDataUrl = post.cardImage;
    });

    journalBlocks.restore(post.content);

    const isScheduled = new Date(post.date) > new Date();
    document.getElementById('jScheduleToggle').checked = isScheduled;
    document.getElementById('jSchedulePanel').classList.toggle('open', isScheduled);
    document.getElementById('jPublishAt').value = isScheduled ? nowForInput(post.date) : '';

    setActiveType('journal');
    document.getElementById('jSubmitBtn').textContent = 'Save Changes';
    window.scrollTo({ top: journalForm.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
  }

  function exitJournalEditMode() {
    editingJournalId = null;
    editingJournalOriginalDate = null;
    resetJournalForm();
    document.getElementById('jSubmitBtn').textContent = 'Publish Entry';
    setActiveType('journal');
  }

  function enterProjectEditMode(project) {
    clearDraft('project');
    editingProjectId = project.id;
    editingProjectOriginalDate = project.date;

    document.getElementById('pTitle').value = project.title;
    document.querySelectorAll('.pCategory').forEach((c) => { c.checked = (project.categories || []).includes(c.value); });
    document.getElementById('pPlatforms').value = (project.platforms || []).join(', ');
    document.getElementById('pClient').value = project.client || '';
    document.getElementById('pTagline').value = project.tagline;
    document.getElementById('pFeatured').checked = !!project.featured;

    projectBannerDataUrl = project.banner;
    projectCropPicker.load(project.banner).then(() => {
      if (project.cardBanner) projectCardBannerDataUrl = project.cardBanner;
    });

    if (project.icon) {
      projectIconDataUrl = project.icon;
      const iconPreview = document.getElementById('pIconPreview');
      iconPreview.src = project.icon;
      iconPreview.classList.add('show');
    }

    if (project.clientLogo) {
      projectClientLogoDataUrl = project.clientLogo;
      const logoPreview = document.getElementById('pClientLogoPreview');
      logoPreview.src = project.clientLogo;
      logoPreview.classList.add('show');
    }
    restoreClientLinks(project.clientLinks);

    projectBlocks.restore(project.brief);

    const isScheduled = new Date(project.date) > new Date();
    document.getElementById('pScheduleToggle').checked = isScheduled;
    document.getElementById('pSchedulePanel').classList.toggle('open', isScheduled);
    document.getElementById('pPublishAt').value = isScheduled ? nowForInput(project.date) : '';

    setActiveType('project');
    document.getElementById('pSubmitBtn').textContent = 'Save Changes';
    window.scrollTo({ top: projectForm.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
  }

  function exitProjectEditMode() {
    editingProjectId = null;
    editingProjectOriginalDate = null;
    resetProjectForm();
    document.getElementById('pSubmitBtn').textContent = 'Publish Project';
    setActiveType('project');
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
    if (journalBlocks.collect().length === 0) {
      alert('Add at least one content block with some text or a photo.');
      return;
    }

    const isEditing = !!editingJournalId;
    const publishAtDate = (document.getElementById('jScheduleToggle').checked && document.getElementById('jPublishAt').value)
      ? new Date(document.getElementById('jPublishAt').value)
      : (isEditing ? new Date(editingJournalOriginalDate) : new Date());
    const isScheduled = publishAtDate.getTime() > Date.now();
    const actionLabel = isEditing
      ? 'save changes to this entry'
      : (isScheduled ? `schedule this post for ${formatDateTime(publishAtDate.toISOString())}` : 'publish this post');

    const ok = await confirmWithPassword(actionLabel);
    if (!ok) return;

    const submitBtn = document.getElementById('jSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? 'Saving...' : (isScheduled ? 'Scheduling...' : 'Publishing...');

    try {
      const image = await resolveImageForSave('jImage', journalImageDataUrl);
      const cardImage = await resolveCardImageForSave(journalCardImageDataUrl);
      const content = await journalBlocks.collectForPublish();
      const payload = {
        title: document.getElementById('jTitle').value.trim(),
        category: document.getElementById('jCategory').value.trim(),
        excerpt: document.getElementById('jExcerpt').value.trim(),
        image,
        cardImage,
        content,
        publishAt: publishAtDate.toISOString()
      };

      if (isEditing) await JournalData.updatePost(editingJournalId, payload);
      else await JournalData.addPost(payload);

      clearDraft('journal');
      exitJournalEditMode();
      updatePreview();
      document.getElementById('draftRestored').classList.remove('show');
      showSuccess(isEditing ? 'Entry updated!' : (isScheduled ? `Post scheduled for ${formatDateTime(publishAtDate.toISOString())}!` : 'Post published!'));
      renderJournalList();
    } catch (err) {
      alert('Something went wrong saving this post: ' + err.message);
      submitBtn.textContent = isEditing ? 'Save Changes' : 'Publish Entry';
    } finally {
      submitBtn.disabled = false;
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
    if (projectBlocks.collect().length === 0) {
      alert('Add at least one brief block with some text or a photo.');
      return;
    }
    const categories = Array.from(document.querySelectorAll('.pCategory:checked')).map((c) => c.value);
    if (categories.length === 0) {
      alert('Pick at least one type (Game, App, or Prototype).');
      return;
    }

    const isEditing = !!editingProjectId;
    const publishAtDate = (document.getElementById('pScheduleToggle').checked && document.getElementById('pPublishAt').value)
      ? new Date(document.getElementById('pPublishAt').value)
      : (isEditing ? new Date(editingProjectOriginalDate) : new Date());
    const isScheduled = publishAtDate.getTime() > Date.now();
    const actionLabel = isEditing
      ? 'save changes to this project'
      : (isScheduled ? `schedule this project for ${formatDateTime(publishAtDate.toISOString())}` : 'publish this project');

    const ok = await confirmWithPassword(actionLabel);
    if (!ok) return;

    const submitBtn = document.getElementById('pSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? 'Saving...' : (isScheduled ? 'Scheduling...' : 'Publishing...');

    try {
      const banner = await resolveImageForSave('pBanner', projectBannerDataUrl);
      const cardBanner = await resolveCardImageForSave(projectCardBannerDataUrl);
      const icon = await resolveImageForSave('pIcon', projectIconDataUrl);
      const clientLogo = await resolveImageForSave('pClientLogo', projectClientLogoDataUrl);

      const platforms = document.getElementById('pPlatforms').value
        .split(',').map((s) => s.trim()).filter(Boolean);
      const brief = await projectBlocks.collectForPublish();
      const clientLinks = collectClientLinks();

      const payload = {
        title: document.getElementById('pTitle').value.trim(),
        categories,
        platforms,
        client: document.getElementById('pClient').value.trim() || null,
        tagline: document.getElementById('pTagline').value.trim(),
        banner,
        cardBanner,
        icon,
        brief,
        featured: document.getElementById('pFeatured').checked,
        publishAt: publishAtDate.toISOString(),
        clientLogo,
        clientLinks
      };

      if (isEditing) await ProjectData.updateProject(editingProjectId, payload);
      else await ProjectData.addProject(payload);

      clearDraft('project');
      exitProjectEditMode();
      updatePreview();
      document.getElementById('draftRestored').classList.remove('show');
      showSuccess(isEditing ? 'Project updated!' : (isScheduled ? `Project scheduled for ${formatDateTime(publishAtDate.toISOString())}!` : 'Project published!'));
      renderProjectList();
    } catch (err) {
      alert('Something went wrong saving this project: ' + err.message);
      submitBtn.textContent = isEditing ? 'Save Changes' : 'Publish Project';
    } finally {
      submitBtn.disabled = false;
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
