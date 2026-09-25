import '../components/admin-sidebar.js';
import { mockUsers } from '../data/admin.js';

let usersData = [...mockUsers];

function renderUsers() {
  const tbody = document.getElementById('users-tbody');
  const template = document.getElementById('tpl-user-row');
  const countLabel = document.getElementById('users-count');

  if (!tbody || !template) return;

  tbody.innerHTML = '';
  countLabel.textContent = `${usersData.length} users`;

  if (usersData.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8" class="empty">
      <div class="empty__title">No users found</div>
      <div class="empty__hint">Try adjusting your filters or search query.</div>
    </td>`;
    tbody.appendChild(tr);
    return;
  }

  usersData.forEach(user => {
    const clone = template.content.cloneNode(true);
    
    clone.querySelector('.td-user-name').textContent = user.fullName;
    clone.querySelector('.td-user-meta').textContent = `${user.email} · ${user.id}`;
    clone.querySelector('.td-role').textContent = user.role;
    clone.querySelector('.td-warnings').textContent = user.warningCount;
    clone.querySelector('.td-bookings').textContent = user.bookingCount;
    clone.querySelector('.td-registered').textContent = user.createdAt;
    clone.querySelector('.td-activity').textContent = user.lastActivityAt;
    
    const badge = clone.querySelector('.badge');
    badge.textContent = user.accountStatus;
    badge.className = `badge ${user.statusClass}`;

    const actionBtn = clone.querySelector('.td-action-btn');
    actionBtn.addEventListener('click', () => openActionModal(user));

    tbody.appendChild(clone);
  });
}

function handleSearchAndFilter() {
  const searchInput = document.getElementById('user-search');
  const statusFilter = document.getElementById('filter-status');

  const filterData = () => {
    const term = searchInput.value.toLowerCase();
    const status = statusFilter.value.toLowerCase();

    usersData = mockUsers.filter(user => {
      const matchSearch = user.fullName.toLowerCase().includes(term) ||
                          user.email.toLowerCase().includes(term) ||
                          user.id.toLowerCase().includes(term);
      const matchStatus = status === 'all' || user.accountStatus.toLowerCase() === status;
      return matchSearch && matchStatus;
    });

    renderUsers();
  };

  if (searchInput) searchInput.addEventListener('input', filterData);
  if (statusFilter) statusFilter.addEventListener('change', filterData);
}

// Modal Logic
let currentUserForAction = null;

function openActionModal(user) {
  currentUserForAction = user;
  const modal = document.getElementById('action-modal');
  document.getElementById('modal-user-name').textContent = `${user.fullName} (${user.id})`;
  document.getElementById('modal-user-status').textContent = user.accountStatus;
  
  const warningText = document.getElementById('modal-warning-text');
  
  if (user.accountStatus === 'Suspended') {
    warningText.textContent = 'Restoring this user will allow them to make new bookings again.';
    document.getElementById('modal-confirm').textContent = 'Restore User';
    document.getElementById('modal-confirm').className = 'btn-admin btn-admin--primary';
  } else {
    warningText.textContent = 'Suspending this user will prevent them from making new bookings. Existing bookings will not be cancelled automatically.';
    document.getElementById('modal-confirm').textContent = 'Suspend User';
    document.getElementById('modal-confirm').className = 'btn-admin btn-admin--danger';
  }

  document.getElementById('admin-reason').value = '';
  modal.showModal();
}

function closeActionModal() {
  const modal = document.getElementById('action-modal');
  modal.close();
  currentUserForAction = null;
}

function confirmAction() {
  const reason = document.getElementById('admin-reason').value.trim();
  if (!reason) {
    alert('Please enter an administrative reason.');
    return;
  }

  if (currentUserForAction) {
    if (currentUserForAction.accountStatus === 'Suspended') {
      currentUserForAction.accountStatus = 'Restored';
      currentUserForAction.statusClass = 'badge--review';
    } else {
      currentUserForAction.accountStatus = 'Suspended';
      currentUserForAction.statusClass = 'badge--danger';
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
      renderUsers();
      
      // Show success toast (using the existing #toast component from components.css if it existed, or just alert)
      alert(`Action completed successfully for ${currentUserForAction.fullName}.`);
    }, 600);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderUsers();
  handleSearchAndFilter();

  document.getElementById('modal-close')?.addEventListener('click', closeActionModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeActionModal);
  document.getElementById('modal-confirm')?.addEventListener('click', confirmAction);
});
