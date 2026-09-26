import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import {
  BOOKING_STATUS_META,
  PAYMENT_STATUS_LABELS,
  getManagerBooking,
  listManagerBookings,
  listManagerPitches,
  prepareBookingData,
} from '../services/booking-service.js';
import { formatVND } from '../render.js';
import { cancelManagerBooking } from '../services/finance-service.js';

const elements = {
  content: document.getElementById('manager-content'),
  pageState: document.getElementById('page-state'),
  pageStateTitle: document.getElementById('page-state-title'),
  pageStateMessage: document.getElementById('page-state-message'),
  pitchName: document.getElementById('managed-pitch-name'),
  total: document.getElementById('count-total'),
  upcoming: document.getElementById('count-upcoming'),
  confirmed: document.getElementById('count-confirmed'),
  completed: document.getElementById('count-completed'),
  cancelled: document.getElementById('count-cancelled'),
  form: document.getElementById('filter-form'),
  summary: document.getElementById('result-summary'),
  tbody: document.getElementById('bookings-tbody'),
  emptyState: document.getElementById('empty-state'),
  rowTemplate: document.getElementById('tpl-manager-booking-row'),
  panel: document.getElementById('detail-panel'),
  panelClose: document.getElementById('detail-panel-close'),
  panelRef: document.getElementById('panel-ref'),
  panelCustomer: document.getElementById('panel-customer'),
  panelPhone: document.getElementById('panel-phone'),
  panelDateTime: document.getElementById('panel-datetime'),
  panelAmount: document.getElementById('panel-amount'),
  panelPayment: document.getElementById('panel-payment-status'),
  panelBooking: document.getElementById('panel-booking-status'),
  cancelButton: document.getElementById('manager-cancel-button'),
  cancelDialog: document.getElementById('manager-cancel-dialog'),
  cancelForm: document.getElementById('manager-cancel-form'),
  cancelFeedback: document.getElementById('manager-cancel-feedback'),
};

let currentUser = null;
let currentPitch = null;
let bookings = [];
let selectedBooking = null;

function showState(title, message) {
  elements.content.hidden = true;
  elements.pageStateTitle.textContent = title;
  elements.pageStateMessage.textContent = message;
  elements.pageState.hidden = false;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function readFilters() {
  const data = new FormData(elements.form);
  return {
    query: String(data.get('q') ?? '').trim().toLocaleLowerCase('vi'),
    status: String(data.get('status') ?? ''),
    paymentStatus: String(data.get('paymentStatus') ?? ''),
    date: String(data.get('date') ?? ''),
  };
}

function filteredBookings() {
  const { query, status, paymentStatus, date } = readFilters();
  return bookings
    .filter(booking => !status || booking.status === status)
    .filter(booking => !paymentStatus || booking.paymentStatus === paymentStatus)
    .filter(booking => !date || booking.slotStart.slice(0, 10) === date)
    .filter(booking => {
      if (!query) return true;
      return booking.id.toLocaleLowerCase('vi').includes(query)
        || booking.customer?.displayName.toLocaleLowerCase('vi').includes(query);
    })
    .sort((a, b) => Date.parse(b.slotStart) - Date.parse(a.slotStart));
}

function setBookingStatus(element, status) {
  const meta = BOOKING_STATUS_META[status];
  element.textContent = meta.label;
  element.className = `manager-bookings-page__booking-status ${meta.className}`;
}

function createRow(booking) {
  const node = elements.rowTemplate.content.cloneNode(true);
  node.querySelector('.manager-bookings-page__booking-id').textContent = booking.id;
  node.querySelector('.manager-bookings-page__customer').textContent = booking.customer?.displayName ?? booking.customerId;
  node.querySelector('.manager-bookings-page__datetime').textContent = formatDateTime(booking.slotStart);
  node.querySelector('.manager-bookings-page__amount').textContent = formatVND(booking.amount);
  node.querySelector('.manager-bookings-page__payment-status').textContent = PAYMENT_STATUS_LABELS[booking.paymentStatus];
  setBookingStatus(node.querySelector('.manager-bookings-page__booking-status'), booking.status);
  node.querySelector('.manager-bookings-page__view').addEventListener('click', () => openPanel(booking));
  return node;
}

function renderCounts() {
  elements.total.textContent = String(bookings.length);
  elements.upcoming.textContent = String(bookings.filter(booking => (
    ['Pending', 'Confirmed'].includes(booking.status) && Date.parse(booking.slotStart) > Date.now()
  )).length);
  elements.confirmed.textContent = String(bookings.filter(booking => booking.status === 'Confirmed').length);
  elements.completed.textContent = String(bookings.filter(booking => booking.status === 'Completed').length);
  elements.cancelled.textContent = String(bookings.filter(booking => booking.status === 'Cancelled').length);
}

function render() {
  const filtered = filteredBookings();
  elements.tbody.replaceChildren(...filtered.map(createRow));
  elements.emptyState.hidden = filtered.length > 0;
  elements.summary.textContent = `${filtered.length} lượt đặt sân`;
}

function openPanel(booking) {
  selectedBooking = booking;
  elements.panelRef.textContent = booking.id;
  elements.panelCustomer.textContent = booking.customer?.displayName ?? booking.customerId;
  elements.panelPhone.textContent = booking.customer?.phone ?? '—';
  elements.panelDateTime.textContent = formatDateTime(booking.slotStart);
  elements.panelAmount.textContent = formatVND(booking.amount);
  elements.panelPayment.textContent = PAYMENT_STATUS_LABELS[booking.paymentStatus];
  elements.panelBooking.textContent = BOOKING_STATUS_META[booking.status].label;
  elements.cancelButton.hidden = booking.status !== 'Confirmed' || Date.parse(booking.slotStart) <= Date.now();
  elements.panel.hidden = false;
  elements.panelClose.focus();
}

function closePanel() {
  elements.panel.hidden = true;
  selectedBooking = null;
}

async function init() {
  await prepareBookingData();
  currentUser = requireRole([ROLES.MANAGER]);
  if (!currentUser) return;

  const params = new URLSearchParams(location.search);
  const pitchId = params.get('pitchId');
  currentPitch = listManagerPitches(currentUser).find(pitch => String(pitch.id) === pitchId);
  if (!currentPitch) {
    showState('Không thể mở dữ liệu đặt sân', 'Thiếu mã sân hợp lệ hoặc sân không thuộc tài khoản quản lý hiện tại.');
    return;
  }

  bookings = listManagerBookings(currentUser, currentPitch.id);
  elements.pitchName.textContent = `${currentPitch.name} · ${currentPitch.location}`;
  elements.content.hidden = false;
  renderCounts();
  render();

  elements.form.addEventListener('submit', event => event.preventDefault());
  elements.form.addEventListener('input', render);
  elements.panelClose.addEventListener('click', closePanel);
  elements.cancelButton.addEventListener('click', () => {
    elements.cancelFeedback.textContent = '';
    elements.cancelForm.reset();
    elements.cancelDialog.showModal();
  });
  document.getElementById('manager-cancel-close').addEventListener('click', () => elements.cancelDialog.close());
  elements.cancelForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!selectedBooking) return;
    const result = await cancelManagerBooking(currentUser, selectedBooking.id, new FormData(elements.cancelForm).get('reason'));
    if (!result.ok) {
      elements.cancelFeedback.textContent = 'Không thể huỷ lượt đặt sân ở trạng thái hiện tại.';
      return;
    }
    elements.cancelDialog.close();
    bookings = listManagerBookings(currentUser, currentPitch.id);
    renderCounts();
    render();
    openPanel(bookings.find(booking => booking.id === result.booking.id));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !elements.panel.hidden) closePanel();
  });

  const bookingId = params.get('bookingId');
  if (bookingId) {
    const booking = getManagerBooking(currentUser, currentPitch.id, bookingId);
    if (booking) openPanel(booking);
  }
}

init();
