import '../components/site-header.js';
import '../components/site-footer.js';
import { initializeState } from '../services/storage-service.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { BOOKING_STATUS_META, listCustomerBookings } from '../services/booking-service.js';
import { formatVND } from '../render.js';

const elements = {
  content: document.getElementById('history-content'),
  form: document.getElementById('filter-form'),
  tabs: document.getElementById('status-tabs'),
  summary: document.getElementById('result-summary'),
  list: document.getElementById('booking-list'),
  emptyState: document.getElementById('empty-state'),
  template: document.getElementById('tpl-booking-row'),
};

let bookings = [];
let activeStatus = 'all';

function formatDateTime(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function isUpcoming(booking) {
  return ['Pending', 'Confirmed'].includes(booking.status) && Date.parse(booking.slotStart) > Date.now();
}

function readFilters() {
  const data = new FormData(elements.form);
  return {
    query: String(data.get('q') ?? '').trim().toLocaleLowerCase('vi'),
    date: String(data.get('date') ?? ''),
  };
}

function getFilteredBookings() {
  const { query, date } = readFilters();
  return bookings
    .filter(booking => {
      if (activeStatus === 'all') return true;
      if (activeStatus === 'upcoming') return isUpcoming(booking);
      return booking.status === activeStatus;
    })
    .filter(booking => !date || booking.slotStart.slice(0, 10) === date)
    .filter(booking => {
      if (!query) return true;
      return booking.id.toLocaleLowerCase('vi').includes(query)
        || booking.snapshot.pitchName.toLocaleLowerCase('vi').includes(query);
    })
    .sort((a, b) => Date.parse(b.slotStart) - Date.parse(a.slotStart));
}

function createBookingItem(booking) {
  const node = elements.template.content.cloneNode(true);
  const image = node.querySelector('.booking-history-page__image');
  image.alt = `Hình ảnh ${booking.snapshot.pitchName}`;
  const link = node.querySelector('.booking-history-page__item-title');
  link.textContent = booking.id;
  link.href = `booking-details.html?${new URLSearchParams({ bookingId: booking.id })}`;
  node.querySelector('.booking-history-page__pitch').textContent = booking.snapshot.pitchName;
  node.querySelector('.booking-history-page__datetime').textContent = formatDateTime(booking.slotStart);
  node.querySelector('.booking-history-page__price').textContent = formatVND(booking.amount);
  const status = node.querySelector('.booking-history-page__status');
  const statusMeta = BOOKING_STATUS_META[booking.status];
  status.textContent = statusMeta.label;
  status.classList.add(statusMeta.className);
  return node;
}

function render() {
  const filtered = getFilteredBookings();
  elements.list.replaceChildren(...filtered.map(createBookingItem));
  elements.emptyState.hidden = filtered.length > 0;
  elements.summary.textContent = `${filtered.length} lượt đặt sân`;
}

function selectStatus(button) {
  activeStatus = button.dataset.status;
  elements.tabs.querySelectorAll('[data-status]').forEach(item => {
    const selected = item === button;
    item.classList.toggle('is-active', selected);
    item.setAttribute('aria-selected', String(selected));
  });
  render();
}

async function init() {
  await initializeState();
  const user = requireRole([ROLES.CUSTOMER]);
  if (!user) return;
  bookings = listCustomerBookings(user);
  elements.content.hidden = false;
  elements.tabs.querySelectorAll('[data-status]').forEach(button => {
    button.addEventListener('click', () => selectStatus(button));
  });
  elements.form.addEventListener('submit', event => event.preventDefault());
  elements.form.addEventListener('input', render);
  render();
}

init();
