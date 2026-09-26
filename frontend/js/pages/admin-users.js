import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { applyCustomerAction, getAccount, listCustomers } from '../services/admin-service.js';
import { initializeState } from '../services/storage-service.js';

const STATUS_LABELS = { active: 'Đang hoạt động', suspended: 'Đang đình chỉ' };
let currentAdmin;
let selectedUser;

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value)) : 'Chưa có';
}

function setDetails(user) {
  const detail = document.querySelector('#user-detail');
  const fields = [['Mã tài khoản', user.id], ['Họ tên', user.displayName], ['Email', user.email], ['Số điện thoại', user.phone || 'Chưa cập nhật'], ['Ngày tạo', formatDate(user.adminMeta?.createdAt)], ['Hoạt động gần nhất', formatDate(user.adminMeta?.lastActivityAt)], ['Trạng thái', STATUS_LABELS[user.status] ?? user.status]];
  detail.replaceChildren();
  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = String(value);
    detail.append(dt, dd);
  });
}

function setActions(user) {
  const select = document.querySelector('#user-action');
  const options = [{ value: 'warn', label: 'Gửi cảnh báo' }];
  options.push(user.status === 'active' ? { value: 'suspend', label: 'Đình chỉ tài khoản' } : { value: 'restore', label: 'Khôi phục tài khoản' });
  select.replaceChildren(...options.map(option => {
    const element = document.createElement('option');
    element.value = option.value;
    element.textContent = option.label;
    return element;
  }));
}

async function openUser(userId) {
  const user = await getAccount(userId, 'customer');
  if (!user) return;
  selectedUser = user;
  document.querySelector('#user-action-feedback').textContent = '';
  document.querySelector('#user-reason').value = '';
  document.querySelector('#user-confirmed').checked = false;
  setDetails(user);
  setActions(user);
  document.querySelector('#user-dialog').showModal();
}

async function renderUsers() {
  const query = document.querySelector('#user-query').value;
  const status = document.querySelector('#user-status').value;
  const users = await listCustomers({ query, status });
  const rows = document.querySelector('#user-rows');
  const template = document.querySelector('#tpl-user-row');
  rows.replaceChildren();
  users.forEach(user => {
    const row = template.content.cloneNode(true);
    row.querySelector('.admin-users-page__name').textContent = user.displayName;
    row.querySelector('.admin-users-page__id').textContent = user.id;
    row.querySelector('.admin-users-page__email').textContent = user.email;
    row.querySelector('.admin-users-page__phone').textContent = user.phone || 'Chưa có số điện thoại';
    row.querySelector('.admin-users-page__bookings').textContent = String(user.adminMeta?.bookingCount ?? 0);
    row.querySelector('.admin-users-page__warnings').textContent = String(user.adminMeta?.warningCount ?? 0);
    const badge = row.querySelector('.admin-users-page__status');
    badge.textContent = STATUS_LABELS[user.status] ?? user.status;
    badge.dataset.status = user.status;
    row.querySelector('.admin-users-page__open').addEventListener('click', () => openUser(user.id));
    rows.append(row);
  });
  document.querySelector('#user-count').textContent = `${users.length} tài khoản`;
  document.querySelector('#user-empty').hidden = users.length > 0;
}

async function handleAction(event) {
  event.preventDefault();
  const feedback = document.querySelector('#user-action-feedback');
  try {
    selectedUser = await applyCustomerAction({ userId: selectedUser.id, action: document.querySelector('#user-action').value, reason: document.querySelector('#user-reason').value, confirmed: document.querySelector('#user-confirmed').checked }, currentAdmin);
    setDetails(selectedUser);
    setActions(selectedUser);
    document.querySelector('#user-reason').value = '';
    document.querySelector('#user-confirmed').checked = false;
    feedback.textContent = 'Đã cập nhật tài khoản.';
    await renderUsers();
  } catch (error) {
    feedback.textContent = error.message;
  }
}

async function init() {
  await initializeState();
  currentAdmin = requireRole([ROLES.ADMIN]);
  if (!currentAdmin) return;
  const filterForm = document.querySelector('#user-filter-form');
  filterForm.addEventListener('input', renderUsers);
  filterForm.addEventListener('reset', () => requestAnimationFrame(renderUsers));
  document.querySelector('#user-action-form').addEventListener('submit', handleAction);
  await renderUsers();
  const userId = new URLSearchParams(location.search).get('userId');
  if (userId) openUser(userId);
}

init();
