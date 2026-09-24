/* Seventh Boar admin: overview, comments, subscribers, and security & activity. */
(function () {
  const { $, $$, esc, view } = AD;

  /* =====================================================================
     OVERVIEW
     ===================================================================== */
  async function overview() {
    AD.setTitle('Overview');
    const { posts, projects, comments } = AD.DATA;
    const future = x => new Date(x.date) > new Date();
    const liveP = posts.filter(x => x.status === 'published' && !future(x)).length;
    const liveJ = projects.filter(x => x.status === 'published' && !future(x)).length;
    const drafts = [...posts, ...projects].filter(x => x.status !== 'published').length;
    const scheduled = [...posts, ...projects].filter(x => x.status === 'published' && future(x)).length;
    const pending = comments.filter(c => !c.approved).length;
    view.innerHTML = `
      ${CMS.mode === 'demo' ? `<div class="notice notice--demo"><b>Demo mode.</b> Changes are saved in this browser only, with sample content. Add <code>?demo=0</code> to any address to leave demo mode.</div>` : ''}
      <div class="stats">
        <a class="stat" href="#projects"><small>Live projects</small><b>${liveJ}</b></a>
        <a class="stat" href="#devlog"><small>Live entries</small><b>${liveP}</b></a>
        <a class="stat ${drafts ? 'stat--warn' : ''}" href="#devlog"><small>Drafts</small><b>${drafts}</b></a>
        <a class="stat" href="#devlog"><small>Scheduled</small><b>${scheduled}</b></a>
        <a class="stat ${pending ? 'stat--warn' : ''}" href="#comments"><small>Comments waiting</small><b>${pending}</b></a>
        <a class="stat" href="#subscribers"><small>Subscribers</small><b id="subCount">…</b></a>
      </div>
      <div class="grid-2">
        <div class="stack">
          <div class="panel"><div class="panel__head"><h2>Quick actions</h2></div><div class="panel__body quick">
            <a href="#post/new"><b>+ New entry</b><small>Write a devlog entry with photos and a live preview</small></a>
            <a href="#project/new"><b>+ New project</b><small>Add work to the portfolio, with a client card</small></a>
            <a href="#settings"><b>Edit homepage</b><small>Hero, sections and the footer</small></a>
          </div></div>
          <div class="panel"><div class="panel__head"><h2>Needs attention</h2></div><div class="panel__body">${attention(pending, scheduled)}</div></div>
        </div>
        <div class="panel"><div class="panel__head"><h2>Recent activity</h2><a class="link" href="#security">All activity</a></div>
          <div class="panel__body"><ul class="activity" id="activity"><li class="muted">Loading…</li></ul></div></div>
      </div>`;
    CMS.loadSubscribers().then(l => { const el = $('#subCount'); if (el) el.textContent = l.length; }, () => { const el = $('#subCount'); if (el) el.textContent = '—'; });
    try {
      const log = (await CMS.auditLog()).slice(0, 10);
      $('#activity').innerHTML = log.length ? log.map(AD.activityItem).join('') : '<li class="muted">No changes yet.</li>';
    } catch { const el = $('#activity'); if (el) el.innerHTML = '<li class="muted">Activity is unavailable.</li>'; }
  }

  function attention(pending, scheduled) {
    const items = [];
    if (AD.ADMIN?.comingSoon) items.push('The site is <a href="#settings">closed to the public</a> (coming soon page is on)');
    if (pending) items.push(`<a href="#comments">${pending} comment${pending === 1 ? '' : 's'}</a> waiting for approval`);
    AD.DATA.posts.filter(x => x.status !== 'published').forEach(x => items.push(`<a href="#post/${esc(x.id)}">${esc(x.title)}</a> is still a draft`));
    AD.DATA.projects.filter(x => x.status !== 'published').forEach(x => items.push(`<a href="#project/${esc(x.id)}">${esc(x.title)}</a> is still a draft`));
    if (scheduled) items.push(`${scheduled} item${scheduled === 1 ? ' is' : 's are'} scheduled to go live later`);
    AD.DATA.projects.filter(x => x.status === 'published' && !x.categories.length).forEach(x => items.push(`<a href="#project/${esc(x.id)}">${esc(x.title)}</a> has no type`));
    return items.length ? `<ul class="checklist">${items.slice(0, 8).map(i => `<li class="todo">${i}</li>`).join('')}</ul>` : '<p class="muted" style="margin:0">All good. Nothing needs attention.</p>';
  }

  /* =====================================================================
     COMMENTS
     Visitors' comments wait here as "waiting" and only show on the site once approved.
     ===================================================================== */
  let cmFilter = null;
  function comments() {
    AD.setTitle('Comments');
    const C = AD.DATA.comments;
    const waiting = () => C.filter(c => !c.approved).length;
    if (cmFilter === null) cmFilter = waiting() ? 'waiting' : 'approved';
    const count = k => (k === 'waiting' ? C.filter(c => !c.approved) : k === 'approved' ? C.filter(c => c.approved) : C).length;
    view.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <div class="seg" id="cmTabs" role="tablist">
            ${[['waiting', 'Waiting'], ['approved', 'On the site'], ['all', 'All']].map(([k, l]) => `<button type="button" role="tab" data-f="${k}" class="${cmFilter === k ? 'on' : ''}">${l} <small>${count(k)}</small></button>`).join('')}
          </div>
        </div>
        <div class="cm" id="cmList"></div>
      </div>`;
    const titleOf = slug => AD.DATA.posts.find(p => p.id === slug)?.title;
    const list = C.filter(c => cmFilter === 'all' || (cmFilter === 'waiting' ? !c.approved : c.approved));
    $('#cmList').innerHTML = list.map(c => `
      <article class="cm__item" data-id="${esc(c.id)}">
        <div class="cm__head">
          ${c.approved ? '<span class="pill pill--live">On the site</span>' : '<span class="pill pill--draft">Waiting</span>'}
          ${c.likes ? `<span class="pill pill--off">👍 ${c.likes}</span>` : ''}
          <span style="flex:1"></span><time>${AD.fmtDate(c.date)}</time>
        </div>
        <p class="cm__body">${esc(c.body)}</p>
        <div class="cm__foot">
          <span><b>${esc(c.author)}</b> on ${titleOf(c.postSlug) ? `<a class="link" href="#post/${esc(c.postSlug)}">${esc(titleOf(c.postSlug))}</a>` : esc(c.postSlug)}</span>
          <span style="flex:1"></span>
          ${c.approved ? '' : '<button type="button" class="btn btn--sm" data-act="approve">Approve</button>'}
          <button type="button" class="btn btn--danger btn--sm" data-act="delete">Delete</button>
        </div>
      </article>`).join('') || `<div class="empty">${C.length ? 'Nothing here.' : 'No comments yet. They appear here when visitors leave them on a devlog entry.'}</div>`;
    $('#cmTabs').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { cmFilter = b.dataset.f; comments(); } });
    $('#cmList').addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const c = C.find(x => String(x.id) === b.closest('[data-id]').dataset.id); if (!c) return;
      const act = b.dataset.act;
      if (act === 'delete' && !confirm(`Delete ${c.author}'s comment? This can't be undone.`)) return;
      const ok = await AD.withWrite(act === 'approve' ? 'Enter your admin password to approve this comment and put it on the site.' : 'Enter your admin password to delete this comment.',
        () => (act === 'approve' ? CMS.approveComment(c.id) : CMS.deleteComment(c.id)));
      if (!ok) return;
      if (act === 'approve') c.approved = true; else AD.DATA.comments = C.filter(x => x !== c);
      AD.toast(act === 'approve' ? "Approved. It's on the site now" : 'Comment deleted');
      const pending = AD.DATA.comments.filter(x => !x.approved).length;
      $('#cmCount').textContent = pending; $('#cmCount').hidden = !pending;
      comments();
      AD.refreshLater();
    });
  }

  /* =====================================================================
     SUBSCRIBERS
     ===================================================================== */
  async function subscribers() {
    AD.setTitle('Subscribers');
    view.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input id="q" type="search" placeholder="Search emails" maxlength="80" aria-label="Search emails">
          <span style="flex:1"></span>
          <span class="hint" id="subTotal"></span>
          <button type="button" class="btn btn--ghost btn--sm" id="export">Download CSV</button>
        </div>
        <div class="panel__body"><div class="launch__list" id="subList" style="max-height:none"><p class="muted">Loading…</p></div></div>
      </div>
      <p class="hint" style="margin-top:14px">People who sign up on the homepage or the coming soon page land here. Copy the list into your newsletter tool, or point it at the devlog feed: <code>${esc(location.origin)}/devlog/feed.xml</code></p>`;
    let subs;
    try { subs = await CMS.loadSubscribers(); }
    catch (err) { $('#subList').innerHTML = `<p class="muted">${esc(err.message)}</p>`; return; }
    const draw = () => {
      const q = $('#q').value.toLowerCase();
      const list = subs.filter(x => !q || x.email.toLowerCase().includes(q));
      $('#subTotal').textContent = `${subs.length} ${subs.length === 1 ? 'subscriber' : 'subscribers'}`;
      $('#subList').innerHTML = list.map(x => `<div class="launch__row"><span>${esc(x.email)}</span><small>${AD.fmtDay(x.at)}</small><button type="button" data-drop="${esc(x.email)}" aria-label="Remove ${esc(x.email)}">✕</button></div>`).join('')
        || `<p class="muted">${subs.length ? 'No match.' : 'Nobody has signed up yet.'}</p>`;
    };
    $('#q').addEventListener('input', draw);
    $('#subList').addEventListener('click', async e => {
      const b = e.target.closest('[data-drop]'); if (!b) return;
      const email = b.dataset.drop;
      if (!confirm(`Remove ${email} from the list?`)) return;
      const ok = await AD.withWrite(`Enter your admin password to remove ${email}.`, () => CMS.removeSubscriber(email));
      if (!ok) return;
      subs = subs.filter(x => x.email !== email); draw(); AD.toast('Removed');
    });
    $('#export').addEventListener('click', () => {
      const csv = 'email,signed_up\n' + subs.map(x => `"${x.email.replace(/"/g, '""')}",${new Date(x.at).toISOString()}`).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `seventh-boar-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    draw();
  }

  /* =====================================================================
     SECURITY & ACTIVITY
     ===================================================================== */
  async function security() {
    AD.setTitle('Security & activity');
    const demo = CMS.mode === 'demo';
    view.innerHTML = `
      <div class="grid-2" style="margin-bottom:18px">
        <div class="panel"><div class="panel__head"><h2>Your account</h2></div><div class="panel__body stack">
          <div><span class="hint">Signed in as</span><div style="color:var(--bone)">${esc(AD.ADMIN.email)}</div></div>
          <div><span class="hint">Name in the activity log</span><div style="color:var(--bone)">${AD.ADMIN.nickname ? esc(AD.ADMIN.nickname) : '<span class="muted">Your email. Click your name at the bottom of the menu to change it.</span>'}</div></div>
          <div><span class="hint">Two-factor authentication</span><div>${demo ? '<span class="pill pill--off">Available once connected to Supabase</span>' : AD.ADMIN.mfa ? '<span class="pill pill--live">On // authenticator app</span>' : '<span class="pill pill--red">Off</span>'}</div></div>
          <div><button class="btn btn--ghost" id="signOutAll">Sign out on every device</button><p class="hint" style="margin:8px 0 0">Use this if you logged in on a shared computer or think someone else has your password. Then change your password.</p></div>
        </div></div>
        <div class="panel"><div class="panel__head"><h2>What's protecting the site</h2></div><div class="panel__body">
          <ul class="checklist">
            <li>Every change needs your password, checked by the database, not just this screen</li>
            <li>Wrong passwords lock changes for 15 minutes after ${demo ? 5 : 'a few'} attempts</li>
            <li>Only accounts on the admin list can change anything, even if someone signs up</li>
            <li class="${demo ? 'todo' : ''}">Authenticator code required at every login</li>
            <li>Every change is written to a log that can't be edited or deleted</li>
            <li>Photos are re-processed on upload (strips hidden data), images only, 8MB max</li>
            <li>Drafts and scheduled items are hidden by the database, not just on the page</li>
            <li>Signed out automatically after ${AD.cfg.adminIdleMinutes} minutes of inactivity, and when the browser closes</li>
            <li>Comments and sign-ups can be added by visitors but never read, edited or approved by them</li>
          </ul>
        </div></div>
      </div>
      <div class="panel"><div class="panel__head"><h2>Activity log</h2><span class="hint">Last 100 changes</span></div>
        <div class="table-wrap"><table><thead><tr><th>When</th><th>Who</th><th>What</th><th>Item</th></tr></thead><tbody id="log"><tr><td colspan="4" class="muted">Loading…</td></tr></tbody></table></div></div>
      ${demo ? `<div class="panel" style="margin-top:18px"><div class="panel__head"><h2>Demo data</h2><button class="btn btn--danger btn--sm" id="resetDemo">Reset demo data</button></div><div class="panel__body hint">Puts every entry, project and setting back to the starting demo content in this browser.</div></div>` : ''}`;

    $('#signOutAll').addEventListener('click', async () => {
      if (!confirm('Sign out of the admin on every device, including this one?')) return;
      await CMS.logout(true);
      location.replace('/admin/login/');
    });
    $('#resetDemo')?.addEventListener('click', async () => {
      if (!confirm('Reset all demo data in this browser?')) return;
      const ok = await AD.withWrite('Enter your admin password to reset the demo data.', async () => CMS.resetDemo());
      if (ok) { await AD.reload(); AD.toast('Demo data reset'); security(); }
    });
    try {
      const log = await CMS.auditLog();
      $('#log').innerHTML = log.map(a => `<tr style="cursor:default"><td>${AD.fmtDate(a.at)}</td><td>${esc(AD.who(a))}</td><td>${AD.activityText(a)}</td><td>${esc(a.summary || '')}</td></tr>`).join('')
        || '<tr><td colspan="4"><div class="empty">No changes yet.</div></td></tr>';
    } catch { $('#log').innerHTML = '<tr><td colspan="4" class="muted">Activity is unavailable.</td></tr>'; }
  }

  AD.routes.overview = overview;
  AD.routes.comments = comments;
  AD.routes.subscribers = subscribers;
  AD.routes.security = security;
})();
