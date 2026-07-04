// LifeDrop Donor Dashboard JS

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) return window.location.href = 'login.html';
  const user = Auth.getUser();
  if (user?.role !== 'donor') return window.location.href = 'login.html';

  initSocketNotifications(user._id);

  await Promise.all([
    loadDonorProfile(),
    loadDonorStats(),
    loadEmergencyRequests(),
    loadDonationHistory(),
    loadNotifications(),
    loadAppointments(),
  ]);

  initSidebarNav();
  initBookAppointment();
});

async function loadDonorProfile() {
  try {
    const profile = await api.donors.getProfile();
    const user = Auth.getUser();

    // Welcome card
    document.querySelectorAll('[data-donor-name]').forEach(el => el.textContent = user.name.split(' ')[0]);

    // Blood group compat
    if (profile.bloodGroup) {
      renderCompatibility(profile.bloodGroup);
      document.querySelectorAll('[data-blood-group]').forEach(el => {
        el.textContent = profile.bloodGroup;
      });
    }

    // Eligibility ring
    const eligible = profile.eligibilityStatus;
    const lastDon = profile.lastDonationDate ? new Date(profile.lastDonationDate) : null;
    let eligPct = 100;
    if (lastDon) {
      const daysSince = Math.floor((Date.now() - lastDon) / 86400000);
      eligPct = Math.min(100, Math.floor((daysSince / 56) * 100));
    }
    drawProgressRing('eligibilityRing', eligPct);
    const pctEl = document.getElementById('eligibilityPct');
    if (pctEl) pctEl.textContent = eligPct + '%';

    const eligMsg = document.getElementById('eligibilityMsg');
    if (eligMsg) {
      if (eligPct >= 100) {
        eligMsg.textContent = 'You are eligible to donate!';
        eligMsg.style.color = 'var(--green)';
      } else {
        const daysLeft = 56 - Math.floor((Date.now() - lastDon) / 86400000);
        eligMsg.textContent = `${daysLeft} days until next eligible donation`;
        eligMsg.style.color = 'var(--orange)';
      }
    }

    // Tier badge
    const tierEl = document.getElementById('donorTier');
    if (tierEl && profile.donorTier) {
      tierEl.textContent = profile.donorTier.charAt(0).toUpperCase() + profile.donorTier.slice(1) + ' Level';
      tierEl.className = `tier-badge tier-${profile.donorTier}`;
    }

    // Stats
    document.getElementById('totalDonations')?.innerHTML && null;
    updateStatEl('totalDonations', profile.donationCount || 0);
    updateStatEl('livesSaved', (profile.donationCount || 0) * 3);

  } catch (err) {
    showToast('Error', 'Could not load profile: ' + err.message, 'error');
  }
}

async function loadDonorStats() {
  // Stats are loaded as part of loadDonorProfile; nothing to do here separately
}

async function loadEmergencyRequests() {
  try {
    const requests = await api.bloodRequests.getAll('?status=open&urgencyLevel=critical');
    const container = document.getElementById('emergencyRequests');
    if (!container) return;

    if (!requests.length) {
      container.innerHTML = '<p style="color:var(--gray-500);font-size:0.85rem;padding:12px;">No active emergency requests nearby</p>';
      return;
    }

    container.innerHTML = requests.slice(0, 3).map(req => `
      <div class="emergency-card ${req.urgencyLevel}">
        <div class="bg-chip">${req.bloodGroupNeeded}</div>
        <div class="emergency-card-info">
          <div class="emergency-card-title">
            ${req.urgencyLevel === "critical" ? "●" : "○"} ${req.bloodGroupNeeded} – ${req.urgencyLevel.charAt(0).toUpperCase() + req.urgencyLevel.slice(1)}
            <span class="badge badge-${req.urgencyLevel === 'critical' ? 'red' : 'blue'}" style="margin-left:8px">${req.urgencyLevel}</span>
          </div>
          <div class="emergency-card-meta">
            ${req.hospital?.hospitalName || 'Hospital'} · ${req.city || '—'} · ${req.quantityNeeded} units needed
          </div>
          <div class="emergency-card-meta" style="margin-top:2px;"> ${req.area || ''} · ${timeAgo(req.createdAt)}</div>
          <div class="emergency-card-actions">
            <button class="btn btn-primary btn-sm" onclick="acceptRequest('${req._id}', this)">Accept Request</button>
            <button class="btn btn-ghost btn-sm" onclick="viewRequest('${req._id}')">View Details</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.warn('Emergency requests error:', err.message);
  }
}

async function loadDonationHistory() {
  try {
    const records = await api.donors.getHistory();

    const emptyRow = '<tr><td colspan="5" style="text-align:center;color:var(--gray-500);padding:20px;">No donation history yet</td></tr>';

    const rows = records.length
      ? records.map(r => `
          <tr>
            <td>${formatDate(r.donationDate)}</td>
            <td>${r.hospital?.hospitalName || '—'}</td>
            <td><span class="badge badge-blue">${(r.donationType || 'whole_blood').replace(/_/g, ' ')}</span></td>
            <td><span class="badge badge-${r.status === 'completed' ? 'green' : 'gray'}">${r.status}</span></td>
            <td>
              ${r.certificateUrl
                ? `<a href="${r.certificateUrl}" class="btn btn-ghost btn-sm" target="_blank">Download</a>`
                : '<span style="color:var(--gray-400);font-size:0.8rem;">—</span>'
              }
            </td>
          </tr>
        `).join('')
      : emptyRow;

    // History page table
    const tbody = document.getElementById('historyTableBody');
    if (tbody) tbody.innerHTML = rows;

    // Overview inline table (shows latest 3)
    const overviewTbody = document.getElementById('overviewHistoryBody');
    if (overviewTbody) {
      overviewTbody.innerHTML = records.length
        ? records.slice(0, 3).map(r => `
            <tr>
              <td>${formatDate(r.donationDate)}</td>
              <td>${r.hospital?.hospitalName || '—'}</td>
              <td><span class="badge badge-blue">${(r.donationType || 'whole_blood').replace(/_/g, ' ')}</span></td>
              <td><span class="badge badge-${r.status === 'completed' ? 'green' : 'gray'}">${r.status}</span></td>
              <td>
                ${r.certificateUrl
                  ? `<a href="${r.certificateUrl}" class="btn btn-ghost btn-sm" target="_blank">Download</a>`
                  : '<span style="color:var(--gray-400);font-size:0.8rem;">—</span>'
                }
              </td>
            </tr>
          `).join('')
        : emptyRow;
    }
  } catch (err) {
    console.warn('History error:', err.message);
  }
}

async function loadAppointments() {
  try {
    const appointments = await api.appointments.getAll();
    const container = document.getElementById('appointmentsList');
    if (!container || !appointments.length) return;

    container.innerHTML = appointments.slice(0, 3).map(a => `
      <div class="donor-match-card">
        <div style="font-size:1.4rem;">📅</div>
        <div class="donor-match-info">
          <div class="donor-match-name">${a.hospital?.hospitalName || 'Hospital'}</div>
          <div class="donor-match-meta">${formatDate(a.appointmentDate)} ${a.timeSlot ? '· ' + a.timeSlot : ''}</div>
        </div>
        <span class="badge badge-${a.status === 'approved' ? 'green' : a.status === 'pending' ? 'orange' : 'gray'}">${a.status}</span>
      </div>
    `).join('');
  } catch (err) {
    console.warn('Appointments error:', err.message);
  }
}

function renderCompatibility(bloodGroup) {
  const compat = DONOR_COMPAT[bloodGroup];
  if (!compat) return;

  const giveContainer = document.getElementById('canGiveTo');
  const receiveContainer = document.getElementById('canReceiveFrom');

  if (giveContainer) {
    giveContainer.innerHTML = compat.gives.map(g =>
      `<span class="compat-chip give">${g}</span>`
    ).join('');
  }
  if (receiveContainer) {
    receiveContainer.innerHTML = compat.receives.map(r =>
      `<span class="compat-chip receive">${r}</span>`
    ).join('');
  }
}

async function acceptRequest(id, btn) {
  btn.disabled = true;
  btn.textContent = 'Accepting...';
  try {
    await api.bloodRequests.accept(id);
    showToast('Request Accepted', 'The hospital has been notified. Please proceed to donate.', 'success');
    btn.closest('.emergency-card').style.opacity = '0.5';
    btn.textContent = 'Accepted';
  } catch (err) {
    showToast('Error', err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Accept Request';
  }
}

function viewRequest(id) {
  window.location.href = `blood-request.html?id=${id}`;
}

function updateStatEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function initSidebarNav() {
  const links = document.querySelectorAll('.sidebar-link[data-page]');
  const pages = document.querySelectorAll('.dash-page');

  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const page = link.dataset.page;
      pages.forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
      });

      // Load page-specific data
      if (page === 'history') loadDonationHistory();
      if (page === 'appointments') loadAppointments();
      if (page === 'notifications') loadNotifications();
    });
  });
}

// Populate hospital select in appointment modal from API
async function populateHospitalSelect() {
  const select = document.getElementById('appointmentHospitalSelect');
  if (!select) return;
  try {
    const hospitals = await api.hospitals.getAll();
    if (!hospitals.length) {
      select.innerHTML = '<option value="">No verified hospitals found</option>';
      return;
    }
    select.innerHTML = '<option value="">Select a hospital...</option>' +
      hospitals.map(h => `<option value="${h._id}">${h.hospitalName}${h.city ? ' – ' + h.city : ''}</option>`).join('');
  } catch (err) {
    select.innerHTML = '<option value="">Could not load hospitals</option>';
  }
}

// Book appointment modal
function initBookAppointment() {
  const form = document.getElementById('appointmentForm');
  if (!form) return;

  // Pre-load hospitals when the modal is opened via any trigger
  document.querySelectorAll('[onclick*="appointmentModal"]').forEach(btn => {
    btn.addEventListener('click', populateHospitalSelect);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.hospital) return showToast('Select a hospital', 'Please choose a hospital', 'warning');
    try {
      await api.appointments.create(data);
      showToast('Appointment Booked', 'Your appointment request has been submitted', 'success');
      closeModal('appointmentModal');
      loadAppointments();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });
}

window.acceptRequest = acceptRequest;
window.viewRequest = viewRequest;
window.populateHospitalSelect = populateHospitalSelect;
