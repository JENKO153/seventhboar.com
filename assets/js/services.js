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
    $('#pricing-grid').innerHTML = App.pricingHtml(tiers);
    // The section starts hidden, so a page loaded as /services/#pricing (from an email link)
    // wouldn't otherwise land on it: the browser tried to scroll there before it existed.
    if (location.hash === '#pricing') $('#pricing').scrollIntoView({ block: 'start' });
  }
  window.ScrollReveal?.scan();
});
