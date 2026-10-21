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

  // Optional care plan: the choices come from Admin -> Homepage & settings -> Care plans.
  const careTiers = ((SETTINGS.care || {}).tiers || []).filter(t => t.name && t.price);
  if (!careTiers.length || !App.visible('care')) $('#careField').hidden = true;
  else {
    $('#careSelect').insertAdjacentHTML('beforeend', careTiers.map(t => `<option value="${esc(App.careKey(t))}">${esc(t.name)} (${esc(t.price)}${esc(t.per || '')})</option>`).join(''));
  }

  // The first step is just name, email and what you need. The rest opens when asked for.
  const more = $('#moreFields'), toggle = $('#moreToggle');
  toggle.addEventListener('click', () => {
    const open = more.hidden;
    more.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    $('#moreLabel').textContent = open ? 'Hide extra detail' : 'Add more detail';
    if (open) $('input', more).focus();
  });
  // Arriving from a care plan button (/request/?care=growth): choose it and show the extra detail.
  const wantCare = new URLSearchParams(location.search).get('care');
  if (wantCare && [...$('#careSelect').options].some(o => o.value === wantCare)) { $('#careSelect').value = wantCare; toggle.click(); }

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
    const fields = Object.fromEntries(['kind', 'name', 'email', 'phone', 'company', 'current_site', 'timeline', 'brief', 'links'].map(k => [k, String(f.get(k) || '').trim()]));
    // A chosen care plan travels with the brief, so it shows in the Orders screen and the email to you.
    const care = form.care.selectedOptions[0];
    if (care && care.value && care.value !== 'none') fields.brief += `\n\nCare plan interest: ${care.textContent}`;
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
