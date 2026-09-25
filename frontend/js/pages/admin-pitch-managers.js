import '../components/admin-sidebar.js';
import { mockManagers } from '../data/admin.js';

let managersData = [...mockManagers];
let currentPage = 1;
const itemsPerPage = 6;

const tbody = document.getElementById('managers-tbody');
const tpl = document.getElementById('tpl-manager-row');
const modal = document.getElementById('action-modal');
const modalClose = document.getElementById('modal-close');
const btnCancel = document.getElementById('modal-cancel');
const btnConfirm = document.getElementById('modal-confirm');
const reasonInput = document.getElementById('admin-reason');

function renderManagers() {
  tbody.innerHTML = '';
  document.getElementById('managers-count').textContent = `${managersData.length} manager${managersData.length !== 1 ? 's' : ''}`;

  if (managersData.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="7" style="text-align:center; padding: 2rem; color: var(--c-muted);">No managers found.</td>`;
    tbody.appendChild(emptyRow);
    updatePagination(0, managersData.length);
    return;
  }
  
  const totalPages = Math.ceil(managersData.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageData = managersData.slice(startIndex, endIndex);

  pageData.forEach(mgr => {
    const clone = tpl.content.cloneNode(true);
    
    const tr = clone.querySelector('tr');
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => openModal(mgr));

    clone.querySelector('.td-user-name').textContent = mgr.fullName;
    clone.querySelector('.td-user-meta').textContent = `${mgr.email}  ${mgr.id}`;
    clone.querySelector('.td-pitches').textContent = mgr.managedPitches;
    // mock some booking & balance data as the template has them
    clone.querySelector('.td-bookings').textContent = mgr.bookingCount || Math.floor(Math.random() * 50);
    clone.querySelector('.td-balance').textContent = mgr.balance || '$120.00';

    const badge = clone.querySelector('.badge');
    badge.textContent = mgr.accountStatus;
    badge.className = `badge ${mgr.statusClass}`;

    clone.querySelector('.td-activity').textContent = mgr.lastActivityAt;

    const actionBtn = clone.querySelector('.td-action-btn');
    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(mgr);
    });

    tbody.appendChild(clone);
  });
  
  updatePagination(totalPages, managersData.length);
}

function updatePagination(totalPages, totalItems) {
  const info = document.querySelector('.admin-pagination__info');
  const btnPrev = document.querySelector('.btn-prev');
  const btnNext = document.querySelector('.btn-next');

  if (!info || !btnPrev || !btnNext) return;

  if (totalPages === 0) {
    info.textContent = `Page 0 of 0`;
    btnPrev.disabled = true;
    btnNext.disabled = true;
    return;
  }

  info.textContent = `Page ${currentPage} of ${totalPages}`;
  btnPrev.disabled = currentPage === 1;
  btnNext.disabled = currentPage === totalPages;
}

let currentManager = null;


  // Modal Elements - View State
  const viewState = document.getElementById('modal-view-state');
  const actionState = document.getElementById('modal-action-state');
  
  // Buttons
  const btnGotoWarn = document.getElementById('btn-goto-warn');
  const btnGotoSuspend = document.getElementById('btn-goto-suspend');
  const btnGotoNote = document.getElementById('btn-goto-note');
  const btnActionCancel = document.getElementById('modal-action-cancel');
  const btnActionConfirm = document.getElementById('modal-action-confirm');
  
  let currentActionType = '';

  function openModal(mgr) {
    currentManager = mgr;
    
    // View state
    document.getElementById('modal-view-name').textContent = mgr.fullName || mgr.name;
    const badge = document.getElementById('modal-view-badge');
    badge.textContent = mgr.accountStatus;
    badge.className = 'badge ' + (mgr.accountStatus === 'Active' ? 'badge--success' : (mgr.accountStatus === 'Warned' ? 'badge--warning' : 'badge--danger'));
    
    document.getElementById('modal-view-subtitle').textContent = mgr.email + ' · ' + mgr.id;
    
    document.getElementById('modal-view-pitches').textContent = mgr.managedPitches || 0;
    document.getElementById('modal-view-bookings').textContent = mgr.activeBookings || 0;
    document.getElementById('modal-view-warnings').textContent = mgr.warnings || 0;
    document.getElementById('modal-view-balance').textContent = mgr.balance || '$0';

    // Show view state, hide action state
    viewState.hidden = false;
    actionState.hidden = true;
    
    modal.showModal();
  }

  function closeModal() {
    modal.close();
    currentManager = null;
    reasonInput.value = '';
    btnActionConfirm.disabled = true;
  }

  const modalClose = document.getElementById('modal-close');
  if(modalClose) modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });


  function switchToActionState(action, title, effectsHtml, btnClass) {
    currentActionType = action;
    
    // Action State details
    document.getElementById('modal-action-title').textContent = title;
    
    document.getElementById('modal-action-name').textContent = currentManager.fullName || currentManager.name;
    const badge = document.getElementById('modal-action-badge');
    badge.textContent = currentManager.accountStatus;
    badge.className = 'badge ' + (currentManager.accountStatus === 'Active' ? 'badge--success' : (currentManager.accountStatus === 'Warned' ? 'badge--warning' : 'badge--danger'));
    
    document.getElementById('modal-action-subtitle').textContent = currentManager.email + ' · ' + currentManager.id;
    
    document.getElementById('modal-action-effects').innerHTML = effectsHtml;
    
    btnActionConfirm.textContent = title;
    btnActionConfirm.className = 'btn-admin ' + btnClass;
    
    reasonInput.value = '';
    btnActionConfirm.disabled = true;

    viewState.hidden = true;
    actionState.hidden = false;
  }

  // Event Listeners for switching states
  if (btnGotoWarn) {
    btnGotoWarn.addEventListener('click', () => {
      switchToActionState('warning', 'Issue warning', 'A warning will be recorded on this manager account. The manager will be notified.', 'btn-admin--warning');
      btnActionConfirm.style.background = '#f59e0b';
      btnActionConfirm.style.color = 'white';
      btnActionConfirm.style.border = 'none';
    });
  }
  
  if (btnGotoSuspend) {
    btnGotoSuspend.addEventListener('click', () => {
      switchToActionState('suspend', 'Suspend manager', 'When a manager is suspended:<br>• Management access is restricted<br>• Associated pitches stop accepting new bookings<br>• Existing confirmed bookings remain valid while under review<br>• Bookings that cannot be fulfilled may require Admin cancellation and refund processing<br>• Existing simulated balance and historical financial records remain preserved<br>• Eligible managers may later be restored', 'btn-admin--danger');
      btnActionConfirm.style.background = ''; // reset to danger class defaults
      btnActionConfirm.style.color = '';
    });
  }

  if (btnGotoNote) {
    btnGotoNote.addEventListener('click', () => {
      switchToActionState('note', 'Add note', 'An internal administrative note will be added to this profile. The manager will not be notified.', 'btn-admin--primary');
      btnActionConfirm.style.background = '';
      btnActionConfirm.style.color = '';
    });
  }

  if (btnActionCancel) {
    btnActionCancel.addEventListener('click', () => {
      // Go back to view state
      viewState.hidden = false;
      actionState.hidden = true;
    });
  }

  if (reasonInput) {
    reasonInput.addEventListener('input', () => {
      btnActionConfirm.disabled = reasonInput.value.trim().length === 0;
    });
  }

  if (btnActionConfirm) {
    btnActionConfirm.addEventListener('click', () => {
      if (btnActionConfirm.disabled) return;
      
      // Execute mock action
      if (currentActionType === 'suspend') {
        currentManager.accountStatus = 'Suspended';
      } else if (currentActionType === 'warning') {
        currentManager.accountStatus = 'Warned';
        currentManager.warnings = (currentManager.warnings || 0) + 1;
      }
      
      // Fake API delay
      const originalText = btnActionConfirm.textContent;
      btnActionConfirm.textContent = 'Processing...';
      setTimeout(() => {
        btnActionConfirm.textContent = originalText;
        closeModal();
        renderManagers();
      }, 600);
    });
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
if (filterStatus) filterStatus.addEventListener('change', applyFilters);

document.addEventListener('DOMContentLoaded', () => {
  renderManagers();
  
  const btnPrev = document.querySelector('.btn-prev');
  const btnNext = document.querySelector('.btn-next');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderManagers();
      }
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const totalPages = Math.ceil(managersData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderManagers();
      }
    });
  }
});


