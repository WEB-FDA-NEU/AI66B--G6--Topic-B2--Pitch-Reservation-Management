import '../components/admin-sidebar.js';
import { mockActivities } from '../data/admin.js';

let currentData = [...mockActivities];

const tbody = document.getElementById('tableBody');
const tpl = document.getElementById('tpl-activity-row');
const emptyState = document.getElementById('emptyState');
const resultCount = document.getElementById('resultCount');

// Modal Elements
const modal = document.getElementById('actionModal');
const btnClose = modal.querySelector('.admin-modal__close');
const btnCancel = document.getElementById('btnCancel');

function renderTable(data) {
  tbody.innerHTML = '';
  
  if (data.length === 0) {
    emptyState.removeAttribute('hidden');
    tbody.closest('table').setAttribute('hidden', '');
  } else {
    emptyState.setAttribute('hidden', '');
    tbody.closest('table').removeAttribute('hidden');
    
    data.forEach(act => {
      const clone = tpl.content.cloneNode(true);
      clone.querySelector('.td-activity-id').textContent = act.activityId;
      clone.querySelector('.td-actor-role').textContent = act.actorRole;
      clone.querySelector('.td-actor-name').textContent = act.actorName;
      clone.querySelector('.td-action-type').textContent = act.actionType;
      clone.querySelector('.td-target').textContent = act.targetId;
      
      const badgeResult = clone.querySelector('.badge-result');
      badgeResult.textContent = act.result;
      badgeResult.className = \adge \ badge-result\;
      
      clone.querySelector('.td-date').textContent = act.createdAt;
      
      const actionBtn = clone.querySelector('.td-action-btn');
      actionBtn.addEventListener('click', () => openActionModal(act));
      
      tbody.appendChild(clone);
    });
  }
  
  resultCount.textContent = \\ activit\\;
}

function openActionModal(act) {
  document.getElementById('modalActivityId').textContent = act.activityId;
  document.getElementById('modalActivityDate').textContent = act.createdAt;
  
  const resultBadge = document.getElementById('modalActivityResult');
  resultBadge.textContent = act.result;
  resultBadge.className = \adge \\;
  
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

// Bind Events
btnClose.addEventListener('click', closeActionModal);
btnCancel.addEventListener('click', closeActionModal);

// Simple filtering logic
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
  
  renderTable(currentData);
}

document.addEventListener('DOMContentLoaded', () => {
  renderTable(currentData);
});
