import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { getAccount, listManagers, warnManager } from '../services/admin-service.js';
import { initializeState } from '../services/storage-service.js';

const STATUS_LABELS = { active: 'Đang hoạt động', suspended: 'Đang đình chỉ' };
let currentAdmin;
let selectedManager;

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value)) : 'Chưa có';
}

function renderDetail(manager) {
  const detail = document.querySelector('#manager-detail');
  const fields = [['Mã tài khoản', manager.id], ['Tên đơn vị', manager.displayName], ['Email', manager.email], ['Số điện thoại', manager.phone || 'Chưa cập nhật'], ['Số sân quản lý', manager.adminMeta?.managedPitchCount ?? 0], ['Lịch đã xác nhận', manager.adminMeta?.confirmedBookingCount ?? 0], ['Số cảnh báo', manager.adminMeta?.warningCount ?? 0], ['Ngày tạo', formatDate(manager.adminMeta?.createdAt)], ['Trạng thái', STATUS_LABELS[manager.status] ?? manager.status]];
  detail.replaceChildren();
  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = String(value);
    detail.append(dt, dd);
  });
}

async function openManager(managerId) {
  const manager = await getAccount(managerId, 'manager');
  if (!manager) return;
  selectedManager = manager;
  renderDetail(manager);
  document.querySelector('#manager-reason').value = '';
  document.querySelector('#manager-confirmed').checked = false;
  document.querySelector('#manager-feedback').textContent = '';
  document.querySelector('#manager-dialog').showModal();
}

async function renderManagers() {
  const managers = await listManagers({ query: document.querySelector('#manager-query').value, status: document.querySelector('#manager-status').value });
  const rows = document.querySelector('#manager-rows');
  const template = document.querySelector('#tpl-manager-row');
  rows.replaceChildren();
  managers.forEach(manager => {
    const row = template.content.cloneNode(true);
    row.querySelector('.admin-pitch-managers-page__name').textContent = manager.displayName;
    row.querySelector('.admin-pitch-managers-page__id').textContent = manager.id;
    row.querySelector('.admin-pitch-managers-page__email').textContent = manager.email;
    row.querySelector('.admin-pitch-managers-page__phone').textContent = manager.phone || 'Chưa có số điện thoại';
    row.querySelector('.admin-pitch-managers-page__pitch-count').textContent = String(manager.adminMeta?.managedPitchCount ?? 0);
    row.querySelector('.admin-pitch-managers-page__booking-count').textContent = String(manager.adminMeta?.confirmedBookingCount ?? 0);
    const badge = row.querySelector('.admin-pitch-managers-page__status');
    badge.textContent = STATUS_LABELS[manager.status] ?? manager.status;
    badge.dataset.status = manager.status;
    row.querySelector('.admin-pitch-managers-page__open').addEventListener('click', () => openManager(manager.id));
    rows.append(row);
  });
  document.querySelector('#manager-count').textContent = `${managers.length} tài khoản`;
  document.querySelector('#manager-empty').hidden = managers.length > 0;
}

async function handleWarning(event) {
  event.preventDefault();
  const feedback = document.querySelector('#manager-feedback');
  try {
    selectedManager = await warnManager({ managerId: selectedManager.id, reason: document.querySelector('#manager-reason').value, confirmed: document.querySelector('#manager-confirmed').checked }, currentAdmin);
    renderDetail(selectedManager);
    document.querySelector('#manager-reason').value = '';
    document.querySelector('#manager-confirmed').checked = false;
    feedback.textContent = 'Đã ghi nhận cảnh báo.';
    await renderManagers();
  } catch (error) {
    feedback.textContent = error.message;
  }
}

async function init() {
  await initializeState();
  currentAdmin = requireRole([ROLES.ADMIN]);
  if (!currentAdmin) return;
  const filterForm = document.querySelector('#manager-filter-form');
  filterForm.addEventListener('input', renderManagers);
  filterForm.addEventListener('reset', () => requestAnimationFrame(renderManagers));
  document.querySelector('#manager-warning-form').addEventListener('submit', handleWarning);
  await renderManagers();
  const managerId = new URLSearchParams(location.search).get('managerId');
  if (managerId) openManager(managerId);
}

init();
