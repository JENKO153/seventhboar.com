/* Seventh Boar admin: Orders (project requests) with a progress tracker.
 * A request arrives from the form on /request/ (and lands in your inbox as a styled email). Here you
 * accept or decline it, then move it through the stages. Each change emails the customer and shows on
 * their private tracking page. Every change asks for your password. */
(function () {
  const { $, $$, esc, view } = AD;

  const isDone = r => ['launched', 'released'].includes(r.stage);
  const bucket = r => (r.stage === 'received' ? 'new' : r.stage === 'declined' ? 'declined' : isDone(r) ? 'done' : 'active');
  const stagePill = r => {
    const cls = r.stage === 'received' ? 'pill--draft' : r.stage === 'declined' ? 'pill--red' : isDone(r) ? 'pill--live' : 'pill--accent';
    return `<span class="pill ${cls}">${esc(stageLabel(r.kind, r.stage))}</span>`;
  };
  const kindTag = r => `<span class="tag">${r.kind === 'app' ? 'App' : 'Website'}</span>`;
  const trackUrl = r => `${location.origin}/track/?o=${r.number}&k=${encodeURIComponent(r.accessKey)}`;
  AD.updateOrderBadge = () => {
    const n = (AD.DATA.requests || []).filter(r => r.stage === 'received').length;
    const el = $('#ordCount'); if (el) { el.textContent = n; el.hidden = !n; }
  };

  /* =====================================================================
     LIST
     ===================================================================== */
  let filter = null;
  function orders() {
    AD.setTitle('Orders');
    const R = AD.DATA.requests || [];
    const count = k => (k === 'all' ? R.length : R.filter(r => bucket(r) === k).length);
    if (filter === null) filter = count('new') ? 'new' : 'active';
    view.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <div class="seg" id="ordTabs" role="tablist">
            ${[['new', 'Needs review'], ['active', 'In progress'], ['done', 'Finished'], ['declined', 'Declined'], ['all', 'All']].map(([k, l]) =>
              `<button type="button" role="tab" data-f="${k}" class="${filter === k ? 'on' : ''}">${l} <small>${count(k)}</small></button>`).join('')}
          </div>
          <span style="flex:1"></span>
          <select id="fKind" aria-label="Type"><option value="">Websites and apps</option><option value="website">Websites</option><option value="app">Apps</option></select>
          <input id="q" type="search" placeholder="Search orders" maxlength="80" aria-label="Search orders">
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Progress</th><th class="num">Received</th></tr></thead>
          <tbody id="rows"></tbody>
        </table></div>
      </div>
      <p class="hint" style="margin-top:14px">Requests come from the form on <a class="link" href="/request/" target="_blank" rel="noopener">/request/</a>. You also get each one by email at your admin address.</p>`;
    const draw = () => {
      const q = $('#q').value.toLowerCase(), kind = $('#fKind').value;
      const list = R.filter(r => (filter === 'all' || bucket(r) === filter) && (!kind || r.kind === kind)
        && (!q || `${requestNo(r)} ${r.name} ${r.company} ${r.email} ${r.brief}`.toLowerCase().includes(q)));
      $('#rows').innerHTML = list.map(r => `
        <tr data-id="${esc(r.id)}">
          <td><b style="color:var(--bone)">${esc(requestNo(r))}</b></td>
          <td><div class="t-prod"><div><b>${esc(r.name)}</b><small>${esc(r.company || r.email)}</small></div></div></td>
          <td>${kindTag(r)}</td><td>${stagePill(r)}</td><td class="num">${AD.fmtDay(r.createdAt)}</td>
        </tr>`).join('') || `<tr><td colspan="5"><div class="empty">${R.length ? 'Nothing here.' : 'No requests yet. They appear here when someone fills in the request form.'}</div></td></tr>`;
    };
    $('#ordTabs').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; orders(); } });
    ['#q', '#fKind'].forEach(s => $(s).addEventListener('input', draw));
    $('#rows').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) AD.go('#request/' + tr.dataset.id); });
    draw();
  }

  /* =====================================================================
     ONE REQUEST
     ===================================================================== */
  function request(id, action) {
    const r = (AD.DATA.requests || []).find(x => x.id === id);
    if (!r) { AD.toast('That request no longer exists', true); AD.go('#orders'); return; }
    AD.setTitle(requestNo(r));
    const stages = stagesFor(r.kind);
    const at = stages.findIndex(s => s.key === r.stage);
    const declined = r.stage === 'declined';
    const next = at > -1 && at < stages.length - 1 ? stages[at + 1] : null;
    const preset = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : (declined ? 'accepted' : next ? next.key : r.stage);

    const line = (k, v) => (v ? `<div><span class="hint">${k}</span><div style="color:var(--bone);overflow-wrap:anywhere">${v}</div></div>` : '');
    view.innerHTML = `
      <p style="margin:0 0 16px"><a class="link" href="#orders">&larr; All orders</a></p>
      <div class="grid-2">
        <div class="stack">
          <div class="panel"><div class="panel__head"><h2>${esc(requestNo(r))} // ${r.kind === 'app' ? 'App' : 'Website'} request</h2>${stagePill(r)}</div>
            <div class="panel__body stack">
              <div class="field-row">
                ${line('Name', esc(r.name))}
                ${line('Email', `<a class="link" style="color:var(--hot-text)" href="mailto:${esc(r.email)}">${esc(r.email)}</a>`)}
                ${line('Phone', esc(r.phone))}
                ${line('Business', esc(r.company))}
              </div>
              <div class="field-row">
                ${line(r.kind === 'app' ? 'Existing app or website' : 'Current website', esc(r.currentSite))}
                ${line('Budget', esc(r.budget))}
                ${line('When', esc(r.timeline))}
                ${line('Received', esc(AD.fmtDate(r.createdAt)))}
              </div>
              <div><span class="hint">The project</span><div class="cm__body" style="margin-top:6px;background:var(--bg-2);border-left:3px solid var(--hot);padding:14px 16px">${esc(r.brief)}</div></div>
              ${r.links ? `<div><span class="hint">Links or inspiration</span><div class="cm__body" style="margin-top:6px">${esc(r.links)}</div></div>` : ''}
            </div></div>

          <div class="panel"><div class="panel__head"><h2>Private notes</h2><span class="hint">Only you see these</span></div>
            <div class="panel__body stack">
              <textarea id="notes" maxlength="4000" placeholder="Quote details, ideas, things to remember…">${esc(r.adminNotes)}</textarea>
              <div><button type="button" class="btn btn--ghost btn--sm" id="saveNotes">Save notes</button></div>
            </div></div>
        </div>

        <div class="stack">
          <div class="panel"><div class="panel__head"><h2>Progress</h2><a class="link" href="${esc(trackUrl(r))}" target="_blank" rel="noopener">Customer's tracker</a></div>
            <div class="panel__body stack">
              ${declined ? '<div class="notice notice--error" style="margin:0">Declined. The customer has been told (unless you switched that off).</div>' : `<ol class="stepper stepper--admin">${stages.map((s, i) => `
                <li class="${i < at ? 'done' : i === at ? 'now' : 'todo'}"><span class="stepper__dot">${i < at ? '✓' : i + 1}</span><b>${esc(s.label)}</b></li>`).join('')}</ol>`}

              <form id="stageForm" class="stack" style="gap:14px" novalidate>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  ${r.stage === 'received' ? '<button type="button" class="btn btn--sm" data-set="accepted">Accept</button><button type="button" class="btn btn--danger btn--sm" data-set="declined">Decline</button>' : ''}
                  ${next && r.stage !== 'received' ? `<button type="button" class="btn btn--sm" data-set="${next.key}">Next: ${esc(next.label)}</button>` : ''}
                  ${declined ? '<button type="button" class="btn btn--ghost btn--sm" data-set="accepted">Re-open as accepted</button>' : ''}
                </div>
                <label>Move to
                  <select id="stageSel">${[...stages.map(s => [s.key, s.label]), ['declined', 'Declined']].map(([k, l]) => `<option value="${k}" ${k === preset ? 'selected' : ''}>${l}${k === r.stage ? ' (current)' : ''}</option>`).join('')}</select>
                </label>
                <label>Message to the customer <span class="hint">Optional. Shown on their tracker and in the email.</span>
                  <textarea id="stageNote" maxlength="600" style="min-height:90px" placeholder="${action === 'decline' ? 'A short, kind reason helps (optional)' : 'e.g. Design is ready for you to review…'}"></textarea></label>
                <label class="toggle"><input type="checkbox" id="stageEmail" checked>Email the customer about this</label>
                <div><button type="submit" class="btn" id="stageSave">Update</button></div>
              </form>
            </div></div>

          <div class="panel"><div class="panel__head"><h2>History</h2></div>
            <div class="panel__body"><ul class="timeline">${[...r.history].reverse().map(h => `
              <li><time>${esc(AD.fmtDate(h.at))}</time><b>${esc(stageLabel(r.kind, h.stage))}</b>${h.note ? `<p>${esc(h.note)}</p>` : ''}</li>`).join('')}</ul></div></div>

          <div class="panel"><div class="panel__head"><h2>Tracking link</h2></div>
            <div class="panel__body stack">
              <div class="prefix"><input id="trackLink" readonly value="${esc(trackUrl(r))}"><button type="button" class="btn btn--ghost btn--sm" id="copyTrack">Copy</button></div>
              <span class="hint">This is the private link in the customer's emails. Anyone with it can see the tracker.</span>
              <div><button type="button" class="btn btn--danger btn--sm" id="del">Delete this request</button></div>
            </div></div>
        </div>
      </div>`;

    const sel = $('#stageSel'), noteEl = $('#stageNote');
    const setStage = key => { sel.value = key; updateButton(); noteEl.focus(); };
    const updateButton = () => {
      const changed = sel.value !== r.stage;
      $('#stageSave').textContent = !changed ? 'Save a message' : sel.value === 'declined' ? 'Decline' : sel.value === 'accepted' && r.stage === 'received' ? 'Accept' : `Move to ${stageLabel(r.kind, sel.value)}`;
    };
    sel.addEventListener('change', updateButton);
    $$('[data-set]').forEach(b => b.addEventListener('click', () => setStage(b.dataset.set)));
    updateButton();
    if (action === 'accept' || action === 'decline') { noteEl.focus(); $('#stageForm').scrollIntoView({ block: 'center' }); }

    $('#stageForm').addEventListener('submit', async e => {
      e.preventDefault();
      const stage = sel.value, note = noteEl.value.trim(), email = $('#stageEmail').checked;
      if (stage === r.stage && !note) return AD.toast('Pick a new stage, or write a message to send', true);
      let result;
      const ok = await AD.withWrite(`Enter your admin password to ${stage === 'declined' ? 'decline' : `move ${requestNo(r)} to ${stageLabel(r.kind, stage)}`}${email ? ' and email the customer' : ''}.`,
        async () => { result = await CMS.updateRequest(r.id, { stage, note, email }); });
      if (!ok) return;
      r.stage = stage; r.history = result.history || [...r.history, { stage, at: new Date().toISOString(), note }];
      if ((stage === 'accepted' || stage === 'declined') && !r.decidedAt) r.decidedAt = new Date().toISOString();
      AD.updateOrderBadge();
      if (result.emailError) AD.toast(result.emailError, true);
      else AD.toast(result.emailed ? 'Updated. The customer has been emailed' : 'Updated');
      AD.dirty = false; request(r.id);
      AD.refreshLater();
    });

    $('#saveNotes').addEventListener('click', async () => {
      const notes = $('#notes').value;
      const ok = await AD.withWrite('Enter your admin password to save these notes.', () => CMS.saveRequestNotes(r.id, notes));
      if (ok) { r.adminNotes = notes; AD.toast('Notes saved'); }
    });
    $('#notes').addEventListener('input', () => { AD.dirty = $('#notes').value !== r.adminNotes; });
    $('#copyTrack').addEventListener('click', () => {
      const el = $('#trackLink'); el.select();
      navigator.clipboard?.writeText(el.value).then(() => AD.toast('Tracking link copied'), () => AD.toast('Press Cmd+C to copy', true));
    });
    $('#del').addEventListener('click', async () => {
      if (!confirm(`Delete ${requestNo(r)} (${r.name}) for good? Their tracking link will stop working.`)) return;
      const ok = await AD.withWrite(`Enter your admin password to delete ${requestNo(r)}.`, () => CMS.deleteRequest(r.id));
      if (!ok) return;
      AD.DATA.requests = AD.DATA.requests.filter(x => x.id !== r.id); AD.updateOrderBadge();
      AD.toast('Request deleted'); AD.go('#orders');
    });
  }

  AD.routes.orders = orders;
  AD.routes.request = request;
  AD.navKey.request = 'orders';
})();
