import '../components/admin-sidebar.js';
import { mockUsers } from '../data/admin.js';

let usersData = [...mockUsers];
let currentPage = 1;
const itemsPerPage = 6;

function renderUsers() {
  const tbody = document.getElementById('users-tbody');
  const template = document.getElementById('tpl-user-row');
  const countLabel = document.getElementById('users-count');

  tbody.innerHTML = '';
  countLabel.textContent = `${usersData.length} user${usersData.length !== 1 ? 's' : ''}`;

  if (usersData.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="8" style="text-align:center; padding: 2rem; color: var(--c-muted);">No users found.</td>`;
    tbody.appendChild(emptyRow);
    updatePagination(0);
    return;
  }

  const totalPages = Math.ceil(usersData.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageData = usersData.slice(startIndex, endIndex);

  pageData.forEach(user => {
    const clone = template.content.cloneNode(true);
    const tr = clone.querySelector('tr');
    tr.addEventListener('click', () => openViewModal(user));

    clone.querySelector('.td-user-name').textContent = user.fullName;
    clone.querySelector('.td-user-meta').textContent = `${user.email}  ${user.id}`;
    clone.querySelector('.td-role').textContent = user.role;

    const badge = clone.querySelector('.badge');
    badge.textContent = user.accountStatus;
    badge.className = `badge ${user.statusClass}`;

    clone.querySelector('.td-warnings').textContent = user.warningCount;
    clone.querySelector('.td-bookings').textContent = user.bookingCount;
    clone.querySelector('.td-registered').textContent = user.createdAt;
    clone.querySelector('.td-activity').textContent = user.lastActivityAt;

    tbody.appendChild(clone);
  });

  updatePagination(totalPages);
}

function updatePagination(totalPages) {
  const info = document.querySelector('.admin-pagination__info');
  const btnPrev = document.querySelector('.btn-prev');
  const btnNext = document.querySelector('.btn-next');

  if (!info || !btnPrev || !btnNext) return;

  if (totalPages === 0) {
    info.textContent = `Trang 0 / 0`;
    btnPrev.disabled = true;
    btnNext.disabled = true;
    return;
  }

  info.textContent = `Page ${currentPage} of ${totalPages}`;
  btnPrev.disabled = currentPage === 1;
  btnNext.disabled = currentPage === totalPages;
}

// ----------------- MODAL LOGIC ----------------- //
const modal = document.getElementById('action-modal');
const modalClose = document.getElementById('modal-close');
const viewState = document.getElementById('modal-view-state');
const actionState = document.getElementById('modal-action-state');

const btnWarn = document.getElementById('btn-show-warn');
const btnSuspend = document.getElementById('btn-show-suspend');
const btnRestore = document.getElementById('btn-show-restore');
const btnNote = document.getElementById('btn-show-note');

const btnCancelAction = document.getElementById('btn-cancel-action');
const btnConfirmAction = document.getElementById('btn-confirm-action');
const actionReason = document.getElementById('admin-reason');

let currentUser = null;
let currentAction = null; 

function openViewModal(user) {
  currentUser = user;
  
  viewState.removeAttribute('hidden');
  actionState.setAttribute('hidden', '');

  document.getElementById('modal-view-name').textContent = user.fullName;
  const badge = document.getElementById('modal-view-badge');
  badge.textContent = user.accountStatus;
  badge.className = `badge ${user.statusClass}`;
  
  document.getElementById('modal-view-subtitle').textContent = `${user.email}  ${user.id}`;
  document.getElementById('modal-view-role').textContent = user.role;
  document.getElementById('modal-view-warnings').textContent = user.warningCount;
  document.getElementById('modal-view-bookings').textContent = user.bookingCount;
  document.getElementById('modal-view-registered').textContent = user.createdAt;
  document.getElementById('modal-view-activity').textContent = user.lastActivityAt;
  document.getElementById('modal-view-processed').textContent = user.processedBy || '--';

  const restoBox = document.getElementById('modal-view-restoration-box');
  if (user.accountStatus === 'Restored' && user.restoredAt) {
    restoBox.removeAttribute('hidden');
    document.getElementById('modal-view-restoration-text').textContent = `Account restored on ${user.restoredAt}`;
  } else {
    restoBox.setAttribute('hidden', '');
  }

  const adminNoteBox = document.getElementById('modal-view-admin-note');
  if (user.adminNote) {
    adminNoteBox.removeAttribute('hidden');
    document.getElementById('modal-view-admin-note-text').textContent = user.adminNote;
  } else {
    adminNoteBox.setAttribute('hidden', '');
  }

  const reportsList = document.getElementById('modal-view-reports');
  reportsList.innerHTML = '';
  if (user.relatedReports && user.relatedReports.length > 0) {
    user.relatedReports.forEach(rep => {
      reportsList.innerHTML += `<div class="modal-list-item"><span><strong>${rep.id}</strong> ${rep.type}</span><span class="modal-list-item-meta">${rep.date}</span></div>`;
    });
  } else {
    reportsList.innerHTML = `<span style="font-size:0.875rem; color:var(--c-muted);">No related reports.</span>`;
  }

  const bookingsList = document.getElementById('modal-view-bookings-list');
  bookingsList.innerHTML = '';
  if (user.recentBookings && user.recentBookings.length > 0) {
    user.recentBookings.forEach(bk => {
      bookingsList.innerHTML += `<div class="modal-list-item"><span><strong>${bk.id}</strong> ${bk.venue}</span><span class="modal-list-item-meta">${bk.date} - ${bk.status}</span></div>`;
    });
  } else {
    bookingsList.innerHTML = `<span style="font-size:0.875rem; color:var(--c-muted);">No recent bookings.</span>`;
  }

  if (user.accountStatus === 'Suspended') {
    btnWarn.setAttribute('hidden', '');
    btnSuspend.setAttribute('hidden', '');
    btnRestore.removeAttribute('hidden');
  } else {
    btnWarn.removeAttribute('hidden');
    btnSuspend.removeAttribute('hidden');
    btnRestore.setAttribute('hidden', '');
  }

  modal.showModal();
}

function openActionState(actionType) {
  currentAction = actionType;
  
  viewState.setAttribute('hidden', '');
  actionState.removeAttribute('hidden');
  actionReason.value = '';
  btnConfirmAction.disabled = true;

  document.getElementById('modal-action-name').textContent = currentUser.fullName;
  const badge = document.getElementById('modal-action-badge');
  badge.textContent = currentUser.accountStatus;
  badge.className = `badge ${currentUser.statusClass}`;
  document.getElementById('modal-action-subtitle').textContent = `${currentUser.email}  ${currentUser.id}`;

  const titleEl = document.getElementById('modal-action-title');
  const effectsEl = document.getElementById('modal-action-effects');
  
  btnConfirmAction.className = 'btn-admin';

  if (actionType === 'warn') {
    titleEl.textContent = 'Issue warning';
    effectsEl.innerHTML = `Effects of this action<br>A warning will be recorded on this account. The user will be notified of the warning.`;
    btnConfirmAction.classList.add('btn-admin--warning');
    btnConfirmAction.textContent = 'Issue warning';
  } else if (actionType === 'suspend') {
    titleEl.textContent = 'Suspend account';
    effectsEl.innerHTML = `Effects of this action<br>Once suspended, this user:<ul><li>Cannot create new bookings</li><li>Cannot reschedule existing bookings</li><li>Cannot perform restricted actions that create new commitments</li><li>May retain access to booking history</li><li>Keeps existing confirmed bookings unless separately cancelled under an applicable policy</li></ul>`;
    btnConfirmAction.classList.add('btn-admin--danger');
    btnConfirmAction.textContent = 'Suspend account';
  } else if (actionType === 'restore') {
    titleEl.textContent = 'Restore account';
    effectsEl.innerHTML = `Effects of this action<br>The user's account will be reactivated. They will regain the ability to create and manage bookings.`;
    btnConfirmAction.classList.add('btn-admin--blue');
    btnConfirmAction.textContent = 'Restore account';
  } else if (actionType === 'note') {
    titleEl.textContent = 'Add note';
    effectsEl.innerHTML = `Effects of this action<br>An internal administrative note will be added to this user's profile.`;
    btnConfirmAction.classList.add('btn-admin--blue');
    btnConfirmAction.textContent = 'Add note';
  }
}

btnWarn.addEventListener('click', () => openActionState('warn'));
btnSuspend.addEventListener('click', () => openActionState('suspend'));
btnRestore.addEventListener('click', () => openActionState('restore'));
btnNote.addEventListener('click', () => openActionState('note'));
btnCancelAction.addEventListener('click', () => {
  viewState.removeAttribute('hidden');
  actionState.setAttribute('hidden', '');
});

actionReason.addEventListener('input', () => {
  btnConfirmAction.disabled = actionReason.value.trim().length === 0;
});

btnConfirmAction.addEventListener('click', () => {
  if (btnConfirmAction.disabled) return;
  const reason = actionReason.value.trim();
  
  currentUser.adminNote = reason;
  currentUser.processedBy = 'Admin (You)';
  
  if (currentAction === 'warn') {
    currentUser.accountStatus = 'Warned';
    currentUser.statusClass = 'badge--warning';
    currentUser.warningCount += 1;
  } else if (currentAction === 'suspend') {
    currentUser.accountStatus = 'Suspended';
    currentUser.statusClass = 'badge--danger';
  } else if (currentAction === 'restore') {
    currentUser.accountStatus = 'Restored';
    currentUser.statusClass = 'badge--info';
    const today = new Date();
    currentUser.restoredAt = today.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + today.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  renderUsers();
  openViewModal(currentUser); 
});

modalClose.addEventListener('click', () => modal.close());
modal.addEventListener('close', () => {
  currentUser = null;
  currentAction = null;
});

// Modal Backdrop Click
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.close();
  }
});

const searchInput = document.getElementById('user-search');
const filterStatus = document.getElementById('filter-status');
const filterRole = document.getElementById('filter-role');

function applyFilters() {
  const query = searchInput.value.toLowerCase();
  const status = filterStatus.value;
  const role = filterRole.value;

  usersData = mockUsers.filter(u => {
    const matchesQuery = query === '' || 
      u.fullName.toLowerCase().includes(query) || 
      u.email.toLowerCase().includes(query) ||
      u.id.toLowerCase().includes(query);
    const matchesStatus = status === 'all' || u.accountStatus.toLowerCase() === status;
    const matchesRole = role === 'all' || u.role.toLowerCase() === role;
    return matchesQuery && matchesStatus && matchesRole;
  });
  
  currentPage = 1;
  renderUsers();
}

if (searchInput) searchInput.addEventListener('input', applyFilters);
if (filterStatus) filterStatus.addEventListener('change', applyFilters);
if (filterRole) filterRole.addEventListener('change', applyFilters);

document.addEventListener('DOMContentLoaded', () => {
  renderUsers();

  const btnPrev = document.querySelector('.btn-prev');
  const btnNext = document.querySelector('.btn-next');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderUsers();
      }
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const totalPages = Math.ceil(usersData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderUsers();
      }
    });
  }
});
