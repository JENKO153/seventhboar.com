/* The project request form: sends a website / app request, then shows the customer their private tracking link. */
(async function () {
  await App.boot('request');
  const form = $('#requestForm'), status = $('#requestStatus'), btn = $('#requestSubmit');

  const kindNow = () => (form.kind.value === 'app' ? 'app' : 'website');
  const setKind = k => {
    $$('input[name=kind]', form).forEach(r => { r.checked = r.value === k; });
    $('#siteLabel').textContent = k === 'app' ? 'Existing app or website' : 'Current website';
    form.brief.placeholder = k === 'app' ? 'What should the app do, who is it for, and which phones (iOS, Android)?' : 'What is the website for, who is it for, and what does it need to do?';
  };
  setKind(new URLSearchParams(location.search).get('type') === 'app' ? 'app' : 'website');
  form.addEventListener('change', e => { if (e.target.name === 'kind') setKind(kindNow()); });

  const show = (msg, kind) => {
    status.textContent = msg;
    status.classList.remove('success', 'error');
    status.classList.add('show', kind);
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.classList.remove('show');
    if (form.website.value) return;                       // the hidden field: only bots fill it in
    if (!form.reportValidity()) return;
    const f = new FormData(form);
    const fields = Object.fromEntries(['kind', 'name', 'email', 'phone', 'company', 'current_site', 'budget', 'timeline', 'brief', 'links'].map(k => [k, String(f.get(k) || '').trim()]));
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      if (PREVIEW) throw new Error('Preview only: requests are switched off here.');
      const r = await CMS.submitRequest(fields);
      const trackUrl = `/track/?o=${encodeURIComponent(r.number)}&k=${encodeURIComponent(r.key)}`;
      const first = fields.name.split(/\s+/)[0];
      $('#doneTitle').textContent = `Thank you, ${first}.`;
      $('#doneText').textContent = r.emailed
        ? `Your request ${'SB-' + r.number} is in. We've emailed you a confirmation with your private tracking link, and we'll email you again as soon as we've had a look.`
        : `Your request ${'SB-' + r.number} is in. Keep the tracking link below: it's private to you and shows where your request is up to. We'll be in touch soon.`;
      $('#doneTrack').href = trackUrl;
      form.hidden = true; $('.request aside')?.setAttribute('hidden', ''); $('#requestDone').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      show(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Send request';
    }
  });
})();
