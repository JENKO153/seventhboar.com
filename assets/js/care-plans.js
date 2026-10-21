/* The Care & hosting plans page. Everything on it comes from Admin -> Homepage & settings -> Care plans,
   so the page, the request form and the pricing teaser always agree. */
App.boot('care').then(() => {
  const c = SETTINGS.care || {};
  const tiers = (c.tiers || []).filter(t => t.name);
  $('#care-tiers').hidden = !tiers.length;
  if (c.intro) $('#care-lead').textContent = c.intro;
  if (tiers.length) {
    $('#care-eyebrow').textContent = c.eyebrow || '';
    $('#care-title').textContent = c.title || 'Care & hosting plans';
    $('#care-intro').textContent = c.intro || '';
    $('#care-note').textContent = c.note || '';
    $('#care-grid').innerHTML = tiers.map(t => `
      <article class="tier reveal">
        <span class="code">${esc(t.tag || '') || '&nbsp;'}</span>
        <h3 class="display">${esc(t.name)}</h3>
        <div class="tier__price">${esc(t.price)}<small>${esc(t.per || '')}</small></div>
        ${t.text ? `<p>${esc(t.text)}</p>` : ''}
        ${(t.bullets || []).length ? `<ul class="feature-list">${t.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        <a class="btn" href="/request/?care=${encodeURIComponent(App.careKey(t))}">Add to my project</a>
      </article>`).join('');
  }
  const cm = c.compare || {};
  const items = (cm.items || []).filter(i => i.title);
  $('#care-compare').hidden = !items.length;
  if (items.length) {
    $('#compare-eyebrow').textContent = cm.eyebrow || '';
    $('#compare-title').textContent = cm.title || '';
    $('#compare-intro').textContent = cm.intro || '';
    $('#compare-note').textContent = cm.note || '';
    $('#compare-grid').innerHTML = items.map((i, n) => `<div><span class="code">0${n + 1} //</span><strong>${esc(i.title)}</strong><b class="compare__total">${esc(i.total)}</b><p>${esc(i.text)}</p></div>`).join('');
  }
  window.ScrollReveal?.scan();
});
