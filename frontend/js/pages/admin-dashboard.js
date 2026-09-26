import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { getDashboardSummary } from '../services/admin-service.js';
import { listActivities } from '../services/content-audit-service.js';
import { initializeState } from '../services/storage-service.js';

const ACTION_LABELS = { 'user-warning': 'Cảnh báo người dùng', 'report-resolved': 'Hoàn tất báo cáo', 'content-published': 'Xuất bản nội dung' };

function setDefinitionList(container, items) {
  const list = document.createElement('dl');
  items.forEach(([term, value]) => {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = String(value);
    list.append(dt, dd);
  });
  container.replaceChildren(list);
}

function renderSummaryCards(summary) {
  const container = document.querySelector('#summary-grid');
  const template = document.querySelector('#tpl-summary-card');
  const cards = [
    ['Khách hàng', summary.customers.total, `${summary.customers.suspended} đang đình chỉ`],
    ['Quản lý sân', summary.managers.total, `${summary.managers.active} đang hoạt động`],
    ['Báo cáo', summary.reports.total, `${summary.reports.pending} cần xử lý`],
    ['Sân khả dụng', summary.pitches.active ?? 0, `${summary.pitches.temporarilySuspended ?? 0} tạm đình chỉ`],
  ];
  cards.forEach(([label, value, note]) => {
    const card = template.content.cloneNode(true);
    card.querySelector('.admin-dashboard-page__summary-label').textContent = label;
    card.querySelector('.admin-dashboard-page__summary-value').textContent = String(value);
    card.querySelector('.admin-dashboard-page__summary-note').textContent = note;
    container.append(card);
  });
}

function renderPanels(summary) {
  setDefinitionList(document.querySelector('#user-summary'), [['Khách hàng hoạt động', summary.customers.active], ['Khách hàng đình chỉ', summary.customers.suspended], ['Quản lý sân hoạt động', summary.managers.active]]);
  setDefinitionList(document.querySelector('#pitch-summary'), [['Đang hoạt động', summary.pitches.active ?? 0], ['Tạm đình chỉ', summary.pitches.temporarilySuspended ?? 0], ['Đình chỉ vĩnh viễn', summary.pitches.permanentlySuspended ?? 0]]);
  setDefinitionList(document.querySelector('#report-summary'), [['Tổng báo cáo', summary.reports.total], ['Chờ xử lý', summary.reports.pending], ['Đã kết thúc', summary.reports.resolved]]);
}

function renderActivities(activities) {
  const list = document.querySelector('#recent-activities');
  const empty = document.querySelector('#activity-empty');
  const template = document.querySelector('#tpl-activity');
  empty.hidden = activities.length > 0;
  activities.slice(0, 5).forEach(activity => {
    const item = template.content.cloneNode(true);
    item.querySelector('.admin-dashboard-page__activity-title').textContent = `${ACTION_LABELS[activity.actionType] ?? activity.actionType} · ${activity.entityId}`;
    item.querySelector('.admin-dashboard-page__activity-reason').textContent = activity.reason;
    const time = item.querySelector('.admin-dashboard-page__activity-time');
    time.dateTime = activity.createdAt;
    time.textContent = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(activity.createdAt));
    list.append(item);
  });
}

function setupTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const validTabs = new Set(tabs.map(tab => tab.dataset.tab));
  const requested = new URLSearchParams(location.search).get('tab');
  const initial = validTabs.has(requested) ? requested : 'users';
  function activate(name, focus = false) {
    tabs.forEach(tab => {
      const selected = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.querySelector(`#panel-${tab.dataset.tab}`).hidden = !selected;
      if (selected && focus) tab.focus();
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab.dataset.tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = (index + direction + tabs.length) % tabs.length;
      activate(tabs[next].dataset.tab, true);
    });
  });
  activate(initial);
}

async function init() {
  await initializeState();
  const admin = requireRole([ROLES.ADMIN]);
  if (!admin) return;
  document.querySelector('#admin-identity').textContent = admin.displayName;
  const [summary, activities] = await Promise.all([getDashboardSummary(), listActivities()]);
  renderSummaryCards(summary);
  renderPanels(summary);
  renderActivities(activities);
  setupTabs();
}

init();
