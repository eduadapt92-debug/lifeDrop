// LifeDrop Admin Dashboard JS

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) return window.location.href = 'login.html';
  const user = Auth.getUser();
  if (user?.role !== 'admin') return window.location.href = 'login.html';

  await Promise.all([
    loadAdminStats(),
    loadUsers(),
    loadPendingHospitals(),
    loadAuditLogs(),
    loadNotifications(),
    loadAlerts(),
    loadAdminBloodRequests(),
    loadInventoryAdmin(),
  ]);
  initSidebarNav();
  initAlertModal();
});

async function loadAdminStats() {
  try {
    const stats = await api.admin.getStats();
    updateStatEl('statTotalUsers', stats.totalUsers);
    updateStatEl('statDonors', stats.totalDonors);
    updateStatEl('statRecipients', stats.totalRecipients);
    updateStatEl('statHospitals', stats.totalHospitals);
    updateStatEl('statActiveRequests', stats.activeRequests);
    updateStatEl('statEmergencyRequests', stats.emergencyRequests);
    updateStatEl('statPendingHospitals', stats.pendingHospitals);
  } catch (err) {
    console.warn('Stats error:', err.message);
  }
}

async function loadUsers() {
  try {
    const users = await api.admin.getUsers();
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="avatar" style="width:28px;height:28px;font-size:0.65rem;">${u.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
            <div>
              <div style="font-weight:600;font-size:0.85rem;">${u.name}</div>
              <div style="font-size:0.72rem;color:var(--gray-500);">${u.email}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-blue" style="text-transform:capitalize;">${u.role}</span></td>
        <td>${u.phone || '—'}</td>
        <td><span class="badge badge-${u.status === 'active' ? 'green' : u.status === 'suspended' ? 'red' : 'orange'}">${u.status}</span></td>
        <td>${formatDate(u.createdAt)}</td>
        <td>
          <div style="display:flex;gap:6px;">
            ${u.status === 'active'
              ? `<button class="btn btn-outline btn-sm" onclick="updateUserStatus('${u._id}','suspended',this)">Suspend</button>`
              : `<button class="btn btn-green btn-sm" onclick="updateUserStatus('${u._id}','active',this)">Activate</button>`
            }
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.warn('Users error:', err.message);
  }
}

async function loadPendingHospitals() {
  try {
    const hospitals = await api.admin.getPendingHospitals();
    const container = document.getElementById('pendingHospitals');
    if (!container) return;

    if (!hospitals.length) {
      container.innerHTML = '<p style="color:var(--gray-500);font-size:0.85rem;padding:12px;">No pending hospitals</p>';
      return;
    }

    container.innerHTML = hospitals.map(h => `
      <div class="emergency-card" style="border-left:3px solid var(--orange);">
        <div class="emergency-card-info">
          <div class="emergency-card-title">${h.hospitalName}</div>
          <div class="emergency-card-meta">${h.institutionType} · ${h.city || ''} · Reg: ${h.registrationNumber || '—'}</div>
          <div class="emergency-card-meta">Submitted by: ${h.user?.name} · ${h.user?.email}</div>
          <div class="emergency-card-meta">${formatDate(h.user?.createdAt)}</div>
          <div class="emergency-card-actions">
            <button class="btn btn-green btn-sm" onclick="verifyHospital('${h._id}','verified',this)">✓ Verify</button>
            <button class="btn btn-outline btn-sm" onclick="verifyHospital('${h._id}','rejected',this)">✕ Reject</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.warn('Pending hospitals error:', err.message);
  }
}

async function loadAuditLogs() {
  try {
    const logs = await api.admin.getAuditLogs();
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;
    tbody.innerHTML = logs.map(log => `
      <tr>
        <td style="font-size:0.78rem;">${formatDate(log.createdAt)}</td>
        <td><span style="font-weight:600;">${log.actor?.name || 'System'}</span><br><span style="font-size:0.72rem;color:var(--gray-500);">${log.actor?.role || ''}</span></td>
        <td><code style="font-size:0.75rem;background:var(--gray-100);padding:2px 6px;border-radius:4px;">${log.action}</code></td>
        <td style="font-size:0.82rem;color:var(--gray-700);">${log.description || '—'}</td>
        <td style="font-size:0.75rem;color:var(--gray-500);">${log.entity || '—'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.warn('Audit logs error:', err.message);
  }
}

async function updateUserStatus(id, status, btn) {
  btn.disabled = true;
  try {
    await api.admin.updateUserStatus(id, status);
    showToast('Updated', `User ${status}`, 'success');
    loadUsers();
  } catch (err) {
    showToast('Error', err.message, 'error');
    btn.disabled = false;
  }
}

async function verifyHospital(id, status, btn) {
  btn.disabled = true;
  try {
    await api.admin.verifyHospital(id, status);
    showToast(status === 'verified' ? '✅ Verified' : '❌ Rejected', `Hospital ${status}`, status === 'verified' ? 'success' : 'error');
    loadPendingHospitals();
    loadAdminStats();
  } catch (err) {
    showToast('Error', err.message, 'error');
    btn.disabled = false;
  }
}

function updateStatEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
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
      if (page === 'users')         loadUsers();
      if (page === 'hospitals')     loadPendingHospitals();
      if (page === 'requests')      loadAdminBloodRequests();
      if (page === 'inventory')     loadInventoryAdmin();
      if (page === 'audit')         loadAuditLogs();
      if (page === 'notifications') loadNotifications();
      if (page === 'alerts')        loadAlerts();
    });
  });
}

// ===== BLOOD REQUESTS (admin view with state management) =====

const URGENCY_COLOR = { critical:'var(--red)', urgent:'var(--orange)', scheduled:'var(--blue)' };
const STATUS_BADGE  = {
  open:      'badge-orange',
  matched:   'badge-blue',
  accepted:  'badge-blue',
  fulfilled: 'badge-green',
  cancelled: 'badge-gray',
};

async function loadAdminBloodRequests(filterStatus = '') {
  const container = document.getElementById('allRequestsList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:24px;"><div class="spinner" style="margin:0 auto;"></div></div>';

  try {
    const params  = filterStatus ? `?status=${filterStatus}` : '';
    const requests = await api.bloodRequests.getAll(params);

    if (!requests.length) {
      container.innerHTML = `<p style="text-align:center;padding:32px;color:var(--gray-500);">No blood requests found${filterStatus ? ' for this status' : ''}.</p>`;
      return;
    }

    const activeCount   = requests.filter(r => !['fulfilled','cancelled'].includes(r.status)).length;
    const fulfilledCount = requests.filter(r => r.status === 'fulfilled').length;

    container.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center;">
        <span style="font-size:0.82rem;color:var(--gray-500);margin-right:4px;">Filter:</span>
        ${['','open','matched','accepted','fulfilled','cancelled'].map(s => `
          <button class="btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline'}"
            onclick="loadAdminBloodRequests('${s}')" style="text-transform:capitalize;">
            ${s || 'All'} ${s === '' ? `(${requests.length})` : ''}
          </button>`).join('')}
        <span style="margin-left:auto;font-size:0.8rem;color:var(--gray-500);">
          <span style="color:var(--orange);font-weight:700;">${activeCount}</span> active ·
          <span style="color:var(--green);font-weight:700;">${fulfilledCount}</span> resolved
        </span>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Requester</th><th>Blood</th><th>Qty</th><th>Urgency</th><th>Location</th><th>Status</th><th>Posted</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${requests.map(r => {
              const isActive = !['fulfilled','cancelled'].includes(r.status);
              const urgColor = URGENCY_COLOR[r.urgencyLevel] || 'var(--gray-600)';
              return `<tr id="admin-req-${r._id}">
                <td>
                  <div style="font-weight:600;font-size:0.85rem;">${escAdm(r.requestedBy?.name || '—')}</div>
                  <div style="font-size:0.72rem;color:var(--gray-500);text-transform:capitalize;">${r.requesterRole || r.requestedBy?.role || '—'}</div>
                </td>
                <td><span style="font-family:var(--mono);font-weight:900;font-size:1rem;color:var(--red);">${r.bloodGroupNeeded}</span></td>
                <td style="font-weight:600;">${r.quantityNeeded}</td>
                <td><span style="color:${urgColor};font-weight:700;font-size:0.8rem;text-transform:uppercase;">${r.urgencyLevel}</span></td>
                <td style="font-size:0.82rem;color:var(--gray-600);">${r.city || '—'}${r.area ? `, ${r.area}` : ''}</td>
                <td><span class="badge ${STATUS_BADGE[r.status]||'badge-gray'}" style="text-transform:capitalize;">${r.status}</span></td>
                <td style="font-size:0.75rem;color:var(--gray-400);">${timeAgo(r.createdAt)}</td>
                <td>
                  <div style="display:flex;gap:5px;flex-wrap:wrap;">
                    ${isActive ? `
                      <button class="btn btn-green btn-sm" onclick="adminFulfillRequest('${r._id}', this)" title="Mark as resolved — removes from ticker">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:3px;vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>Resolve
                      </button>
                      <button class="btn btn-outline btn-sm" onclick="adminCancelRequest('${r._id}', this)">Cancel</button>
                    ` : `<span style="font-size:0.75rem;color:var(--gray-400);font-style:italic;">${r.status === 'fulfilled' ? 'Resolved' : 'Cancelled'}</span>`}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    container.innerHTML = `<p style="text-align:center;padding:24px;color:var(--red);">${err.message}</p>`;
  }
}

async function adminFulfillRequest(id, btn) {
  if (!confirm('Mark this request as fulfilled? It will be removed from the live ticker.')) return;
  btn.disabled = true;
  btn.textContent = '…';
  try {
    await api.bloodRequests.fulfill(id);
    showToast('Resolved', 'Request fulfilled and removed from ticker', 'success');
    loadAdminBloodRequests();
    loadAdminStats();
  } catch (err) {
    showToast('Error', err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Resolve';
  }
}

async function adminCancelRequest(id, btn) {
  if (!confirm('Cancel this blood request? It will be removed from the live ticker.')) return;
  btn.disabled = true;
  try {
    await api.bloodRequests.update(id, { status: 'cancelled' });
    showToast('Cancelled', 'Request cancelled and removed from ticker', 'info');
    loadAdminBloodRequests();
    loadAdminStats();
  } catch (err) {
    showToast('Error', err.message, 'error');
    btn.disabled = false;
  }
}

// ===== ALERTS (CRUD) =====

const ALERT_TYPE_COLORS = {
  critical:     '#FF6B6B',
  urgent:       '#FCA5A5',
  low:          '#FCD34D',
  info:         '#93C5FD',
  announcement: '#C4B5FD',
};

async function loadAlerts() {
  try {
    const alerts = await api.alerts.getAll();
    const tbody  = document.getElementById('alertsTableBody');
    if (!tbody) return;

    if (!alerts.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--gray-500);">No alerts created yet. Click <strong>New Alert</strong> to add one.</td></tr>`;
      return;
    }

    tbody.innerHTML = alerts.map(a => {
      const color     = ALERT_TYPE_COLORS[a.type] || '#9CA3AF';
      const isExpired = a.expiresAt && new Date(a.expiresAt) < new Date();
      const statusBadge = !a.isActive
        ? `<span class="badge" style="background:var(--gray-100);color:var(--gray-600);">Inactive</span>`
        : isExpired
          ? `<span class="badge badge-red">Expired</span>`
          : `<span class="badge badge-green">Active</span>`;

      return `<tr id="alert-row-${a._id}">
        <td><span style="color:${color};font-weight:800;font-size:0.82rem;">${escAdm(a.label)}</span></td>
        <td style="max-width:260px;font-size:0.82rem;color:var(--gray-700);">${escAdm(a.message)}</td>
        <td><span class="badge" style="background:${color}22;color:${color};border:1px solid ${color}44;text-transform:capitalize;">${a.type}</span></td>
        <td>${statusBadge}</td>
        <td style="font-size:0.78rem;color:var(--gray-500);">${a.expiresAt ? formatDate(a.expiresAt) : '—'}</td>
        <td style="font-size:0.75rem;color:var(--gray-400);">${formatDate(a.createdAt)}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" onclick="openAlertModal(${JSON.stringify(a).replace(/"/g,'&quot;')})">Edit</button>
            <button class="btn btn-outline btn-sm" onclick="toggleAlert('${a._id}',${!a.isActive})">
              ${a.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button class="btn btn-sm" style="background:var(--red-muted);color:var(--red);border:1px solid var(--red-border);" onclick="deleteAlert('${a._id}')">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

function escAdm(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function initAlertModal() {
  const msgEl = document.getElementById('alertMessage');
  if (!msgEl) return;
  msgEl.addEventListener('input', () => {
    const counter = document.getElementById('alertMsgCount');
    if (counter) counter.textContent = `${msgEl.value.length} / 200`;
  });
}

function openAlertModal(alert) {
  document.getElementById('alertEditId').value    = alert?._id     || '';
  document.getElementById('alertLabel').value     = alert?.label   || '';
  document.getElementById('alertMessage').value   = alert?.message || '';
  document.getElementById('alertType').value      = alert?.type    || 'info';
  document.getElementById('alertActive').checked  = alert ? alert.isActive : true;
  document.getElementById('alertModalTitle').textContent = alert ? 'Edit Alert' : 'New Ticker Alert';
  document.getElementById('saveAlertBtn').textContent    = alert ? 'Update Alert' : 'Save Alert';

  const msgCount = document.getElementById('alertMsgCount');
  if (msgCount) msgCount.textContent = `${(alert?.message || '').length} / 200`;

  const expiresEl = document.getElementById('alertExpires');
  if (expiresEl) {
    if (alert?.expiresAt) {
      // Format to datetime-local value
      const d = new Date(alert.expiresAt);
      expiresEl.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } else {
      expiresEl.value = '';
    }
  }

  openModal('alertModal');
}

async function saveAlert() {
  const id      = document.getElementById('alertEditId').value;
  const label   = document.getElementById('alertLabel').value.trim();
  const message = document.getElementById('alertMessage').value.trim();
  const type    = document.getElementById('alertType').value;
  const isActive = document.getElementById('alertActive').checked;
  const expiresRaw = document.getElementById('alertExpires').value;
  const expiresAt  = expiresRaw ? new Date(expiresRaw).toISOString() : null;

  if (!label)   return showToast('Required', 'Please enter a label for the alert', 'warning');
  if (!message) return showToast('Required', 'Please enter a message for the alert', 'warning');

  const btn = document.getElementById('saveAlertBtn');
  btn.disabled = true;
  btn.textContent = id ? 'Updating…' : 'Saving…';

  try {
    const payload = { label, message, type, isActive, expiresAt };
    if (id) {
      await api.alerts.update(id, payload);
      showToast('Updated', 'Alert updated successfully', 'success');
    } else {
      await api.alerts.create(payload);
      showToast('Created', 'Alert is now live in the ticker', 'success');
    }
    closeModal('alertModal');
    await loadAlerts();
  } catch (err) {
    showToast('Error', err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = id ? 'Update Alert' : 'Save Alert';
  }
}

async function toggleAlert(id, newState) {
  try {
    await api.alerts.update(id, { isActive: newState });
    showToast(newState ? 'Activated' : 'Deactivated', `Alert is now ${newState ? 'live' : 'hidden'}`, 'success');
    loadAlerts();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

async function deleteAlert(id) {
  if (!confirm('Delete this alert permanently?')) return;
  try {
    await api.alerts.delete(id);
    document.getElementById(`alert-row-${id}`)?.remove();
    showToast('Deleted', 'Alert removed from ticker', 'success');
    // If table is now empty, reload to show empty state
    const tbody = document.getElementById('alertsTableBody');
    if (tbody && !tbody.querySelector('tr[id]')) loadAlerts();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

// ===== BLOOD INVENTORY (network-wide oversight) =====

const INV_STATUS_COLOR = { critical:'var(--red)', low:'var(--orange)', moderate:'#D97706', stable:'var(--blue)', optimal:'var(--green)' };
let allAdminInventory = [];

async function loadInventoryAdmin() {
  try {
    const [inventory, lowStock] = await Promise.all([
      api.inventory.getAll(),
      api.inventory.getLowStock(),
    ]);
    allAdminInventory = inventory;
    renderInventorySummary(inventory);
    renderInventoryLowStockAlerts(lowStock);
    renderInventoryAdminTable(inventory);
  } catch (err) {
    console.warn('Inventory error:', err.message);
  }
}

function renderInventorySummary(inventory) {
  const grid = document.getElementById('inventorySummaryGrid');
  if (!grid) return;
  const bloodGroups = ['O-', 'O+', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  grid.innerHTML = bloodGroups.map(bg => {
    const records = inventory.filter(i => i.bloodGroup === bg);
    const total = records.reduce((sum, i) => sum + (i.availableUnits || 0), 0);
    const worst = records.some(i => i.status === 'critical') ? 'critical'
      : records.some(i => i.status === 'low') ? 'low'
      : records.length ? records[0].status : 'unknown';
    const color = INV_STATUS_COLOR[worst] || 'var(--gray-400)';
    return `
      <div class="card" style="padding:16px;text-align:center;border-left:3px solid ${color};">
        <div style="font-size:1.4rem;font-weight:900;font-family:var(--mono);color:${color};">${bg}</div>
        <div style="font-size:1.2rem;font-weight:800;color:var(--dark);margin:4px 0;">${records.length ? total : '—'}</div>
        <div style="font-size:0.68rem;color:var(--gray-500);">units total</div>
        ${records.length ? `<div class="inv-status ${worst}" style="display:inline-block;margin-top:6px;font-size:0.65rem;">${worst}</div>` : ''}
      </div>`;
  }).join('');
}

function renderInventoryLowStockAlerts(lowStock) {
  const container = document.getElementById('inventoryLowStockAlerts');
  if (!container) return;
  if (!lowStock.length) {
    container.innerHTML = '<div class="badge badge-green">✓ All blood groups adequately stocked network-wide</div>';
    return;
  }
  container.innerHTML = lowStock.map(item => `
    <div class="alert-bar" style="border-radius:var(--radius-sm);margin-bottom:8px;">
      <div class="alert-bar-pulse"></div>
      <strong>${item.bloodGroup}</strong> is <strong>${item.status.toUpperCase()}</strong> at ${escAdm(item.hospital?.hospitalName || 'a partner hospital')} — only ${item.availableUnits} units remaining
    </div>
  `).join('');
}

function renderInventoryAdminTable(inventory) {
  const tbody = document.getElementById('inventoryAdminTableBody');
  if (!tbody) return;
  if (!inventory.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--gray-500);">No inventory records found</td></tr>';
    return;
  }
  tbody.innerHTML = inventory.map(item => `
    <tr>
      <td style="font-size:0.85rem;">${escAdm(item.hospital?.hospitalName || '—')}<br><span style="font-size:0.72rem;color:var(--gray-500);">${escAdm(item.hospital?.city || '')}</span></td>
      <td><span class="bg-chip">${item.bloodGroup}</span></td>
      <td><strong>${item.availableUnits}</strong></td>
      <td>${item.usedUnits}</td>
      <td>${item.expiredUnits}</td>
      <td><span class="inv-status ${item.status}">${item.status}</span></td>
      <td style="font-size:0.78rem;color:var(--gray-500);">${item.expiryDate ? formatDate(item.expiryDate) : '—'}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick='openEditInventoryAdmin(${JSON.stringify(item).replace(/'/g, "&#39;")})'>Edit</button>
          <button class="btn btn-sm" style="background:var(--red-muted);color:var(--red);border:1px solid var(--red-border);" onclick="deleteInventoryAdmin('${item._id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openEditInventoryAdmin(item) {
  document.getElementById('invEditId').value = item._id;
  document.getElementById('invEditHospital').value = item.hospital?.hospitalName || '—';
  document.getElementById('invEditBloodGroup').value = item.bloodGroup;
  document.getElementById('invEditUnits').value = item.availableUnits || 0;
  document.getElementById('invEditUsed').value = item.usedUnits || 0;
  document.getElementById('invEditExpired').value = item.expiredUnits || 0;
  document.getElementById('invEditExpiry').value = item.expiryDate ? item.expiryDate.split('T')[0] : '';
  document.getElementById('invEditStorage').value = item.storageLocation || '';
  openModal('inventoryEditModal');
}

async function saveInventoryAdmin() {
  const id = document.getElementById('invEditId').value;
  const payload = {
    availableUnits: parseInt(document.getElementById('invEditUnits').value) || 0,
    usedUnits: parseInt(document.getElementById('invEditUsed').value) || 0,
    expiredUnits: parseInt(document.getElementById('invEditExpired').value) || 0,
    expiryDate: document.getElementById('invEditExpiry').value || null,
    storageLocation: document.getElementById('invEditStorage').value.trim(),
  };

  const btn = document.getElementById('saveInventoryBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    await api.inventory.update(id, payload);
    showToast('Updated', 'Inventory record updated', 'success');
    closeModal('inventoryEditModal');
    loadInventoryAdmin();
  } catch (err) {
    showToast('Error', err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

async function deleteInventoryAdmin(id) {
  if (!confirm('Delete this inventory record permanently?')) return;
  try {
    await api.inventory.delete(id);
    showToast('Deleted', 'Inventory record removed', 'info');
    loadInventoryAdmin();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

function filterInventoryTable() {
  const q = document.getElementById('invSearchInput').value.toLowerCase();
  document.querySelectorAll('#inventoryAdminTableBody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

window.loadInventoryAdmin       = loadInventoryAdmin;
window.openEditInventoryAdmin   = openEditInventoryAdmin;
window.saveInventoryAdmin       = saveInventoryAdmin;
window.deleteInventoryAdmin     = deleteInventoryAdmin;
window.filterInventoryTable     = filterInventoryTable;
window.updateUserStatus    = updateUserStatus;
window.verifyHospital      = verifyHospital;
window.openAlertModal      = openAlertModal;
window.saveAlert           = saveAlert;
window.toggleAlert         = toggleAlert;
window.deleteAlert         = deleteAlert;
window.loadAdminBloodRequests = loadAdminBloodRequests;
window.adminFulfillRequest = adminFulfillRequest;
window.adminCancelRequest  = adminCancelRequest;
