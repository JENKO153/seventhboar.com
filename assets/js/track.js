/* The customer's private tracker: /track/?o=<number>&k=<key>. Shows where their request is up to. */
(async function () {
  await App.boot('request');
  const box = $('#trackBox');
  const params = new URLSearchParams(location.search);
  const number = Number(params.get('o')), key = params.get('k') || '';

  const notFound = msg => {
    document.title = 'Request not found | Seventh Boar Development';
    box.innerHTML = `<div class="page-head"><div class="wrap">
      <div class="crumbs"><a href="/">Home</a> // <span>Track</span></div>
      <h1 class="display">Request not found.</h1>
      <p class="lead">${esc(msg || 'That link doesn\'t match a request. Check the link in your email, or get in touch and we\'ll help.')}</p>
      <div class="page-head__actions"><a class="btn" href="mailto:${esc(SITE.email)}">Email us</a><a class="btn btn--ghost" href="/request/">Start a request</a></div>
    </div></div>`;
  };
  if (!number || key.length < 32) return notFound();

  let r;
  try { r = await CMS.getRequestStatus(number, key); } catch (err) { return notFound(err.message); }
  if (!r) return notFound();

  const stages = stagesFor(r.kind);
  const declined = r.stage === 'declined';
  const at = stages.findIndex(s => s.key === r.stage);
  const cur = stages[at];
  const words = r.kind === 'app' ? 'app' : 'website';
  const history = [...(r.history || [])].reverse();

  document.title = `${requestNo(r)} | Track your request`;
  box.innerHTML = `
    <div class="page-head">
      <div class="wrap">
        <div class="crumbs"><a href="/">Home</a> // <span>Track your request</span></div>
        <span class="eyebrow" style="display:block;margin-top:18px">${esc(requestNo(r))} // ${esc(words)}${r.company ? ' // ' + esc(r.company) : ''}</span>
        <h1 class="display">${declined ? 'Not this time.' : esc(cur ? cur.label : 'In progress') + '.'}</h1>
        <p class="lead">${declined
          ? `Thanks for asking, ${esc(r.first_name)}. We aren't able to take this one on right now.`
          : esc(cur ? cur.text : '')}</p>
      </div>
    </div>
    <section class="section">
      <div class="wrap track">
        ${declined ? '' : `<ol class="stepper" aria-label="Progress">${stages.map((s, i) => `
          <li class="${i < at ? 'done' : i === at ? 'now' : 'todo'}"${i === at ? ' aria-current="step"' : ''}>
            <span class="stepper__dot">${i < at ? ICON.check : i + 1}</span><b>${esc(s.label)}</b></li>`).join('')}</ol>`}
        <div class="panel reveal">
          <span class="eyebrow">Updates</span>
          <ul class="timeline">${history.map(h => `
            <li><time>${esc(fmtDate(h.at, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }))}</time>
              <b>${esc(stageLabel(r.kind, h.stage))}</b>${h.note ? `<p>${esc(h.note)}</p>` : ''}</li>`).join('')}</ul>
        </div>
        <p class="muted" style="margin:24px 0 0">Questions? Reply to any of our emails or write to <a class="link-arrow" style="display:inline" href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>. Keep this link private: anyone with it can see this page.</p>
      </div>
    </section>`;
  window.ScrollReveal?.scan(box);
})();
