import '../components/admin-sidebar.js';
import { mockManagers } from '../data/admin.js';

let managersData = [...mockManagers];
let currentPage = 1;
const itemsPerPage = 6;


const searchInput = document.getElementById('manager-search');
const filterStatus = document.getElementById('filter-status');

const tbody = document.getElementById('managers-tbody');
const tpl = document.getElementById('tpl-manager-row');
const modal = document.getElementById('action-modal');
const modalClose = document.getElementById('modal-close');
const btnCancel = document.getElementById('modal-cancel');
const btnConfirm = document.getElementById('modal-confirm');
const reasonInput = document.getElementById('admin-reason');

function renderManagers() {
  tbody.innerHTML = '';
  document.getElementById('managers-count').textContent = `${managersData.length} chủ sân`;

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
    clone.querySelector('.td-pitches').textContent = mgr.managedPitchCount;
    // mock some booking & balance data as the template has them
    clone.querySelector('.td-bookings').textContent = mgr.activeBookingCount || Math.floor(Math.random() * 50);
    clone.querySelector('.td-balance').textContent = mgr.simulatedBalance || '$120.00';

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
    info.textContent = `Trang 0 / 0`;
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
    badge.className = 'badge ' + (mgr.accountStatus === 'Hoạt động' ? 'badge--success' : (mgr.accountStatus === 'Cảnh báo' ? 'badge--warning' : 'badge--danger'));
    
    document.getElementById('modal-view-subtitle').textContent = mgr.email + ' · ' + mgr.id;
    
    document.getElementById('modal-view-pitches').textContent = mgr.managedPitchCount || 0;
    document.getElementById('modal-view-bookings').textContent = mgr.activeBookingCount || 0;
    document.getElementById('modal-view-warnings').textContent = mgr.warnings || 0;
    document.getElementById('modal-view-balance').textContent = mgr.simulatedBalance || '$0';

    // Show view state, hide action state
    viewState.hidden = false;
    actionState.hidden = true;
    
    modal.showModal();
  }

  function closeModal() {
    modal.close();
    currentManager = null;
    if(reasonInput) reasonInput.value = '';
    if(btnActionConfirm) btnActionConfirm.disabled = true;
  }

  
  if(modalClose) modalClose.addEventListener('click', closeModal);
  if(modal) modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });


  function switchToActionState(action, title, effectsHtml, btnClass) {
    currentActionType = action;
    
    // Action State details
    document.getElementById('modal-action-title').textContent = title;
    
    document.getElementById('modal-action-name').textContent = currentManager.fullName || currentManager.name;
    const badge = document.getElementById('modal-action-badge');
    badge.textContent = currentManager.accountStatus;
    badge.className = 'badge ' + (currentManager.accountStatus === 'Hoạt động' ? 'badge--success' : (currentManager.accountStatus === 'Cảnh báo' ? 'badge--warning' : 'badge--danger'));
    
    document.getElementById('modal-action-subtitle').textContent = currentManager.email + ' · ' + currentManager.id;
    
    document.getElementById('modal-action-effects').innerHTML = effectsHtml;
    
    btnActionConfirm.textContent = title;
    btnActionConfirm.className = 'btn-admin ' + btnClass;
    
    reasonInput.value = '';
    btnActionConfirm.disabled = true;

    viewState.hidden = true;
    actionState.hidden = false;
  }


function applyFilters() {
  const query = searchInput.value.toLowerCase();
  const status = filterStatus.value;

  managersData = mockManagers.filter(m => {
    const matchQ = !query || 
      m.fullName.toLowerCase().includes(query) || 
      m.email.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query);
    const matchS = status === 'all' || m.accountStatus.toLowerCase() === status;
    return matchQ && matchS;
  });
  
  currentPage = 1;
  renderManagers();
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


