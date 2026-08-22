/* Admin login gate, backed by real Supabase Auth. */
(function () {
  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('formError');

  (async function redirectIfLoggedIn() {
    const session = await CmsAuth.getSession();
    if (session) window.location.href = '/admin/dashboard/';
  })();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.remove('show');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing In...';

    try {
      await CmsAuth.login(email, password);
      window.location.href = '/admin/dashboard/';
    } catch (err) {
      errorBox.textContent = err.message && err.message.includes('not configured')
        ? 'Studio login is not connected to Supabase yet.'
        : 'Incorrect email or password. Try again.';
      errorBox.classList.add('show');
      document.getElementById('password').value = '';
      document.getElementById('password').focus();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  });
})();
