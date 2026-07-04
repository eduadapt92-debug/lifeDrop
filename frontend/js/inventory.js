// LifeDrop Inventory JS (standalone page)

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) return window.location.href = 'login.html';
  await loadInventoryPage();
  initInventoryForm();
});

async function loadInventoryPage() {
  try {
    const inventory = await api.inventory.getAll();
    const lowStock = await api.inventory.getLowStock();

    renderInventoryTable(inventory);
    renderLowStockAlerts(lowStock);
  } catch (err) {
    showToast('Error', 'Could not load inventory: ' + err.message, 'error');
  }
}

function renderInventoryTable(inventory) {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;
  if (!inventory.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--gray-500);">No inventory records found</td></tr>';
    return;
  }
  tbody.innerHTML = inventory.map(item => `
    <tr>
      <td><span class="bg-chip">${item.bloodGroup}</span></td>
      <td><strong>${item.availableUnits}</strong></td>
      <td>${item.usedUnits}</td>
      <td>${item.expiredUnits}</td>
      <td><span class="inv-status ${item.status}">${item.status}</span></td>
      <td>${item.expiryDate ? formatDate(item.expiryDate) : '—'}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="openEditInventory(${JSON.stringify(item).replace(/"/g,'&quot;')})">Edit</button>
        <button class="btn btn-outline btn-sm" onclick="deleteInventoryItem('${item._id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderLowStockAlerts(lowStock) {
  const container = document.getElementById('lowStockAlerts');
  if (!container) return;
  if (!lowStock.length) {
    container.innerHTML = '<div class="badge badge-green">✓ All blood groups adequately stocked</div>';
    return;
  }
  container.innerHTML = lowStock.map(item => `
    <div class="alert-bar" style="border-radius:var(--radius-sm);margin-bottom:8px;">
      <div class="alert-bar-pulse"></div>
      <strong>${item.bloodGroup}</strong> at ${item.hospital?.hospitalName || 'hospital'} is <strong>${item.status.toUpperCase()}</strong> — only ${item.availableUnits} units remaining
    </div>
  `).join('');
}

function openEditInventory(item) {
  document.getElementById('invFormId').value = item._id || '';
  document.getElementById('invFormBloodGroup').value = item.bloodGroup || '';
  document.getElementById('invFormUnits').value = item.availableUnits || 0;
  document.getElementById('invFormUsed').value = item.usedUnits || 0;
  document.getElementById('invFormExpired').value = item.expiredUnits || 0;
  if (item.expiryDate) document.getElementById('invFormExpiry').value = item.expiryDate.split('T')[0];
  openModal('inventoryModal');
}

async function deleteInventoryItem(id) {
  if (!confirm('Delete this inventory record?')) return;
  try {
    await api.inventory.delete(id);
    showToast('Deleted', 'Inventory record deleted', 'info');
    loadInventoryPage();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

function initInventoryForm() {
  const form = document.getElementById('inventoryForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const id = data.invFormId;
    const payload = {
      bloodGroup: data.invFormBloodGroup,
      availableUnits: parseInt(data.invFormUnits),
      usedUnits: parseInt(data.invFormUsed) || 0,
      expiredUnits: parseInt(data.invFormExpired) || 0,
      expiryDate: data.invFormExpiry,
    };
    try {
      if (id) {
        await api.inventory.update(id, payload);
        showToast('Updated', 'Inventory updated', 'success');
      } else {
        await api.inventory.add(payload);
        showToast('Added', 'Inventory record added', 'success');
      }
      closeModal('inventoryModal');
      loadInventoryPage();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });
}

window.openEditInventory = openEditInventory;
window.deleteInventoryItem = deleteInventoryItem;
