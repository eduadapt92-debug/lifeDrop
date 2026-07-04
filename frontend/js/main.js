// LifeDrop Main Utilities

// ===== TOAST =====
function showToast(title, message, type = 'error') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = {
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  };
  const bellIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
  toast.innerHTML = `
    <span style="flex-shrink:0;display:flex;align-items:center;">${icons[type] || bellIcon}</span>
    <div>
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  document.body.appendChild(div);
  return div;
}

// ===== MODAL =====
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}
document.addEventListener('click', (e) => {
  if (e.target.closest('.dark-toggle, #darkModeToggle')) {
    setDarkMode(!document.body.classList.contains('dark'));
    return;
  }
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
  if (e.target.classList.contains('modal-close')) {
    e.target.closest('.modal-overlay')?.classList.remove('open');
  }
});

// ===== PROGRESS RING =====
function drawProgressRing(svgId, pct, color = '#C41E3A') {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const r = 48, cx = 60, cy = 60;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F0F0F0" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="10"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
      stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"
      style="transition:stroke-dashoffset 1s ease"/>
  `;
}

// ===== PROGRESS BARS =====
function animateProgressBars() {
  document.querySelectorAll('.progress-bar-fill[data-width]').forEach(bar => {
    const w = bar.dataset.width;
    setTimeout(() => { bar.style.width = w + '%'; }, 100);
  });
}

// ===== AUTH HELPERS =====
const Auth = {
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('lifedrop_user')); } catch { return null; }
  },
  getToken: () => localStorage.getItem('lifedrop_token'),
  setSession: (token, user) => {
    localStorage.setItem('lifedrop_token', token);
    localStorage.setItem('lifedrop_user', JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem('lifedrop_token');
    localStorage.removeItem('lifedrop_user');
  },
  isLoggedIn: () => !!localStorage.getItem('lifedrop_token'),
  requireAuth: (redirectTo = '/login.html') => {
    if (!Auth.isLoggedIn()) window.location.href = redirectTo;
  },
  requireRole: (role, redirectTo = '/login.html') => {
    const user = Auth.getUser();
    if (!user || user.role !== role) window.location.href = redirectTo;
  },
  logout: () => {
    Auth.clearSession();
    window.location.href = '/login.html';
  },
};

// ===== DARK MODE =====
const MOON_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

function setDarkMode(dark) {
  document.body.classList.toggle('dark', dark);
  document.documentElement.style.background = '';
  localStorage.setItem('lifedrop_dark', dark);
  document.querySelectorAll('.dark-toggle, #darkModeToggle').forEach(btn => {
    btn.innerHTML = dark ? SUN_SVG : MOON_SVG;
    btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  });
}

function initDarkMode() {
  const isDark = localStorage.getItem('lifedrop_dark') === 'true';
  if (isDark) document.body.classList.add('dark');
  document.documentElement.style.background = '';
  document.querySelectorAll('.dark-toggle, #darkModeToggle').forEach(btn => {
    btn.innerHTML = isDark ? SUN_SVG : MOON_SVG;
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  });
}

// ===== SIDEBAR TOGGLE (mobile) =====
function initSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

// ===== MOBILE MENU =====
function initMobileMenu() {
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('mobileMenu');
  const close = document.getElementById('mobileMenuClose');
  if (!toggle) return;
  toggle.addEventListener('click', () => menu?.classList.add('open'));
  close?.addEventListener('click', () => menu?.classList.remove('open'));
}

// ===== POPULATE USER UI =====
function populateUserUI() {
  const user = Auth.getUser();
  if (!user) return;
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user.name);
  document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = user.email);
  document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = user.role);
  document.querySelectorAll('[data-user-avatar]').forEach(el => {
    el.textContent = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  });
}

// ===== BLOOD GROUP COLOR =====
function getBloodGroupColor(bg) {
  const colors = { 'O-': '#C41E3A', 'O+': '#E8354E', 'A+': '#1D4ED8', 'A-': '#3B82F6', 'B+': '#16A34A', 'B-': '#22C55E', 'AB+': '#7C3AED', 'AB-': '#A855F7' };
  return colors[bg] || '#666';
}

// ===== FORMAT DATE =====
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ===== RELATIVE TIME =====
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ===== DONORS COMPATIBILITY =====
const DONOR_COMPAT = {
  'O-': { gives: ['O-','O+','A-','A+','B-','B+','AB-','AB+'], receives: ['O-'] },
  'O+': { gives: ['O+','A+','B+','AB+'], receives: ['O-','O+'] },
  'A-': { gives: ['A-','A+','AB-','AB+'], receives: ['O-','A-'] },
  'A+': { gives: ['A+','AB+'], receives: ['O-','O+','A-','A+'] },
  'B-': { gives: ['B-','B+','AB-','AB+'], receives: ['O-','B-'] },
  'B+': { gives: ['B+','AB+'], receives: ['O-','O+','B-','B+'] },
  'AB-': { gives: ['AB-','AB+'], receives: ['O-','A-','B-','AB-'] },
  'AB+': { gives: ['AB+'], receives: ['O-','O+','A-','A+','B-','B+','AB-','AB+'] },
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initSidebarToggle();
  initMobileMenu();
  populateUserUI();
  animateProgressBars();

  // Logout buttons
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', Auth.logout);
  });
});

window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.drawProgressRing = drawProgressRing;
window.Auth = Auth;
window.formatDate = formatDate;
window.timeAgo = timeAgo;
window.DONOR_COMPAT = DONOR_COMPAT;
window.getBloodGroupColor = getBloodGroupColor;
