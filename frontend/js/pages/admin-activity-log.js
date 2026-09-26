import '../components/admin-sidebar.js';
import { mockActivities } from '../data/admin.js';

let currentData = [...mockActivities];
let currentPage = 1;
const itemsPerPage = 6;

const tbody = document.getElementById('tableBody');
const tpl = document.getElementById('tpl-activity-row');
const emptyState = document.getElementById('emptyState');
const resultCount = document.getElementById('resultCount');

const modal = document.getElementById('actionModal');
const btnClose = modal.querySelector('.admin-modal__close');
const btnCancel = document.getElementById('btnCancel');

function renderTable(data) {
  tbody.innerHTML = '';
  
  if (data.length === 0) {
    emptyState.removeAttribute('hidden');
    tbody.closest('table').setAttribute('hidden', '');
    updatePagination(0, data.length);
  } else {
    emptyState.setAttribute('hidden', '');
    tbody.closest('table').removeAttribute('hidden');
    
    const totalPages = Math.ceil(data.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = data.slice(startIndex, endIndex);

    pageData.forEach(act => {
      const clone = tpl.content.cloneNode(true);
      
      const tr = clone.querySelector('tr');
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => openActionModal(act));

      clone.querySelector('.td-activity-id').textContent = act.activityId;
      clone.querySelector('.td-actor-role').textContent = act.actorRole;
      clone.querySelector('.td-actor-name').textContent = act.actorName;
      clone.querySelector('.td-action-type').textContent = act.actionType;
      clone.querySelector('.td-target').textContent = act.targetId;
      
      const badgeResult = clone.querySelector('.badge-result');
      badgeResult.textContent = act.result;
      badgeResult.className = `badge ${act.resultClass} badge-result`;
      
      clone.querySelector('.td-date').textContent = act.createdAt;
      
      const actionBtn = clone.querySelector('.td-action-btn');
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openActionModal(act);
      });
      
      tbody.appendChild(clone);
    });
    
    updatePagination(totalPages, data.length);
  }
}

function updatePagination(totalPages, totalItems) {
  const info = document.querySelector('.admin-pagination__info');
  const btnPrev = document.querySelector('.btn-prev');
  const btnNext = document.querySelector('.btn-next');
  
  if (resultCount) {
    resultCount.textContent = `${totalItems} activit${totalItems !== 1 ? 'ies' : 'y'}`;
  }

  if (!info || !btnPrev || !btnNext) return;

  if (totalPages === 0) {
    info.textContent = `Trang 0 / 0`;
    btnPrev.disabled = true;
    btnNext.disabled = true;
    return;
  }

  info.textContent = `Trang  / `;
  btnPrev.disabled = currentPage === 1;
  btnNext.disabled = currentPage === totalPages;
}

function openActionModal(act) {
  document.getElementById('modalActivityId').textContent = act.activityId;
  document.getElementById('modalActivityDate').textContent = act.createdAt;
  
  const resultBadge = document.getElementById('modalActivityResult');
  resultBadge.textContent = act.result;
  resultBadge.className = `badge ${act.resultClass}`;
  
  document.getElementById('modalActivityAction').textContent = act.actionType;
  document.getElementById('modalActivityDetails').textContent = act.details || 'No additional details provided.';
  
  document.getElementById('modalActorName').textContent = act.actorName;
  document.getElementById('modalActorRole').textContent = act.actorRole;
  
  document.getElementById('modalTarget').textContent = act.targetId;
  
  modal.showModal();
}

function closeActionModal() {
  modal.close();
}

if(btnClose) btnClose.addEventListener('click', closeActionModal);
if(btnCancel) btnCancel.addEventListener('click', closeActionModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});

const inputs = ['searchInput', 'filterRole', 'filterAction', 'filterResult'];
inputs.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', applyFilters);
    el.addEventListener('change', applyFilters);
  }
});

function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const role = document.getElementById('filterRole').value;
  const action = document.getElementById('filterAction').value;
  const result = document.getElementById('filterResult').value;
  
  currentData = mockActivities.filter(act => {
    const matchQ = !q || 
      act.activityId.toLowerCase().includes(q) || 
      act.actorName.toLowerCase().includes(q) || 
      act.targetId.toLowerCase().includes(q) ||
      act.actionType.toLowerCase().includes(q);
    const matchRole = role === 'all' || act.actorRole === role;
    const matchAction = action === 'all' || act.actionType === action;
    const matchResult = result === 'all' || act.result === result;
    return matchQ && matchRole && matchAction && matchResult;
  });
  
  currentPage = 1;
  renderTable(currentData);
}

document.addEventListener('DOMContentLoaded', () => {
  renderTable(currentData);
  
  const btnPrev = document.querySelector('.btn-prev');
  const btnNext = document.querySelector('.btn-next');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable(currentData);
      }
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const totalPages = Math.ceil(currentData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderTable(currentData);
      }
    });
  }
});

