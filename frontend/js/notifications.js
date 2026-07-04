// LifeDrop Notifications JS

async function loadNotifications() {
  try {
    const data = await api.notifications.getAll();
    renderNotifications(data.notifications || []);
    updateNotifBadge(data.unreadCount || 0);
  } catch (err) {
    console.warn('Notifications error:', err.message);
  }
}

function renderNotifications(notifications) {
  const container = document.getElementById('notifList');
  if (!container) return;

  if (notifications.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--gray-500);font-size:0.85rem;">No notifications yet</div>`;
    return;
  }

  const typeIcons = {
    emergency:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    match:       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c-5.5 8-8 12-8 15a8 8 0 0 0 16 0c0-3-2.5-7-8-15z"/></svg>`,
    appointment: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    inventory:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    system:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    reward:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  };
  const bellIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

  container.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.isRead ? '' : 'unread'}" data-id="${n._id}" onclick="markNotifRead('${n._id}', this)">
      <div class="notif-icon">${typeIcons[n.type] || bellIcon}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.message}</div>
        <div class="notif-time">${timeAgo(n.createdAt)}</div>
      </div>
    </div>
  `).join('');
}

async function markNotifRead(id, el) {
  try {
    await api.notifications.markRead(id);
    el?.classList.remove('unread');
    // Update badge
    const badge = document.getElementById('notifBadge');
    if (badge) {
      const count = Math.max(0, parseInt(badge.textContent) - 1);
      badge.textContent = count;
      if (count === 0) badge.style.display = 'none';
    }
  } catch (err) { /* ignore */ }
}

async function markAllRead() {
  try {
    await api.notifications.markAllRead();
    document.querySelectorAll('.notif-item').forEach(el => el.classList.remove('unread'));
    updateNotifBadge(0);
    showToast('Done', 'All notifications marked as read', 'success');
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

function updateNotifBadge(count) {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// Socket.IO notifications
function initSocketNotifications(userId) {
  if (typeof io === 'undefined') return;
  const socketUrl = window.SOCKET_URL || 'http://localhost:5000';
  const socket = io(socketUrl);
  socket.emit('join_room', userId);

  socket.on('donor_matched', (data) => {
    showToast('Blood Request Match!', data.notification?.message || 'You matched a blood request', 'info');
    loadNotifications();
  });

  socket.on('emergency_request_created', (data) => {
    showToast('Emergency!', `Critical ${data.bloodGroup} blood needed in ${data.city}`, 'error');
    loadNotifications();
  });

  socket.on('appointment_created', () => {
    showToast('New Appointment', 'A donor booked an appointment', 'info');
    loadNotifications();
  });

  socket.on('inventory_low', (data) => {
    showToast('Low Inventory', `${data.bloodGroup} blood is critically low`, 'warning');
  });

  socket.on('hospital_verified', (data) => {
    showToast(
      data.status === 'verified' ? 'Verified' : 'Rejected',
      data.status === 'verified' ? 'Your hospital has been verified' : 'Verification rejected',
      data.status === 'verified' ? 'success' : 'error'
    );
  });

  socket.on('donor_accepted_request', (data) => {
    showToast('Donor Accepted', `${data.donorName} accepted your blood request`, 'success');
    loadNotifications();
  });
}

window.loadNotifications = loadNotifications;
window.markNotifRead = markNotifRead;
window.markAllRead = markAllRead;
window.initSocketNotifications = initSocketNotifications;
window.updateNotifBadge = updateNotifBadge;
