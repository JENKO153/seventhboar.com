/* The welcome page for the QR code on the business cards (/hello/). Hidden from search engines and the site menu.
   Services, work, client quotes and social links come from the same admin settings as the rest of the site. */
(async function () {
  $('#wl-year').textContent = new Date().getFullYear();
  const data = await App.boot('hello');
  const s = SETTINGS;
  const email = s.footer.email || SITE.email;
  $('#wl-email').href = `mailto:${email}`;
  $('#wl-mail').href = `mailto:${email}`; $('#wl-mail').textContent = email;

  // What we do
  const sv = s.servicesSection;
  $('#wl-services-title').textContent = sv.title;
  $('#wl-services-intro').textContent = sv.intro;
  $('#wl-services-grid').innerHTML = App.servicesHtml(sv.items);

  // Recent work: featured first, then newest
  const projects = data.projects || [];
  const shown = [...projects.filter(p => p.featured), ...projects.filter(p => !p.featured)].slice(0, 3);
  $('#wl-work').hidden = !shown.length;
  $('#wl-work-grid').innerHTML = shown.map(App.Cards.project).join('');

  // Client words
  const words = (s.reports || []).filter(r => r.quote).slice(0, 2);
  $('#wl-words').hidden = !words.length;
  const initials = n => String(n || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  $('#wl-words-grid').innerHTML = words.map(r => `
    <blockquote class="report">
      <div class="report__top"><span class="stars">${'★'.repeat(Math.max(1, Math.min(5, +r.stars || 5)))}</span>${r.verified ? '<span class="verified">✔ Client</span>' : ''}</div>
      <q>${esc(r.quote)}</q>
      <footer><i>${esc(initials(r.name))}</i><div>${esc(r.name)}<small>${esc(r.meta)}</small></div></footer>
    </blockquote>`).join('');

  // Social links
  const socials = (s.socials || []).filter(x => x.label && safeLink(x.url));
  $('#wl-socials').innerHTML = socials.map(x => `<a href="${esc(safeLink(x.url))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(x.label)}" title="${esc(x.label)}">${socialSvg(iconFor(x.label, x.url))}</a>`).join('');

  // "Save our contact": a vCard that drops straight into the phone's contacts
  $('#wl-vcard').addEventListener('click', () => {
    const v = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${SITE.name}`, `N:;${SITE.name};;;`, `ORG:${SITE.name}`, 'TITLE:Websites and apps',
      `EMAIL;TYPE=WORK:${email}`, `URL:${SITE.url}`, ...socials.map(x => `URL:${x.url}`),
      'NOTE:Custom websites for businesses and brands. Apps built on request.', 'END:VCARD'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard' }));
    a.download = 'seventh-boar-development.vcf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    App.toast('Contact saved');
  });

  window.ScrollReveal?.scan();
})();
