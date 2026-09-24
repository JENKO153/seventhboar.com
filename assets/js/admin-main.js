/* Seventh Boar admin: boots the dashboard once every view has registered itself. */
(async function () {
  const { $ } = AD;

  let admin = null;
  try { admin = await CMS.getAdmin(); } catch (e) { console.error(e); }
  if (!admin || admin.needs) { location.replace('/admin/login/'); return; }
  document.body.hidden = false;
  AD.ADMIN = admin;
  AD.showWhoAmI(admin);
  $('#demoChip').hidden = CMS.mode !== 'demo';
  AD.NAMES = await CMS.adminNames?.().catch(() => ({})) || {};
  AD.comingSoonBanner();

  /* ---------- your account (the name shown in the activity log) ---------- */
  $('#profileBtn').addEventListener('click', () => {
    $('#profileEmail').textContent = AD.ADMIN.email;
    $('#nickname').value = AD.ADMIN.nickname || '';
    $('#profileError').hidden = true;
    $('#profileModal').hidden = false;
    $('#nickname').focus();
  });
  $('#profileCancel').addEventListener('click', () => { $('#profileModal').hidden = true; });
  $('#profileModal').addEventListener('click', e => { if (e.target === $('#profileModal')) $('#profileModal').hidden = true; });
  $('#profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const wanted = $('#nickname').value.trim().slice(0, 40);
    if (wanted === (AD.ADMIN.nickname || '')) { $('#profileModal').hidden = true; return; }
    $('#profileModal').hidden = true;
    const ok = await AD.withWrite('Enter your admin password to change the name on your account.', async () => {
      AD.ADMIN.nickname = await CMS.setNickname(wanted);
    });
    if (!ok) return;
    AD.showWhoAmI(AD.ADMIN);
    AD.NAMES = await CMS.adminNames().catch(() => AD.NAMES);
    AD.toast(AD.ADMIN.nickname ? `You'll show up as ${AD.ADMIN.nickname}` : 'Back to showing your email');
    AD.route();
  });

  $('#logout').addEventListener('click', async () => {
    if (AD.dirty && !confirm('You have unsaved changes. Log out anyway?')) return;
    await CMS.logout();
    location.replace('/admin/login/');
  });
  $('#menuToggle').addEventListener('click', () => $('#side').classList.toggle('open'));
  window.addEventListener('beforeunload', e => { if (AD.dirty) { e.preventDefault(); e.returnValue = ''; } });

  await AD.reload();
  window.addEventListener('hashchange', AD.onHash);
  AD.route();
  AD.startIdleTimer();
})();
