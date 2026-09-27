import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import {
  BOOKING_STATUS_META,
  PAYMENT_STATUS_LABELS,
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
  pitchFilter: document.getElementById('pitch-filter'),
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
  panelPitch: document.getElementById('panel-pitch'),
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
let managerPitches = [];
let selectedPitchId = '';
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
  node.querySelector('.manager-bookings-page__pitch-name').textContent = booking.pitch.name;
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
  elements.panelPitch.textContent = booking.pitch.name;
  elements.panelCustomer.textContent = booking.customer?.displayName ?? booking.customerId;
  elements.panelPhone.textContent = booking.customer?.phone ?? '—';
  elements.panelDateTime.textContent = formatDateTime(booking.slotStart);
  elements.panelAmount.textContent = formatVND(booking.amount);
  elements.panelPayment.textContent = PAYMENT_STATUS_LABELS[booking.paymentStatus];
  elements.panelBooking.textContent = BOOKING_STATUS_META[booking.status].label;
  elements.cancelButton.hidden = booking.status !== 'Confirmed' || Date.parse(booking.slotStart) <= Date.now();
  if (!elements.panel.open) elements.panel.showModal();
  elements.panelClose.focus();
}

function closePanel() {
  if (elements.panel.open) elements.panel.close();
  selectedBooking = null;
}

function loadBookings() {
  const selectedPitches = selectedPitchId
    ? managerPitches.filter(pitch => String(pitch.id) === selectedPitchId)
    : managerPitches;
  bookings = selectedPitches.flatMap(pitch => (
    listManagerBookings(currentUser, pitch.id).map(booking => ({ ...booking, pitch }))
  ));
  elements.pitchName.textContent = selectedPitches.length === 1
    ? `${selectedPitches[0].name} · ${selectedPitches[0].location}`
    : `Tất cả ${managerPitches.length} sân thuộc tài khoản quản lý`;
  renderCounts();
  render();
}

function renderPitchOptions() {
  const options = managerPitches.map(pitch => {
    const option = document.createElement('option');
    option.value = String(pitch.id);
    option.textContent = `${pitch.name} · ${pitch.location}`;
    return option;
  });
  elements.pitchFilter.append(...options);
  elements.pitchFilter.value = selectedPitchId;
}

async function init() {
  await prepareBookingData();
  currentUser = requireRole([ROLES.MANAGER]);
  if (!currentUser) return;

  const params = new URLSearchParams(location.search);
  const pitchId = params.get('pitchId');
  managerPitches = listManagerPitches(currentUser);
  if (!managerPitches.length) {
    showState('Chưa có sân để quản lý', 'Hãy thêm sân trước khi theo dõi lượt đặt của khách hàng.');
    return;
  }
  if (pitchId && !managerPitches.some(pitch => String(pitch.id) === pitchId)) {
    location.replace('404.html');
    return;
  }
  selectedPitchId = pitchId ?? '';

  renderPitchOptions();
  elements.content.hidden = false;
  loadBookings();

  elements.form.addEventListener('submit', event => event.preventDefault());
  elements.form.addEventListener('input', render);
  elements.pitchFilter.addEventListener('change', () => {
    selectedPitchId = elements.pitchFilter.value;
    closePanel();
    loadBookings();
  });
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
    const bookingId = result.booking.id;
    loadBookings();
    const refreshedBooking = bookings.find(booking => booking.id === bookingId);
    if (refreshedBooking) openPanel(refreshedBooking);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && elements.panel.open) closePanel();
  });

  const bookingId = params.get('bookingId');
  if (bookingId) {
    const booking = bookings.find(item => item.id === bookingId);
    if (!booking) {
      location.replace('404.html');
      return;
    }
    openPanel(booking);
  }
}

init();
