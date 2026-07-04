// LifeDrop Auth JS

document.addEventListener('DOMContentLoaded', () => {
  // ===== LOGIN PAGE =====
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    // Redirect if already logged in
    if (Auth.isLoggedIn()) redirectByRole(Auth.getUser()?.role);

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type=submit]');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) return showToast('Error', 'Please fill in all fields', 'error');

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;margin-right:8px;"></span>Signing in...';

      try {
        const data = await api.auth.login({ email, password });
        Auth.setSession(data.token, data.user);

        if (document.getElementById('rememberMe')?.checked) {
          localStorage.setItem('lifedrop_remember', email);
        }

        showToast('Welcome back!', `Hello, ${data.user.name}`, 'success');
        setTimeout(() => redirectByRole(data.user.role), 600);
      } catch (err) {
        showToast('Login failed', err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
      }
    });

    // Remember me
    const remembered = localStorage.getItem('lifedrop_remember');
    if (remembered) {
      document.getElementById('email').value = remembered;
      const rememberCheckbox = document.getElementById('rememberMe');
      if (rememberCheckbox) rememberCheckbox.checked = true;
    }
  }

  // ===== REGISTER PAGE =====
  const registerPage = document.getElementById('registerPage');
  if (registerPage) {
    initRegisterFlow();
  }

  // ===== FORGOT PASSWORD =====
  const forgotForm = document.getElementById('forgotForm');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      try {
        await api.auth.forgotPassword(email);
        showToast('Email sent!', 'Check your inbox for reset instructions', 'success');
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    });
  }
});

function redirectByRole(role) {
  const routes = {
    donor: 'donor-dashboard.html',
    hospital: 'hospital-dashboard.html',
    recipient: 'recipient-dashboard.html',
    bloodbank: 'hospital-dashboard.html',
    admin: 'admin-dashboard.html',
  };
  window.location.href = routes[role] || 'index.html';
}

function initRegisterFlow() {
  let currentStep = 1;
  let selectedRole = null;

  // Step 1: Role selection
  const roleCards = document.querySelectorAll('.role-card');
  roleCards.forEach(card => {
    card.addEventListener('click', () => {
      roleCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedRole = card.dataset.role;
    });
  });

  const step1Next = document.getElementById('step1Next');
  if (step1Next) {
    step1Next.addEventListener('click', () => {
      if (!selectedRole) return showToast('Select a role', 'Please choose how you want to join', 'warning');
      showStep(2);
      showFormForRole(selectedRole);
    });
  }

  // Step back buttons
  document.querySelectorAll('.step-back').forEach(btn => {
    btn.addEventListener('click', () => showStep(1));
  });

  // Register form submit
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type=submit]');

      if (!document.getElementById('acceptTerms')?.checked) {
        return showToast('Terms required', 'Please accept the terms and conditions', 'warning');
      }

      const activeForm = document.getElementById(`form-${selectedRole}`);
      const data = {};
      activeForm.querySelectorAll('input, select, textarea').forEach((el) => {
        if (!el.name || el.type === 'file') return;
        data[el.name] = el.value;
      });
      data.role = selectedRole;

      // Validate passwords match
      if (data.password !== data.confirmPassword) {
        return showToast('Password mismatch', 'Passwords do not match', 'error');
      }
      delete data.confirmPassword;
      delete data.acceptTerms;

      btn.disabled = true;
      btn.textContent = 'Creating account...';

      try {
        const res = await api.auth.register(data);
        Auth.setSession(res.token, res.user);
        showToast('Account created!', `Welcome to LifeDrop, ${res.user.name}!`, 'success');
        setTimeout(() => redirectByRole(res.user.role), 800);
      } catch (err) {
        showToast('Registration failed', err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Create Account →';
      }
    });
  }

  // File upload zones
  document.querySelectorAll('.upload-zone').forEach(zone => {
    zone.addEventListener('click', () => zone.querySelector('input[type=file]')?.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--red)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file) {
        const input = zone.querySelector('input[type=file]');
        if (input) {
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
        }
        zone.querySelector('.upload-label').textContent = file.name;
      }
    });
    const input = zone.querySelector('input[type=file]');
    input?.addEventListener('change', () => {
      if (input.files[0]) zone.querySelector('.upload-label').textContent = input.files[0].name;
    });
  });
}

function showStep(n) {
  document.querySelectorAll('.register-step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById(`step${n}`);
  if (step) step.classList.add('active');
}

function showFormForRole(role) {
  document.querySelectorAll('.role-form').forEach(f => f.style.display = 'none');
  const form = document.getElementById(`form-${role}`);
  if (form) form.style.display = 'block';

  const heading = document.getElementById('formHeading');
  const roleNames = { donor: 'Register as Donor', recipient: 'Register as Recipient', hospital: 'Register as Hospital', bloodbank: 'Register as Blood Bank' };
  if (heading) heading.textContent = roleNames[role] || 'Create Account';
}

window.redirectByRole = redirectByRole;
