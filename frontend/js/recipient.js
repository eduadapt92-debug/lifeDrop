// LifeDrop Recipient Dashboard JS

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) return window.location.href = 'login.html';
  const user = Auth.getUser();
  if (user?.role !== 'recipient') return window.location.href = 'login.html';

  initSocketNotifications(user._id);

  await Promise.all([
    loadRecipientProfile(),
    loadMyRequests(),
    loadNotifications(),
  ]);

  initBloodRequestForm();
  initSidebarNav();
});

async function loadRecipientProfile() {
  try {
    const profile = await api.recipients.getProfile();
    if (profile.requiredBloodGroup) {
      document.querySelectorAll('[data-blood-group]').forEach(el => el.textContent = profile.requiredBloodGroup);
    }
    document.querySelectorAll('[data-urgency]').forEach(el => el.textContent = profile.urgencyLevel || '—');
    document.querySelectorAll('[data-hospital-name]').forEach(el => el.textContent = profile.hospitalName || '—');
  } catch (err) {
    console.warn('Recipient profile error:', err.message);
  }
}

async function loadMyRequests() {
  try {
    const user = Auth.getUser();
    const requests = await api.bloodRequests.getAll();
    const myRequests = requests.filter(r => r.requestedBy?._id === user._id || r.requestedBy === user._id);
    const container = document.getElementById('myRequests');
    if (!container) return;

    if (!myRequests.length) {
      container.innerHTML = '<p style="color:var(--gray-500);font-size:0.85rem;padding:16px;">No blood requests yet. Create your first request!</p>';
      return;
    }

    const statusBadge = s => {
      const map = { fulfilled:'green', accepted:'blue', matched:'blue', open:'orange', cancelled:'gray' };
      return `<span class="badge badge-${map[s]||'gray'}" style="text-transform:capitalize;">${s}</span>`;
    };

    container.innerHTML = myRequests.map(req => {
      const isActive = !['fulfilled','cancelled'].includes(req.status);
      return `<div class="emergency-card ${req.urgencyLevel}" id="req-card-${req._id}">
        <div class="bg-chip">${req.bloodGroupNeeded}</div>
        <div class="emergency-card-info">
          <div class="emergency-card-title">
            ${req.bloodGroupNeeded} — ${req.quantityNeeded} unit${req.quantityNeeded !== 1 ? 's' : ''}
            &nbsp;<span class="badge badge-${req.urgencyLevel === 'critical' ? 'red' : req.urgencyLevel === 'urgent' ? 'orange' : 'blue'}" style="font-size:0.7rem;text-transform:capitalize;">${req.urgencyLevel}</span>
          </div>
          <div class="emergency-card-meta">${req.reason || 'Medical request'} · ${req.city || '—'}</div>
          <div class="emergency-card-meta">
            Status: ${statusBadge(req.status)} &nbsp;·&nbsp; ${timeAgo(req.createdAt)}
          </div>
          ${req.acceptedDonor ? `<div class="emergency-card-meta" style="color:var(--green);font-weight:600;">Donor confirmed: ${req.acceptedDonor.name || 'Assigned'}</div>` : ''}
          ${req.matchedDonors?.length ? `<div class="emergency-card-meta">${req.matchedDonors.length} donor${req.matchedDonors.length !== 1 ? 's' : ''} matched</div>` : ''}
          ${isActive ? `<div class="emergency-card-actions">
            <button class="btn btn-green btn-sm" onclick="fulfillMyRequest('${req._id}', this)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>
              Mark as Resolved
            </button>
            <button class="btn btn-outline btn-sm" onclick="cancelRequest('${req._id}', this)">Cancel</button>
          </div>` : `<div class="emergency-card-meta" style="color:var(--gray-400);font-style:italic;margin-top:6px;">
            ${req.status === 'fulfilled' ? 'Resolved — removed from live ticker' : 'Cancelled'}
          </div>`}
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    console.warn('My requests error:', err.message);
  }
}

function initBloodRequestForm() {
  const form = document.getElementById('bloodRequestForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await api.recipients.requestBlood(data);
      showToast('Request Submitted', 'Matching donors are being notified', 'success');
      closeModal('requestModal');
      form.reset();
      loadMyRequests();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
    btn.disabled = false;
    btn.textContent = 'Submit Request';
  });
}

async function fulfillMyRequest(id, btn) {
  if (!confirm('Mark this request as resolved? This means you have received the blood you needed. It will be removed from the live ticker.')) return;
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    await api.bloodRequests.fulfill(id);
    showToast('Resolved', 'Your request has been marked as fulfilled and removed from the live ticker', 'success');
    loadMyRequests();
  } catch (err) {
    showToast('Error', err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Mark as Resolved';
  }
}

async function cancelRequest(id, btn) {
  if (!confirm('Cancel this blood request? It will be removed from the live ticker.')) return;
  btn.disabled = true;
  try {
    await api.bloodRequests.update(id, { status: 'cancelled' });
    showToast('Cancelled', 'Request cancelled and removed from the ticker', 'info');
    loadMyRequests();
  } catch (err) {
    showToast('Error', err.message, 'error');
    btn.disabled = false;
  }
}

function initSidebarNav() {
  const links = document.querySelectorAll('.sidebar-link[data-page]');
  const pages = document.querySelectorAll('.dash-page');
  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const page = link.dataset.page;
      pages.forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
      if (page === 'requests') loadMyRequests();
      if (page === 'notifications') loadNotifications();
    });
  });
}

window.cancelRequest     = cancelRequest;
window.fulfillMyRequest  = fulfillMyRequest;
