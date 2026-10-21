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
    $('#pricing-trust').hidden = !pr.trust;
    $('#pricing-trust').textContent = pr.trust || '';
    $('#pricing-grid').innerHTML = App.pricingHtml(tiers);
    // The section starts hidden, so a page loaded as /services/#pricing (from an email link)
    // wouldn't otherwise land on it: the browser tried to scroll there before it existed.
    if (location.hash === '#pricing') $('#pricing').scrollIntoView({ block: 'start' });
  }

  // Pages of your own (Admin -> Pages), linked from here so visitors and search engines can reach them:
  // the local/industry pages, and the guides (FAQ, care plans, what a website costs).
  const card = p => `<a class="industry" href="${esc(customPageUrl(p.id))}"><b>${esc(p.navLabel || p.title)}</b><span>${esc(p.intro || '')}</span></a>`;
  const pages = App.customPages();
  const industry = pages.filter(p => p.group === 'industry'), guides = pages.filter(p => p.group !== 'industry');
  $('#industries').hidden = !industry.length; $('#industries-grid').innerHTML = industry.map(card).join('');
  $('#guides').hidden = !guides.length; $('#guides-grid').innerHTML = guides.map(card).join('');
  window.ScrollReveal?.scan();
});
