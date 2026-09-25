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

function openModal(mgr) {
  currentManager = mgr;
  document.getElementById('modal-manager-name').textContent = mgr.fullName;
  document.getElementById('modal-manager-status').textContent = mgr.accountStatus;
  
  const warningBox = document.getElementById('modal-warning-box');
  const warningText = document.getElementById('modal-warning-text');
  
  if (mgr.accountStatus === 'Suspended') {
    warningBox.style.background = '#e0f2fe';
    warningBox.style.color = '#0369a1';
    warningText.textContent = 'Restoring this manager will allow them to manage their assigned pitches again.';
    btnConfirm.textContent = 'Restore Manager';
    btnConfirm.className = 'btn-admin btn-admin--blue';
  } else {
    warningBox.style.background = '#ffebee';
    warningBox.style.color = '#c62828';
    warningText.textContent = 'Suspending this manager will revoke their access to modify pitches or respond to reports.';
    btnConfirm.textContent = 'Suspend Manager';
    btnConfirm.className = 'btn-admin btn-admin--danger';
  }

  if(reasonInput) {
    reasonInput.value = '';
  }
  if(btnConfirm) {
    btnConfirm.disabled = true;
  }
  
  modal.showModal();
}

function closeModal() {
  modal.close();
  currentManager = null;
}

if(modalClose) modalClose.addEventListener('click', closeModal);
if(btnCancel) btnCancel.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

if(reasonInput) {
  reasonInput.addEventListener('input', () => {
    btnConfirm.disabled = reasonInput.value.trim().length === 0;
  });
}

if(btnConfirm) {
  btnConfirm.addEventListener('click', () => {
    if (btnConfirm.disabled) return;
    
    if (currentManager.accountStatus === 'Suspended') {
      currentManager.accountStatus = 'Restored';
      currentManager.statusClass = 'badge--info';
    } else {
      currentManager.accountStatus = 'Suspended';
      currentManager.statusClass = 'badge--danger';
    }
    
    closeModal();
    renderManagers();
  });
}

// Search & Filter
const searchInput = document.getElementById('mgr-search');
const filterStatus = document.getElementById('filter-status');

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


