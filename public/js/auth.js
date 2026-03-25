// ── SOCS Auth Page ──

const loginForm = document.getElementById('login-form');
const alertBox  = document.getElementById('alert-box');
const loginBtn  = document.getElementById('login-btn');
const btnText   = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');

function showAlert(msg, type='error') {
  alertBox.textContent = msg;
  alertBox.className   = `alert-box alert-${type}`;
  alertBox.classList.remove('hidden');
}
function setLoading(state) {
  loginBtn.disabled = state;
  btnText.classList.toggle('hidden', state);
  btnLoader.classList.toggle('hidden', !state);
}

// Toggle password visibility
document.getElementById('toggle-pw').addEventListener('click', () => {
  const pw = document.getElementById('password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
});

// Demo quick-login buttons
document.querySelectorAll('.demo-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('staff-id').value = btn.dataset.id;
    document.getElementById('password').value = btn.dataset.pw;
    loginForm.dispatchEvent(new Event('submit'));
  });
});

// Login form submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const staffId  = document.getElementById('staff-id').value.trim().toUpperCase();
  const password = document.getElementById('password').value;

  if (!staffId || !password) {
    showAlert('Please enter your Staff ID and password.');
    return;
  }

  setLoading(true);
  alertBox.classList.add('hidden');

  try {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ staffId, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      // Show the actual server error — no silent fallback
      throw new Error(data.message || data.error || 'Login failed');
    }

    // Save real token + full user object (contains UUID id, not staffId)
    localStorage.setItem('socs_token', data.token);
    localStorage.setItem('socs_user',  JSON.stringify(data.user));

    window.location.href = '/dashboard.html';

  } catch (err) {
    showAlert(err.message || 'Could not connect to server. Is it running?');
  } finally {
    setLoading(false);
  }
});
