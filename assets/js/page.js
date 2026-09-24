/* Pages with no data of their own (About, Services, Contact, Privacy, 404): just the shared
   header, footer and scroll-in animation. */
App.boot(document.body.dataset.page).then(() => window.ScrollReveal?.scan());
