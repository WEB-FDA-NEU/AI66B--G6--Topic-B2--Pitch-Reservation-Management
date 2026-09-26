import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { deleteDraft, getContent, listContents, saveContent } from '../services/content-audit-service.js';
import { initializeState } from '../services/storage-service.js';

const TYPE_LABELS = { banner: 'Banner', announcement: 'Thông báo' };
const STATUS_LABELS = { draft: 'Bản nháp', scheduled: 'Đã lên lịch', published: 'Đang xuất bản', unpublished: 'Đã gỡ' };
const AUDIENCE_LABELS = { public: 'Công khai', authenticated: 'Đã đăng nhập', customer: 'Khách hàng', manager: 'Chủ sân' };
let currentAdmin;
let selectedContent;

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
}

async function renderContents() {
  const contents = await listContents({ query: document.querySelector('#content-query').value, contentType: document.querySelector('#content-type-filter').value, status: document.querySelector('#content-status-filter').value });
  const rows = document.querySelector('#content-rows');
  const template = document.querySelector('#tpl-content-row');
  rows.replaceChildren();
  contents.forEach(content => {
    const row = template.content.cloneNode(true);
    row.querySelector('.admin-content-page__title').textContent = content.title;
    row.querySelector('.admin-content-page__id').textContent = content.id;
    row.querySelector('.admin-content-page__type').textContent = TYPE_LABELS[content.contentType] ?? content.contentType;
    row.querySelector('.admin-content-page__audience').textContent = AUDIENCE_LABELS[content.audience] ?? content.audience;
    const start = row.querySelector('.admin-content-page__start');
    start.dateTime = content.startsAt;
    start.textContent = formatDate(content.startsAt);
    const end = row.querySelector('.admin-content-page__end');
    end.dateTime = content.endsAt;
    end.textContent = formatDate(content.endsAt);
    const status = row.querySelector('.admin-content-page__status');
    status.textContent = STATUS_LABELS[content.status] ?? content.status;
    status.dataset.status = content.status;
    row.querySelector('.admin-content-page__edit').addEventListener('click', () => openContent(content.id));
    rows.append(row);
  });
  document.querySelector('#content-count').textContent = `${contents.length} nội dung`;
  document.querySelector('#content-empty').hidden = contents.length > 0;
}

function resetContentForm() {
  selectedContent = null;
  const form = document.querySelector('#content-form');
  form.reset();
  document.querySelector('#content-id').value = '';
  document.querySelector('#content-feedback').textContent = '';
  document.querySelector('#delete-content').hidden = true;
  document.querySelector('#content-dialog-title').textContent = 'Tạo nội dung';
}

async function openContent(contentId) {
  const content = await getContent(contentId);
  if (!content) return;
  selectedContent = content;
  document.querySelector('#content-id').value = content.id;
  document.querySelector('#content-type').value = content.contentType;
  document.querySelector('#content-title').value = content.title;
  document.querySelector('#content-body').value = content.body;
  document.querySelector('#content-audience').value = content.audience;
  document.querySelector('#content-status').value = content.status;
  document.querySelector('#content-start').value = content.startsAt;
  document.querySelector('#content-end').value = content.endsAt;
  document.querySelector('#content-audit-reason').value = '';
  document.querySelector('#content-feedback').textContent = '';
  document.querySelector('#delete-content').hidden = content.status !== 'draft';
  document.querySelector('#content-dialog-title').textContent = `Chỉnh sửa ${content.id}`;
  document.querySelector('#content-dialog').showModal();
}

async function handleSave(event) {
  event.preventDefault();
  const feedback = document.querySelector('#content-feedback');
  const data = new FormData(event.currentTarget);
  try {
    selectedContent = await saveContent(Object.fromEntries(data), currentAdmin);
    feedback.textContent = 'Đã lưu nội dung.';
    document.querySelector('#content-id').value = selectedContent.id;
    document.querySelector('#delete-content').hidden = selectedContent.status !== 'draft';
    await renderContents();
  } catch (error) {
    feedback.textContent = error.message;
  }
}

async function handleDelete(event) {
  event.preventDefault();
  const feedback = document.querySelector('#delete-feedback');
  try {
    await deleteDraft(selectedContent.id, document.querySelector('#delete-reason').value, currentAdmin);
    document.querySelector('#delete-dialog').close();
    document.querySelector('#content-dialog').close();
    await renderContents();
  } catch (error) {
    feedback.textContent = error.message;
  }
}

async function init() {
  await initializeState();
  currentAdmin = requireRole([ROLES.ADMIN]);
  if (!currentAdmin) return;
  const filterForm = document.querySelector('#content-filter-form');
  filterForm.addEventListener('input', renderContents);
  filterForm.addEventListener('reset', () => requestAnimationFrame(renderContents));
  document.querySelector('#create-content').addEventListener('click', () => { resetContentForm(); document.querySelector('#content-dialog').showModal(); });
  document.querySelector('#content-form').addEventListener('submit', handleSave);
  document.querySelector('#delete-content').addEventListener('click', () => { document.querySelector('#delete-reason').value = ''; document.querySelector('#delete-feedback').textContent = ''; document.querySelector('#delete-dialog').showModal(); });
  document.querySelector('#cancel-delete').addEventListener('click', () => document.querySelector('#delete-dialog').close());
  document.querySelector('#delete-form').addEventListener('submit', handleDelete);
  await renderContents();
  const contentId = new URLSearchParams(location.search).get('contentId');
  if (contentId) openContent(contentId);
}

init();
