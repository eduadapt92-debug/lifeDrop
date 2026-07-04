// LifeDrop Hospital Dashboard JS

let _hospitalProfile = null; // cached so all functions can access the real city/name

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) return window.location.href = 'login.html';
  const user = Auth.getUser();
  if (!['hospital', 'bloodbank', 'admin'].includes(user?.role)) return window.location.href = 'login.html';

  initSocketNotifications(user._id);

  // Load profile first so other functions can use _hospitalProfile.city
  await loadHospitalProfile();

  await Promise.all([
    loadInventory(),
    loadBloodRequests(),
    loadMatchedDonors(),
    loadNotifications(),
    loadStaffCoordination(),
  ]);

  initSidebarNav();
  initInventoryModal();
  initEmergencyModal();
});

async function loadHospitalProfile() {
  try {
    const profile = await api.hospitals.getProfile();
    if (!profile) return;
    _hospitalProfile = profile;
    document.querySelectorAll('[data-hospital-name]').forEach(el => el.textContent = profile.hospitalName);
    document.querySelectorAll('[data-hospital-city]').forEach(el => el.textContent = profile.city || '');
    const verBadge = document.getElementById('verificationBadge');
    if (verBadge) {
      verBadge.textContent = profile.verificationStatus;
      verBadge.className = `badge badge-${profile.verificationStatus === 'verified' ? 'green' : profile.verificationStatus === 'pending' ? 'orange' : 'red'}`;
    }
  } catch (err) {
    console.warn('Hospital profile error:', err.message);
  }
}

async function loadInventory() {
  try {
    const inventory = await api.inventory.getAll();
    renderInventoryCards(inventory);
    renderInventoryBars(inventory);
  } catch (err) {
    console.warn('Inventory error:', err.message);
  }
}

function renderInventoryCards(inventory) {
  const container = document.getElementById('inventoryCards');
  if (!container) return;

  const bloodGroups = ['O-', 'O+', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  const invMap = {};
  inventory.forEach(i => invMap[i.bloodGroup] = i);

  container.innerHTML = bloodGroups.map(bg => {
    const item = invMap[bg];
    const units = item?.availableUnits ?? 0;
    const status = item?.status ?? 'stable';
    const maxUnits = 100;
    const pct = Math.min(100, Math.round((units / maxUnits) * 100));

    return `
      <div class="inv-card">
        <div class="inv-card-top">
          <div class="bg-chip">${bg}</div>
          <span class="inv-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
        <div class="inv-card-units"><span>${units}</span> units</div>
        <div class="progress-bar-wrap" style="margin-top:10px;">
          <div class="progress-bar-track">
            <div class="progress-bar-fill fill-${pct < 20 ? 'red' : pct < 50 ? 'orange' : 'green'}"
              data-width="${pct}" style="width:0"></div>
          </div>
        </div>
        <div style="font-size:0.68rem;color:var(--gray-500);margin-top:4px;">${pct}% capacity</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:10px;width:100%;"
          onclick="openUpdateInventory('${bg}', '${item?._id || ''}', ${units})">Update</button>
      </div>
    `;
  }).join('');

  // Animate bars
  setTimeout(animateProgressBars, 100);
}

function renderInventoryBars(inventory) {
  const container = document.getElementById('inventoryBars');
  if (!container) return;

  if (!inventory.length) {
    container.innerHTML = '<p style="color:var(--gray-500);font-size:0.85rem;">No inventory data yet.</p>';
    return;
  }

  container.innerHTML = inventory.map(item => {
    const pct = Math.min(100, Math.round((item.availableUnits / 100) * 100));
    const fillClass = item.status === 'critical' ? 'fill-red' : item.status === 'low' ? 'fill-orange' : 'fill-green';
    return `
      <div class="progress-bar-wrap">
        <div class="progress-bar-label">
          <span style="font-family:var(--mono);font-weight:700;">${item.bloodGroup}</span>
          <span>${item.availableUnits} units · <span class="inv-status ${item.status}" style="padding:1px 6px;">${item.status}</span></span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill ${fillClass}" data-width="${pct}" style="width:0;"></div>
        </div>
      </div>
    `;
  }).join('');

  setTimeout(animateProgressBars, 100);
}

async function loadBloodRequests() {
  try {
    const requests = await api.bloodRequests.getAll();
    const containers = [
      document.getElementById('bloodRequestsPanel'),
      document.getElementById('emergencyOpsList'),
    ].filter(Boolean);
    if (!containers.length) return;

    const emptyMsg = '<p style="color:var(--gray-500);font-size:0.85rem;">No blood requests yet</p>';

    if (!requests.length) {
      containers.forEach(c => { c.innerHTML = emptyMsg; });
      return;
    }

    const html = requests.slice(0, 8).map(req => `
      <div class="emergency-card ${req.urgencyLevel}">
        <div class="bg-chip">${req.bloodGroupNeeded}</div>
        <div class="emergency-card-info">
          <div class="emergency-card-title">
            ${req.urgencyLevel === "critical" ? "●" : req.urgencyLevel === "urgent" ? "◐" : "○"}
            ${req.bloodGroupNeeded} – ${req.quantityNeeded} units
            <span class="badge badge-${req.urgencyLevel === 'critical' ? 'red' : req.urgencyLevel === 'urgent' ? 'orange' : 'blue'}" style="margin-left:8px">${req.urgencyLevel}</span>
          </div>
          <div class="emergency-card-meta">${req.reason || 'Medical request'} · ${req.city || '—'}</div>
          <div class="emergency-card-meta">Status: <strong>${req.status}</strong> · ${timeAgo(req.createdAt)}</div>
          <div class="emergency-card-actions">
            <button class="btn btn-primary btn-sm" onclick="fulfillRequest('${req._id}', this)">Mark Fulfilled</button>
            <button class="btn btn-ghost btn-sm" onclick="matchDonorsForReq('${req._id}', this)">Re-match Donors</button>
            <button class="btn btn-outline btn-sm" onclick="deleteRequest('${req._id}', this)">Cancel</button>
          </div>
        </div>
      </div>
    `).join('');

    containers.forEach(c => { c.innerHTML = html; });
  } catch (err) {
    console.warn('Blood requests error:', err.message);
  }
}

async function loadMatchedDonors() {
  try {
    const container = document.getElementById('nearbyDonors');
    const container2 = document.getElementById('nearbyDonors2');
    if (!container && !container2) return;

    // Get inventory to find critical blood groups
    const inventory = await api.inventory.getAll();
    const critical = inventory.find(i => i.status === 'critical') || inventory.find(i => i.status === 'low');

    const bloodGroupFilter = critical?.bloodGroup || '';
    const cityFilter = _hospitalProfile?.city || '';
    const areaFilter = _hospitalProfile?.area || '';

    const params = new URLSearchParams();
    if (bloodGroupFilter) params.set('bloodGroup', bloodGroupFilter);
    if (cityFilter) params.set('city', cityFilter);
    if (areaFilter) params.set('area', areaFilter);

    const donors = await api.hospitals.getMatchedDonors(params.toString());

    const emptyMsg = '<p style="color:var(--gray-500);font-size:0.85rem;">No matching donors found nearby</p>';

    if (!donors.length) {
      if (container) container.innerHTML = emptyMsg;
      if (container2) container2.innerHTML = emptyMsg;
      return;
    }

    const matchBadge = document.querySelector('.donor-matches-badge');
    if (matchBadge) matchBadge.textContent = `${donors.length} MATCHES`;

    const renderDonors = (list, limit) => list.slice(0, limit).map(donor => `
      <div class="donor-match-card">
        <div class="avatar" style="width:36px;height:36px;font-size:0.8rem;">
          ${(donor.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div class="donor-match-info">
          <div class="donor-match-name">${donor.name}</div>
          <div class="donor-match-meta">${donor.phone || donor.email || '—'}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="notifyDonor('${donor._id}', '${donor.name}', this)">Notify</button>
      </div>
    `).join('');

    if (container) container.innerHTML = renderDonors(donors, 4);
    if (container2) container2.innerHTML = renderDonors(donors, 10);
  } catch (err) {
    console.warn('Matched donors error:', err.message);
  }
}

async function loadStaffCoordination() {
  const tbody = document.getElementById('staffTableBody');
  const tbody2 = document.getElementById('staffTableBody2');
  if (!tbody && !tbody2) return;

  try {
    // Load recent blood requests as real coordination activity
    const requests = await api.bloodRequests.getAll();

    const emptyRow = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray-500);">No recent coordination activity</td></tr>';

    if (!requests.length) {
      if (tbody) tbody.innerHTML = emptyRow;
      if (tbody2) tbody2.innerHTML = emptyRow;
      return;
    }

    const renderRow = (req) => {
      const actor = req.requestedBy?.name || 'Staff';
      const role = req.requesterRole || 'coordinator';
      const urgencyLabel = req.urgencyLevel === 'critical' ? 'Emergency' : req.urgencyLevel === 'urgent' ? 'Urgent' : 'Scheduled';
      const action = `${urgencyLabel} ${req.bloodGroupNeeded} request – ${req.quantityNeeded} units`;
      const statusLabel = req.status === 'fulfilled' ? 'completed' : req.status;
      const badgeClass = req.status === 'fulfilled' ? 'green' : req.status === 'accepted' ? 'blue' : req.status === 'matched' ? 'orange' : 'gray';

      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="avatar" style="width:28px;height:28px;font-size:0.65rem;">
                ${(actor).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style="font-weight:600;font-size:0.85rem;">${actor}</div>
                <div style="font-size:0.72rem;color:var(--gray-500);text-transform:capitalize;">${role}</div>
              </div>
            </div>
          </td>
          <td style="font-size:0.85rem;">${action}</td>
          <td style="color:var(--gray-500);font-size:0.8rem;">${timeAgo(req.updatedAt || req.createdAt)}</td>
          <td><span class="badge badge-${badgeClass}">${statusLabel}</span></td>
        </tr>
      `;
    };

    const rows = requests.slice(0, 8).map(renderRow).join('');
    if (tbody) tbody.innerHTML = rows;
    if (tbody2) tbody2.innerHTML = rows;
  } catch (err) {
    console.warn('Staff coordination error:', err.message);
    const fallback = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray-500);">Could not load coordination data</td></tr>';
    if (tbody) tbody.innerHTML = fallback;
    if (tbody2) tbody2.innerHTML = fallback;
  }
}

// Render usage trend graph
function renderUsageGraph() {
  const container = document.getElementById('usageGraph');
  if (!container) return;
  const heights = [40, 65, 50, 80, 55, 90, 70];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  container.innerHTML = `
    <div class="graph-placeholder" style="position:relative;">
      ${heights.map((h, i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="flex:1;display:flex;align-items:flex-end;width:100%;">
            <div class="graph-bar" style="height:${h}%;width:100%;"></div>
          </div>
          <span style="font-size:0.65rem;color:var(--gray-500);">${days[i]}</span>
        </div>
      `).join('')}
    </div>
  `;
}

async function fulfillRequest(id, btn) {
  btn.disabled = true;
  btn.textContent = 'Processing...';
  try {
    await api.bloodRequests.fulfill(id);
    showToast('Fulfilled', 'Blood request marked as fulfilled', 'success');
    loadBloodRequests();
  } catch (err) {
    showToast('Error', err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Mark Fulfilled';
  }
}

async function matchDonorsForReq(id, btn) {
  btn.disabled = true;
  btn.textContent = 'Matching...';
  try {
    const result = await api.bloodRequests.matchDonors(id);
    showToast('Donors Matched', `${result.matchedDonors?.length || 0} donors matched and notified`, 'success');
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
  btn.disabled = false;
  btn.textContent = 'Re-match Donors';
}

async function deleteRequest(id, btn) {
  if (!confirm('Cancel this blood request?')) return;
  try {
    await api.bloodRequests.delete(id);
    showToast('Cancelled', 'Blood request cancelled', 'info');
    loadBloodRequests();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

async function notifyDonor(donorId, donorName, btn) {
  btn.disabled = true;
  btn.textContent = 'Sending...';
  try {
    await api.hospitals.notifyDonor({ donorId, bloodGroup: 'O-' });
    showToast('Notified', `${donorName} has been notified`, 'success');
    btn.textContent = 'Sent ✓';
    btn.className = 'btn btn-ghost btn-sm';
  } catch (err) {
    showToast('Error', err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Notify';
  }
}

function openUpdateInventory(bloodGroup, id, currentUnits) {
  document.getElementById('invBloodGroup').value = bloodGroup;
  document.getElementById('invId').value = id;
  document.getElementById('invUnits').value = currentUnits;
  openModal('inventoryModal');
}

function initInventoryModal() {
  const form = document.getElementById('inventoryForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const id = data.invId;
    delete data.invId;
    data.bloodGroup = data.invBloodGroup;
    data.availableUnits = parseInt(data.invUnits);
    delete data.invBloodGroup;
    delete data.invUnits;

    try {
      if (id) {
        await api.inventory.update(id, data);
      } else {
        await api.inventory.add(data);
      }
      showToast('Updated', 'Inventory updated successfully', 'success');
      closeModal('inventoryModal');
      loadInventory();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });
}

function initEmergencyModal() {
  const form = document.getElementById('emergencyForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await api.bloodRequests.create({ ...data, urgencyLevel: 'critical' });
      showToast('Emergency Logged', 'Donors are being notified', 'success');
      closeModal('emergencyModal');
      loadBloodRequests();
      loadMatchedDonors();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });
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

      if (page === 'overview') { loadInventory(); loadBloodRequests(); loadMatchedDonors(); renderUsageGraph(); loadStaffCoordination(); }
      if (page === 'inventory') { loadInventory(); }
      if (page === 'emergency') { loadBloodRequests(); renderUsageGraph(); }
      if (page === 'donors') { loadMatchedDonors(); }
      if (page === 'notifications') { loadNotifications(); }
    });
  });
  renderUsageGraph();
}

window.fulfillRequest = fulfillRequest;
window.matchDonorsForReq = matchDonorsForReq;
window.deleteRequest = deleteRequest;
window.notifyDonor = notifyDonor;
window.openUpdateInventory = openUpdateInventory;
