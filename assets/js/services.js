/* Services page: the cards and the pricing guide come from Admin -> Homepage & settings, so the page and
   the homepage always say the same thing. (The HTML holds the default wording for search engines.) */
App.boot('services').then(() => {
  const sv = SETTINGS.servicesSection;
  if (sv.items?.length) $('#services-grid').innerHTML = App.servicesHtml(sv.items);

  // The pricing guide: hidden until you add tiers in the admin.
  const pr = SETTINGS.pricing || {};
  const tiers = (pr.items || []).filter(t => t.title);
  $('#pricing').hidden = !tiers.length;
  if (tiers.length) {
    $('#pricing-eyebrow').textContent = pr.eyebrow || '';
    $('#pricing-title').textContent = pr.title || 'Pricing guide';
    $('#pricing-intro').textContent = pr.intro || '';
    $('#pricing-foot').textContent = pr.footnote || '';
    $('#pricing-grid').innerHTML = tiers.map(t => `
      <article class="tier reveal">
        ${t.tag ? `<span class="code">${esc(t.tag)}</span>` : ''}
        <h3 class="display">${esc(t.title)}</h3>
        <div class="tier__price">${esc(t.price)}</div>
        ${t.text ? `<p>${esc(t.text)}</p>` : ''}
        ${(t.bullets || []).length ? `<ul class="feature-list">${t.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        <a class="btn" href="/request/${t.kind === 'app' ? '?type=app' : ''}">Send a request</a>
      </article>`).join('');
  }
  window.ScrollReveal?.scan();
});
