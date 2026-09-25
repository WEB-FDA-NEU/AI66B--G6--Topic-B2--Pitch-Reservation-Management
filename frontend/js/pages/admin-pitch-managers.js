import '../components/admin-sidebar.js';
import { mockManagers } from '../data/admin.js';

let managersData = [...mockManagers];

function renderManagers() {
  const tbody = document.getElementById('managers-tbody');
  const template = document.getElementById('tpl-manager-row');
  const countLabel = document.getElementById('managers-count');

  if (!tbody || !template) return;

  tbody.innerHTML = '';
  countLabel.textContent = `${managersData.length} managers`;

  if (managersData.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" class="empty">
      <div class="empty__title">No managers found</div>
      <div class="empty__hint">Try adjusting your filters or search query.</div>
    </td>`;
    tbody.appendChild(tr);
    return;
  }

  managersData.forEach(manager => {
    const clone = template.content.cloneNode(true);
    
    clone.querySelector('.td-user-name').textContent = manager.fullName;
    clone.querySelector('.td-user-meta').textContent = `${manager.email} · ${manager.id}`;
    clone.querySelector('.td-pitches').textContent = manager.managedPitchCount;
    
    // Check if there's affected booking text
    if (manager.activeBookingCount.includes('affected')) {
      const parts = manager.activeBookingCount.split('(');
      clone.querySelector('.td-bookings').innerHTML = `${parts[0].trim()} <span style="color: #c62828; font-size: 0.8rem;">(${parts[1]}</span>`;
    } else {
      clone.querySelector('.td-bookings').textContent = manager.activeBookingCount;
    }
    
    clone.querySelector('.td-balance').textContent = manager.simulatedBalance;
    clone.querySelector('.td-activity').textContent = manager.lastActivityAt;
    
    const badge = clone.querySelector('.badge');
    badge.textContent = manager.accountStatus;
    badge.className = `badge ${manager.statusClass}`;

    const actionBtn = clone.querySelector('.td-action-btn');
    actionBtn.addEventListener('click', () => openActionModal(manager));

    tbody.appendChild(clone);
  });
}

function handleSearchAndFilter() {
  const searchInput = document.getElementById('manager-search');
  const statusFilter = document.getElementById('filter-status');
  const pitchFilter = document.getElementById('filter-pitches');

  const filterData = () => {
    const term = searchInput.value.toLowerCase();
    const status = statusFilter.value.toLowerCase();
    const pitches = pitchFilter.value;

    managersData = mockManagers.filter(manager => {
      const matchSearch = manager.fullName.toLowerCase().includes(term) ||
                          manager.email.toLowerCase().includes(term) ||
                          manager.id.toLowerCase().includes(term);
      const matchStatus = status === 'all' || manager.accountStatus.toLowerCase() === status;
      
      let matchPitches = true;
      if (pitches === '1') matchPitches = manager.managedPitchCount === 1;
      else if (pitches === '2-5') matchPitches = manager.managedPitchCount >= 2 && manager.managedPitchCount <= 5;
      else if (pitches === '5+') matchPitches = manager.managedPitchCount > 5;

      return matchSearch && matchStatus && matchPitches;
    });

    renderManagers();
  };

  if (searchInput) searchInput.addEventListener('input', filterData);
  if (statusFilter) statusFilter.addEventListener('change', filterData);
  if (pitchFilter) pitchFilter.addEventListener('change', filterData);
}

// Modal Logic
let currentManagerForAction = null;

function openActionModal(manager) {
  currentManagerForAction = manager;
  const modal = document.getElementById('action-modal');
  document.getElementById('modal-manager-name').textContent = `${manager.fullName} (${manager.id})`;
  document.getElementById('modal-manager-status').textContent = manager.accountStatus;
  
  const warningText = document.getElementById('modal-warning-text');
  
  if (manager.accountStatus === 'Suspended') {
    warningText.textContent = 'Restoring this manager will allow their associated pitches to accept new bookings again.';
    document.getElementById('modal-confirm').textContent = 'Restore Manager';
    document.getElementById('modal-confirm').className = 'btn-admin btn-admin--primary';
  } else {
    warningText.textContent = 'When suspended, associated pitches stop accepting new bookings. Existing bookings remain valid while under review.';
    document.getElementById('modal-confirm').textContent = 'Suspend Manager';
    document.getElementById('modal-confirm').className = 'btn-admin btn-admin--danger';
  }

  document.getElementById('admin-reason').value = '';
  modal.showModal();
}

function closeActionModal() {
  const modal = document.getElementById('action-modal');
  modal.close();
  currentManagerForAction = null;
}

function confirmAction() {
  const reason = document.getElementById('admin-reason').value.trim();
  if (!reason) {
    alert('Please enter an administrative reason.');
    return;
  }

  if (currentManagerForAction) {
    if (currentManagerForAction.accountStatus === 'Suspended') {
      currentManagerForAction.accountStatus = 'Restored';
      currentManagerForAction.statusClass = 'badge--review';
      currentManagerForAction.activeBookingCount = currentManagerForAction.activeBookingCount.split(' ')[0]; // Strip " (affected)"
    } else {
      currentManagerForAction.accountStatus = 'Suspended';
      currentManagerForAction.statusClass = 'badge--danger';
      if (parseInt(currentManagerForAction.activeBookingCount) > 0 && !currentManagerForAction.activeBookingCount.includes('affected')) {
        currentManagerForAction.activeBookingCount = `0 (${currentManagerForAction.activeBookingCount} affected)`;
      }
    }
    
    // Simulate API delay
    const btn = document.getElementById('modal-confirm');
    const originalText = btn.textContent;
    btn.textContent = 'Processing...';
    btn.disabled = true;

    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
      closeActionModal();
      renderManagers();
      alert(`Action completed successfully for ${currentManagerForAction.fullName}.`);
    }, 600);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderManagers();
  handleSearchAndFilter();

  document.getElementById('modal-close')?.addEventListener('click', closeActionModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeActionModal);
  document.getElementById('modal-confirm')?.addEventListener('click', confirmAction);
});
