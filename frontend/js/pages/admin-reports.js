import '../components/admin-sidebar.js';
import { mockReports } from '../data/admin.js';

let currentData = [...mockReports];

const tbody = document.getElementById('tableBody');
const tpl = document.getElementById('tpl-report-row');
const emptyState = document.getElementById('emptyState');
const resultCount = document.getElementById('resultCount');

// Modal Elements
const modal = document.getElementById('actionModal');
const btnClose = modal.querySelector('.admin-modal__close');
const btnCancel = document.getElementById('btnCancel');
const btnConfirm = document.getElementById('btnConfirm');
const adminActionSelect = document.getElementById('adminAction');
const reasonGroup = document.getElementById('reasonGroup');
const actionReasonInput = document.getElementById('actionReason');
const modalAlert = document.getElementById('modalAlert');

let selectedReport = null;

function renderTable(data) {
  tbody.innerHTML = '';
  
  if (data.length === 0) {
    emptyState.removeAttribute('hidden');
    tbody.closest('table').setAttribute('hidden', '');
  } else {
    emptyState.setAttribute('hidden', '');
    tbody.closest('table').removeAttribute('hidden');
    
    data.forEach(report => {
      const clone = tpl.content.cloneNode(true);
      clone.querySelector('.td-report-id').textContent = report.reportId;
      clone.querySelector('.td-report-summary').textContent = report.summary;
      clone.querySelector('.td-report-type').textContent = report.reportType;
      clone.querySelector('.td-reporter').textContent = report.reporterName;
      
      const badgePriority = clone.querySelector('.badge-priority');
      badgePriority.textContent = report.priority;
      badgePriority.className = \adge \ badge-priority\;
      
      const badgeStatus = clone.querySelector('.badge-status');
      badgeStatus.textContent = report.reportStatus;
      badgeStatus.className = \adge \ badge-status\;
      
      clone.querySelector('.td-date').textContent = report.submittedAt;
      
      const actionBtn = clone.querySelector('.td-action-btn');
      actionBtn.addEventListener('click', () => openActionModal(report));
      
      tbody.appendChild(clone);
    });
  }
  
  resultCount.textContent = \\ report\\;
}

function openActionModal(report) {
  selectedReport = report;
  
  // Populate UI
  document.getElementById('modalReportId').textContent = report.reportId;
  const statusBadge = document.getElementById('modalReportStatus');
  statusBadge.textContent = report.reportStatus;
  statusBadge.className = \adge \\;
  
  const priorityBadge = document.getElementById('modalReportPriority');
  priorityBadge.textContent = report.priority;
  priorityBadge.className = \adge \\;
  
  document.getElementById('modalReportSummary').textContent = report.summary;
  document.getElementById('modalReportDesc').textContent = report.description;
  
  document.getElementById('modalReporterName').textContent = report.reporterName;
  document.getElementById('modalReporterId').textContent = report.reporterId;
  
  document.getElementById('modalTargetType').textContent = report.reportedEntityType;
  document.getElementById('modalTargetId').textContent = report.reportedEntityId;
  
  const notesList = document.getElementById('modalNotesList');
  notesList.innerHTML = '';
  if (report.investigationNotes && report.investigationNotes.length > 0) {
    report.investigationNotes.forEach(note => {
      const li = document.createElement('li');
      li.textContent = note;
      notesList.appendChild(li);
    });
  } else {
    notesList.innerHTML = '<li>No investigation notes yet.</li>';
  }
  
  // Reset Form
  adminActionSelect.value = '';
  actionReasonInput.value = '';
  reasonGroup.setAttribute('hidden', '');
  btnConfirm.disabled = true;
  btnConfirm.textContent = 'Apply Action';
  modalAlert.setAttribute('hidden', '');
  modalAlert.className = 'admin-alert';
  
  modal.showModal();
}

function closeActionModal() {
  modal.close();
  selectedReport = null;
}

// Bind Events
btnClose.addEventListener('click', closeActionModal);
btnCancel.addEventListener('click', closeActionModal);

adminActionSelect.addEventListener('change', (e) => {
  const val = e.target.value;
  if (val) {
    reasonGroup.removeAttribute('hidden');
    checkFormValidity();
  } else {
    reasonGroup.setAttribute('hidden', '');
    btnConfirm.disabled = true;
  }
});

actionReasonInput.addEventListener('input', checkFormValidity);

function checkFormValidity() {
  const action = adminActionSelect.value;
  const reason = actionReasonInput.value.trim();
  if (action && reason.length > 0) {
    btnConfirm.disabled = false;
  } else {
    btnConfirm.disabled = true;
  }
}

btnConfirm.addEventListener('click', () => {
  if (btnConfirm.disabled) return;
  
  btnConfirm.disabled = true;
  btnConfirm.textContent = 'Processing...';
  adminActionSelect.disabled = true;
  actionReasonInput.disabled = true;
  
  // Simulate API Call
  setTimeout(() => {
    const action = adminActionSelect.value;
    const reason = actionReasonInput.value.trim();
    
    // Update local state mock
    if (action === 'note' || action === 'investigate') {
      if (!selectedReport.investigationNotes) selectedReport.investigationNotes = [];
      selectedReport.investigationNotes.push(reason);
      if (action === 'investigate' && selectedReport.reportStatus === 'Submitted') {
        selectedReport.reportStatus = 'Under review';
        selectedReport.statusClass = 'badge--review';
      }
    } else if (action === 'resolve') {
      selectedReport.reportStatus = 'Resolved';
      selectedReport.statusClass = 'badge--success';
      selectedReport.investigationNotes.push(\Resolution: \\);
    } else if (action === 'dismiss') {
      selectedReport.reportStatus = 'Dismissed';
      selectedReport.statusClass = 'badge--muted';
      selectedReport.investigationNotes.push(\Dismissed: \\);
    }
    
    // Refresh table
    renderTable(currentData);
    
    // Show success
    modalAlert.removeAttribute('hidden');
    modalAlert.className = 'admin-alert admin-alert--success';
    modalAlert.querySelector('.admin-alert__text').textContent = 'Action applied successfully.';
    
    setTimeout(() => {
      closeActionModal();
      adminActionSelect.disabled = false;
      actionReasonInput.disabled = false;
    }, 1500);
    
  }, 800);
});

// Simple filtering logic
const inputs = ['searchInput', 'filterType', 'filterStatus', 'filterPriority'];
inputs.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', applyFilters);
    el.addEventListener('change', applyFilters);
  }
});

function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const status = document.getElementById('filterStatus').value;
  const priority = document.getElementById('filterPriority').value;
  
  currentData = mockReports.filter(report => {
    const matchQ = !q || report.reportId.toLowerCase().includes(q) || report.summary.toLowerCase().includes(q) || report.reporterName.toLowerCase().includes(q);
    const matchType = type === 'all' || report.reportType === type;
    const matchStatus = status === 'all' || report.reportStatus === status;
    const matchPriority = priority === 'all' || report.priority === priority;
    return matchQ && matchType && matchStatus && matchPriority;
  });
  
  renderTable(currentData);
}

document.addEventListener('DOMContentLoaded', () => {
  renderTable(currentData);
});
