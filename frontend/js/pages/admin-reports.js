import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { getReport, listReports, updateReportStatus } from '../services/admin-service.js';
import { initializeState } from '../services/storage-service.js';

const STATUS_LABELS = { submitted: 'Đã gửi', 'under-review': 'Đang rà soát', resolved: 'Đã xử lý', dismissed: 'Đã bác bỏ' };
const PRIORITY_LABELS = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
const TARGET_LABELS = { user: 'Người dùng', manager: 'Chủ sân', pitch: 'Sân', booking: 'Đặt sân' };
let currentAdmin;
let selectedReport;

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function renderReportDetail(report) {
  const detail = document.querySelector('#report-detail');
  const fields = [['Mã báo cáo', report.id], ['Người gửi', `${report.reporterName} (${report.reporterId})`], ['Đối tượng', `${TARGET_LABELS[report.targetType] ?? report.targetType} · ${report.targetId}`], ['Ưu tiên', PRIORITY_LABELS[report.priority] ?? report.priority], ['Trạng thái', STATUS_LABELS[report.status] ?? report.status], ['Ngày gửi', formatDate(report.submittedAt)]];
  detail.replaceChildren();
  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    detail.append(dt, dd);
  });
  document.querySelector('#report-description').textContent = report.description;
  const notes = document.querySelector('#report-notes');
  notes.replaceChildren();
  (report.notes ?? []).forEach(note => {
    const item = document.createElement('li');
    item.textContent = `${note.authorName} · ${formatDate(note.createdAt)} — ${note.text}`;
    notes.append(item);
  });
  if (!report.notes?.length) {
    const item = document.createElement('li');
    item.textContent = 'Chưa có ghi chú xử lý.';
    notes.append(item);
  }
  const transitions = report.status === 'submitted'
    ? [['under-review', 'Bắt đầu rà soát']]
    : report.status === 'under-review'
      ? [['resolved', 'Đánh dấu đã xử lý'], ['dismissed', 'Bác bỏ báo cáo']]
      : [];
  const select = document.querySelector('#report-next-status');
  select.replaceChildren(...transitions.map(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }));
  document.querySelector('#report-submit').disabled = transitions.length === 0;
  select.disabled = transitions.length === 0;
  document.querySelector('#report-reason').disabled = transitions.length === 0;
  document.querySelector('#report-confirmed').disabled = transitions.length === 0;
}

async function openReport(reportId) {
  const report = await getReport(reportId);
  if (!report) return;
  selectedReport = report;
  document.querySelector('#report-reason').value = '';
  document.querySelector('#report-confirmed').checked = false;
  document.querySelector('#report-feedback').textContent = '';
  renderReportDetail(report);
  document.querySelector('#report-dialog').showModal();
}

async function renderReports() {
  const reports = await listReports({ query: document.querySelector('#report-query').value, status: document.querySelector('#report-status').value, priority: document.querySelector('#report-priority').value, targetType: document.querySelector('#report-target-type').value });
  const rows = document.querySelector('#report-rows');
  const template = document.querySelector('#tpl-report-row');
  rows.replaceChildren();
  reports.forEach(report => {
    const row = template.content.cloneNode(true);
    row.querySelector('.admin-reports-page__summary').textContent = report.summary;
    row.querySelector('.admin-reports-page__id').textContent = report.id;
    row.querySelector('.admin-reports-page__reporter').textContent = report.reporterName;
    row.querySelector('.admin-reports-page__target').textContent = `${TARGET_LABELS[report.targetType] ?? report.targetType} · ${report.targetId}`;
    const priority = row.querySelector('.admin-reports-page__priority');
    priority.textContent = PRIORITY_LABELS[report.priority] ?? report.priority;
    priority.dataset.priority = report.priority;
    const status = row.querySelector('.admin-reports-page__status');
    status.textContent = STATUS_LABELS[report.status] ?? report.status;
    status.dataset.status = report.status;
    const date = row.querySelector('.admin-reports-page__date');
    date.dateTime = report.submittedAt;
    date.textContent = formatDate(report.submittedAt);
    row.querySelector('.admin-reports-page__open').addEventListener('click', () => openReport(report.id));
    rows.append(row);
  });
  document.querySelector('#report-count').textContent = `${reports.length} báo cáo`;
  document.querySelector('#report-empty').hidden = reports.length > 0;
}

async function handleReportAction(event) {
  event.preventDefault();
  const feedback = document.querySelector('#report-feedback');
  try {
    selectedReport = await updateReportStatus({ reportId: selectedReport.id, status: document.querySelector('#report-next-status').value, reason: document.querySelector('#report-reason').value, confirmed: document.querySelector('#report-confirmed').checked }, currentAdmin);
    document.querySelector('#report-reason').value = '';
    document.querySelector('#report-confirmed').checked = false;
    feedback.textContent = 'Đã lưu kết quả xử lý.';
    renderReportDetail(selectedReport);
    await renderReports();
  } catch (error) {
    feedback.textContent = error.message;
  }
}

async function init() {
  await initializeState();
  currentAdmin = requireRole([ROLES.ADMIN]);
  if (!currentAdmin) return;
  const filterForm = document.querySelector('#report-filter-form');
  filterForm.addEventListener('input', renderReports);
  filterForm.addEventListener('reset', () => requestAnimationFrame(renderReports));
  document.querySelector('#report-action-form').addEventListener('submit', handleReportAction);
  await renderReports();
  const reportId = new URLSearchParams(location.search).get('reportId');
  if (reportId) openReport(reportId);
}

init();
