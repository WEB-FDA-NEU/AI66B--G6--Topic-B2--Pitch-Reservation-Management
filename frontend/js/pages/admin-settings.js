import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { getAdminSettings, updateAdminSettings } from '../services/content-audit-service.js';
import { initializeState } from '../services/storage-service.js';

let currentAdmin;

function fillForm(settings) {
  document.querySelector('#table-page-size').value = String(settings.tablePageSize ?? 10);
  document.querySelector('#activity-display').value = settings.activityDisplay ?? 'compact';
  document.querySelector('#default-report-priority').value = settings.defaultReportPriority ?? 'medium';
  document.querySelector('#require-decision-reason').checked = Boolean(settings.requireDecisionReason);
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.querySelector('#settings-feedback');
  const data = new FormData(form);
  const settings = await updateAdminSettings({
    tablePageSize: Number(data.get('tablePageSize')),
    activityDisplay: data.get('activityDisplay'),
    defaultReportPriority: data.get('defaultReportPriority'),
    requireDecisionReason: data.has('requireDecisionReason'),
  }, currentAdmin);
  fillForm(settings);
  feedback.textContent = 'Đã lưu cài đặt quản trị.';
}

async function init() {
  await initializeState();
  currentAdmin = requireRole([ROLES.ADMIN]);
  if (!currentAdmin) return;
  fillForm(await getAdminSettings());
  document.querySelector('#admin-settings-form').addEventListener('submit', handleSubmit);
}

init();
