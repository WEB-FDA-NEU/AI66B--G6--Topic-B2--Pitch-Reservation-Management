import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { listActivities } from '../services/content-audit-service.js';
import { initializeState } from '../services/storage-service.js';

const RESULT_LABELS = { success: 'Thành công', failed: 'Thất bại' };
const ENTITY_LABELS = { user: 'Người dùng', manager: 'Chủ sân', report: 'Báo cáo', content: 'Nội dung', settings: 'Cài đặt' };
let activities = [];

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

function openActivity(activityId) {
  const activity = activities.find(item => item.id === activityId);
  if (!activity) return;
  const detail = document.querySelector('#activity-detail');
  const fields = [['Mã sự kiện', activity.id], ['Thời điểm', formatDate(activity.createdAt)], ['Người thực hiện', `${activity.actorName} (${activity.actorId})`], ['Hành động', activity.actionType], ['Đối tượng', `${ENTITY_LABELS[activity.entityType] ?? activity.entityType} · ${activity.entityId}`], ['Kết quả', RESULT_LABELS[activity.result] ?? activity.result], ['Lý do', activity.reason]];
  detail.replaceChildren();
  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    detail.append(dt, dd);
  });
  document.querySelector('#activity-dialog').showModal();
}

async function renderActivities(extraFilters = {}) {
  activities = await listActivities({ query: document.querySelector('#activity-query').value, entityType: document.querySelector('#activity-entity-type').value, result: document.querySelector('#activity-result').value, ...extraFilters });
  const rows = document.querySelector('#activity-rows');
  const template = document.querySelector('#tpl-activity-row');
  rows.replaceChildren();
  activities.forEach(activity => {
    const row = template.content.cloneNode(true);
    row.querySelector('.admin-activity-log-page__id').textContent = activity.id;
    const date = row.querySelector('.admin-activity-log-page__date');
    date.dateTime = activity.createdAt;
    date.textContent = formatDate(activity.createdAt);
    row.querySelector('.admin-activity-log-page__actor').textContent = activity.actorName;
    row.querySelector('.admin-activity-log-page__action').textContent = activity.actionType;
    row.querySelector('.admin-activity-log-page__entity').textContent = `${ENTITY_LABELS[activity.entityType] ?? activity.entityType} · ${activity.entityId}`;
    const status = row.querySelector('.admin-activity-log-page__status');
    status.textContent = RESULT_LABELS[activity.result] ?? activity.result;
    status.dataset.result = activity.result;
    row.querySelector('.admin-activity-log-page__open').addEventListener('click', () => openActivity(activity.id));
    rows.append(row);
  });
  document.querySelector('#activity-count').textContent = `${activities.length} sự kiện`;
  document.querySelector('#activity-empty').hidden = activities.length > 0;
}

async function init() {
  await initializeState();
  const admin = requireRole([ROLES.ADMIN]);
  if (!admin) return;
  const filterForm = document.querySelector('#activity-filter-form');
  filterForm.addEventListener('input', () => renderActivities());
  filterForm.addEventListener('reset', () => requestAnimationFrame(() => renderActivities()));
  const params = new URLSearchParams(location.search);
  const extraFilters = { activityId: params.get('activityId') || '', entityId: params.get('entityId') || '' };
  const entityType = params.get('entityType');
  if (entityType && document.querySelector(`#activity-entity-type option[value="${CSS.escape(entityType)}"]`)) document.querySelector('#activity-entity-type').value = entityType;
  await renderActivities(extraFilters);
  if (extraFilters.activityId) openActivity(extraFilters.activityId);
}

init();
