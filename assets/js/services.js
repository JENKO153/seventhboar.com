/* Services page: the cards come from Admin -> Homepage & settings -> Services, so the page and the
   homepage always say the same thing. (The HTML holds the default wording for search engines.) */
App.boot('services').then(() => {
  const sv = SETTINGS.servicesSection;
  if (sv.items?.length) $('#services-grid').innerHTML = App.servicesHtml(sv.items);
  window.ScrollReveal?.scan();
});
