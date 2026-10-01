// ============================================================
//  S22 — Manager Booking Management
//  Xem và lọc các lượt đặt sân thuộc những sân do quản lý hiện tại quản lý.
//  Dữ liệu dùng chung từ shared module.
// ============================================================
import { MOCK_PITCHES } from '../data/pitches.js';
import { formatVND } from '../render.js';
import { isLoggedIn, requireLogin } from '../auth.js';
import { MOCK_MANAGER_BOOKINGS, STATUS_META, PAYMENT_LABEL, pitchForBooking } from '../data/bookings.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const MANAGED_PITCH_IDS = [1, 2, 3];
const managedPitches = MOCK_PITCHES.filter(p => MANAGED_PITCH_IDS.includes(p.id));

const elements = {
  content: document.getElementById('manager-content'),
  countTotal: document.getElementById('count-total'),
  countUpcoming: document.getElementById('count-upcoming'),
  countConfirmed: document.getElementById('count-confirmed'),
  countCompleted: document.getElementById('count-completed'),
  countCancelled: document.getElementById('count-cancelled'),
  form: document.getElementById('filter-form'),
  pitchFilter: document.getElementById('pitch-filter'),
  summary: document.getElementById('result-summary'),
  table: document.getElementById('bookings-table'),
  tbody: document.getElementById('bookings-tbody'),
  emptyState: document.getElementById('empty-state'),
  panel: document.getElementById('detail-panel'),
  panelClose: document.getElementById('detail-panel-close'),
  panelRef: document.getElementById('panel-ref'),
  panelCustomer: document.getElementById('panel-customer'),
  panelPhone: document.getElementById('panel-phone'),
  panelPitch: document.getElementById('panel-pitch'),
  panelDatetime: document.getElementById('panel-datetime'),
  panelAmount: document.getElementById('panel-amount'),
  panelPaymentBadge: document.getElementById('panel-payment-badge'),
  panelStatusBadge: document.getElementById('panel-status-badge'),
};

function todayValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function renderSummaryCounts() {
  const today = todayValue();
  elements.countTotal.textContent = String(MOCK_MANAGER_BOOKINGS.length);
  elements.countUpcoming.textContent = String(MOCK_MANAGER_BOOKINGS.filter(b => ['pending', 'confirmed'].includes(b.status) && b.date >= today).length);
  elements.countConfirmed.textContent = String(MOCK_MANAGER_BOOKINGS.filter(b => b.status === 'confirmed').length);
  elements.countCompleted.textContent = String(MOCK_MANAGER_BOOKINGS.filter(b => b.status === 'completed').length);
  elements.countCancelled.textContent = String(MOCK_MANAGER_BOOKINGS.filter(b => b.status === 'cancelled').length);
}

function populatePitchFilter() {
  const fragment = document.createDocumentFragment();
  managedPitches.forEach(pitch => {
    const option = document.createElement('option');
    option.value = String(pitch.id);
    option.textContent = pitch.name;
    fragment.append(option);
  });
  elements.pitchFilter.append(fragment);
}

function readFilters() {
  const data = new FormData(elements.form);
  return {
    q: (data.get('q') ?? '').toString().trim().toLocaleLowerCase('vi'),
    pitchId: (data.get('pitchId') ?? '').toString(),
    status: (data.get('status') ?? '').toString(),
    paymentStatus: (data.get('paymentStatus') ?? '').toString(),
    date: (data.get('date') ?? '').toString(),
  };
}

function getFilteredBookings() {
  const { q, pitchId, status, paymentStatus, date } = readFilters();
  return MOCK_MANAGER_BOOKINGS
    .filter(b => !pitchId || String(b.pitchId) === pitchId)
    .filter(b => !status || b.status === status)
    .filter(b => !paymentStatus || b.paymentStatus === paymentStatus)
    .filter(b => !date || b.date === date)
    .filter(b => {
      if (!q) return true;
      return b.id.toLocaleLowerCase('vi').includes(q) || b.customerName.toLocaleLowerCase('vi').includes(q);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}

function applyBadge(el, key, labelSource) {
  const meta = STATUS_META[key] ?? { label: key, badge: 'status-badge--pending' };
  el.textContent = labelSource ? (labelSource[key] ?? key) : meta.label;
  el.className = `status-badge ${meta.badge}`;
}

function createRow(booking) {
  const pitch = pitchForBooking(booking);
  const tr = document.createElement('tr');

  const [year, month, day] = booking.date.split('-');
  const cells = [
    booking.id,
    booking.customerName,
    pitch ? pitch.name : '—',
    `${booking.time} · ${day}/${month}/${year}`,
    formatVND(booking.amount),
  ];
  cells.forEach(text => {
    const td = document.createElement('td');
    td.textContent = text;
    tr.append(td);
  });

  const paymentTd = document.createElement('td');
  const paymentBadge = document.createElement('span');
  applyBadge(paymentBadge, booking.paymentStatus, PAYMENT_LABEL);
  paymentTd.append(paymentBadge);
  tr.append(paymentTd);

  const statusTd = document.createElement('td');
  const statusBadge = document.createElement('span');
  applyBadge(statusBadge, booking.status);
  statusTd.append(statusBadge);
  tr.append(statusTd);

  const actionTd = document.createElement('td');
  const viewButton = document.createElement('button');
  viewButton.type = 'button';
  viewButton.className = 'btn';
  viewButton.textContent = 'Xem';
  viewButton.addEventListener('click', () => openDetailPanel(booking));
  actionTd.append(viewButton);
  tr.append(actionTd);

  return tr;
}

function showSkeleton() {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 5; i += 1) {
    fragment.append(document.getElementById('tpl-skeleton-row').content.cloneNode(true));
  }
  elements.tbody.replaceChildren(fragment);
}

function render() {
  const bookings = getFilteredBookings();
  elements.table.setAttribute('aria-busy', 'false');

  if (bookings.length === 0) {
    elements.tbody.replaceChildren();
    elements.emptyState.hidden = false;
    elements.summary.textContent = '';
    return;
  }

  elements.emptyState.hidden = true;
  elements.tbody.replaceChildren(...bookings.map(createRow));
  elements.summary.textContent = `${bookings.length} lượt đặt sân phù hợp`;
}

function loadWithSkeleton() {
  elements.table.setAttribute('aria-busy', 'true');
  showSkeleton();
  window.setTimeout(render, 300);
}

function openDetailPanel(booking) {
  const pitch = pitchForBooking(booking);
  const [year, month, day] = booking.date.split('-');

  elements.panelRef.textContent = booking.id;
  elements.panelCustomer.textContent = booking.customerName;
  elements.panelPhone.textContent = booking.customerPhone;
  elements.panelPitch.textContent = pitch ? pitch.name : '—';
  elements.panelDatetime.textContent = `${booking.time} · ${day}/${month}/${year}`;
  elements.panelAmount.textContent = formatVND(booking.amount);
  applyBadge(elements.panelPaymentBadge, booking.paymentStatus, PAYMENT_LABEL);
  applyBadge(elements.panelStatusBadge, booking.status);

  elements.panel.hidden = false;
  elements.panelClose.focus();
}

function closeDetailPanel() {
  elements.panel.hidden = true;
}

function init() {
  if (!isLoggedIn()) return requireLogin();
  
  elements.content.hidden = false;

  renderSummaryCounts();
  populatePitchFilter();

  elements.form.addEventListener('submit', event => { event.preventDefault(); loadWithSkeleton(); });
  elements.form.addEventListener('input', () => loadWithSkeleton());
  elements.panelClose.addEventListener('click', closeDetailPanel);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !elements.panel.hidden) closeDetailPanel();
  });

  loadWithSkeleton();
}

init();
