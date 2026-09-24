/* Renders the content blocks of a devlog entry or a project brief.
   A block is { style, text, image? } — the same shape the admin's builder saves.
   Shared by the public pages and the admin's live preview. */
window.Blocks = (function () {
  function normalize(block) {
    if (typeof block === 'string') return { style: 'paragraph', text: block };
    return { style: block.style || 'paragraph', text: block.text || '', image: block.image || '' };
  }

  function render(block) {
    const e = window.esc;
    if (block.style === 'photo') {
      if (!block.image) return '';
      const caption = block.text ? `<figcaption>${e(block.text)}</figcaption>` : '';
      return `<figure><img src="${e(block.image)}" alt="${e(block.text || '')}" loading="lazy">${caption}</figure>`;
    }
    const text = e(block.text);
    switch (block.style) {
      case 'title': return `<h2>${text}</h2>`;
      case 'subtitle': return `<h3>${text}</h3>`;
      case 'paragraph-lg': return `<p class="lead">${text}</p>`;
      case 'paragraph-sm': return `<p class="small">${text}</p>`;
      case 'bullets': {
        const items = text.split('\n').map(s => s.trim()).filter(Boolean).map(s => `<li>${s}</li>`).join('');
        return items ? `<ul>${items}</ul>` : '';
      }
      default: return `<p>${text}</p>`;
    }
  }

  // Blocks that actually have something in them.
  const clean = blocks => (blocks || []).map(normalize).filter(b => b.text.trim() !== '' || (b.style === 'photo' && b.image));
  const html = blocks => clean(blocks).map(render).join('');
  const readingMinutes = blocks => Math.max(1, Math.round(clean(blocks).reduce((n, b) => n + b.text.split(/\s+/).filter(Boolean).length, 0) / 200));

  return { normalize, render, clean, html, readingMinutes };
})();
