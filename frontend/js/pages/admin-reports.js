import '../components/admin-sidebar.js';
import { mockReports } from '../data/admin.js';

let currentData = [...mockReports];
let currentPage = 1;
const itemsPerPage = 6;

const tbody = document.getElementById('tableBody');
const tpl = document.getElementById('tpl-report-row');
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

    pageData.forEach(rep => {
      const clone = tpl.content.cloneNode(true);
      
      const tr = clone.querySelector('tr');
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => openActionModal(rep));

      clone.querySelector('.td-report-id').textContent = rep.reportId;
      clone.querySelector('.td-reporter').innerHTML = `<strong>${rep.reporterName}</strong><br><small style="color:var(--c-muted)">${rep.reporterId}</small>`;
      clone.querySelector('.td-target').textContent = `${rep.reportedEntityType} - ${rep.reportedEntityId}`;
      clone.querySelector('.td-type').textContent = rep.reportType;
      
      const badgePriority = clone.querySelector('.badge-priority');
      badgePriority.textContent = rep.priority;
      badgePriority.className = `badge ${rep.priorityClass} badge-priority`;
      
      const badgeStatus = clone.querySelector('.badge-status');
      badgeStatus.textContent = rep.reportStatus;
      badgeStatus.className = `badge ${rep.statusClass} badge-status`;
      
      clone.querySelector('.td-date').textContent = rep.submittedAt;
      
      const actionBtn = clone.querySelector('.td-action-btn');
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openActionModal(rep);
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
    resultCount.textContent = `${totalItems} report${totalItems !== 1 ? 's' : ''}`;
  }

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

function openActionModal(rep) {
  document.getElementById('modalReportId').textContent = rep.reportId;
  document.getElementById('modalReportDate').textContent = rep.submittedAt;
  
  const statusBadge = document.getElementById('modalReportStatus');
  statusBadge.textContent = rep.reportStatus;
  statusBadge.className = `badge ${rep.statusClass}`;
  
  const priorityBadge = document.getElementById('modalReportPriority');
  priorityBadge.textContent = rep.priority;
  priorityBadge.className = `badge ${rep.priorityClass}`;
  
  document.getElementById('modalReportType').textContent = rep.reportType;
  document.getElementById('modalReportTarget').textContent = `${rep.reportedEntityType} - ${rep.reportedEntityId}`;
  
  document.getElementById('modalReporterName').textContent = rep.reporterName;
  document.getElementById('modalReporterId').textContent = rep.reporterId;
  
  document.getElementById('modalSummary').textContent = rep.summary;
  document.getElementById('modalDescription').textContent = rep.description;
  
  const notesContainer = document.getElementById('modalNotes');
  notesContainer.innerHTML = '';
  if (rep.investigationNotes && rep.investigationNotes.length > 0) {
    rep.investigationNotes.forEach(note => {
      notesContainer.innerHTML += `<div style="font-size: 0.875rem; margin-bottom: 8px;"><strong>${note.author}</strong> (${note.date}): ${note.text}</div>`;
    });
  } else {
    notesContainer.innerHTML = `<span style="font-size: 0.875rem; color: var(--c-muted);">No investigation notes yet.</span>`;
  }
  
  modal.showModal();
}

function closeActionModal() {
  modal.close();
}

btnClose.addEventListener('click', closeActionModal);
btnCancel.addEventListener('click', closeActionModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});

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
  
  currentData = mockReports.filter(rep => {
    const matchQ = !q || 
      rep.reportId.toLowerCase().includes(q) || 
      rep.reporterName.toLowerCase().includes(q) || 
      rep.summary.toLowerCase().includes(q);
    const matchType = type === 'all' || rep.reportType === type;
    const matchStatus = status === 'all' || rep.reportStatus === status;
    const matchPriority = priority === 'all' || rep.priority === priority;
    return matchQ && matchType && matchStatus && matchPriority;
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
