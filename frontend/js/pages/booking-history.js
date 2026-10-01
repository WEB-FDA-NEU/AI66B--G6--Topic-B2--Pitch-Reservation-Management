// ============================================================
//  S11 — Booking History
//  Hiển thị, tìm kiếm và lọc các lượt đặt sân của khách hàng.
//  Dữ liệu hợp nhất từ mock cục bộ và các draft đã thanh toán.
// ============================================================
import { formatVND } from '../render.js';
import { isLoggedIn, requireLogin } from '../auth.js';
import { MOCK_BOOKINGS, STATUS_META, pitchForBooking } from '../data/bookings.js';
import { showPopup } from '../services/popup.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const elements = {
  content: document.getElementById('history-content'),
  form: document.getElementById('filter-form'),
  tabs: document.getElementById('status-tabs'),
  summary: document.getElementById('result-summary'),
  list: document.getElementById('booking-list'),
  emptyState: document.getElementById('empty-state'),
  emptyHint: document.getElementById('empty-hint'),
};

let activeStatusTab = 'all';
let allBookings = [];

function loadAllBookings() {
  const completedDrafts = [];
  try {
    const store = JSON.parse(localStorage.getItem('pp_completed_bookings') || '{}');
    for (const b of Object.values(store)) {
      // Chuẩn hoá định dạng date/time cho các booking mới tạo
      if (b.slotId && !b.date) {
        const [d, t] = b.slotId.split('T');
        b.date = d;
        b.time = t;
      }
      completedDrafts.push(b);
    }
  } catch (e) { console.error(e); }
  
  // Nối booking mới (trên cùng) với dữ liệu mock
  allBookings = [...completedDrafts.reverse(), ...MOCK_BOOKINGS];
}

function matchesStatusTab(booking, tab) {
  if (tab === 'all') return true;
  if (tab === 'upcoming') return ['pending', 'confirmed'].includes(booking.status) && booking.date >= todayValue();
  return booking.status === tab;
}

function todayValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function readFilters() {
  const data = new FormData(elements.form);
  return {
    q: (data.get('q') ?? '').toString().trim().toLocaleLowerCase('vi'),
    date: (data.get('date') ?? '').toString(),
  };
}

function getFilteredBookings() {
  const { q, date } = readFilters();
  return allBookings
    .filter(booking => matchesStatusTab(booking, activeStatusTab))
    .filter(booking => !date || booking.date === date)
    .filter(booking => {
      if (!q) return true;
      const pitch = pitchForBooking(booking);
      return booking.id.toLocaleLowerCase('vi').includes(q)
        || (pitch && pitch.name.toLocaleLowerCase('vi').includes(q));
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}

function createRow(booking) {
  const pitch = pitchForBooking(booking);
  const node = document.getElementById('tpl-booking-row').content.cloneNode(true);

  const image = node.querySelector('.row__img');
  image.src = pitch?.image ?? 'img/placeholder.svg';
  image.alt = pitch ? `Hình ảnh ${pitch.name}` : 'Sân bóng';

  const link = node.querySelector('.row__title');
  link.href = `booking-detail.html?bookingId=${encodeURIComponent(booking.id)}`;
  node.querySelector('.booking-row__ref').textContent = booking.id;
  node.querySelector('.booking-row__pitch').textContent = pitch ? pitch.name : 'Sân bóng không xác định';

  const [year, month, day] = booking.date.split('-');
  node.querySelector('.booking-row__datetime').textContent = `${booking.time} · ${day}/${month}/${year}`;
  node.querySelector('.row__price').textContent = formatVND(booking.amount);

  const meta = STATUS_META[booking.status] ?? { label: booking.status, badge: 'status-badge--pending' };
  const badge = node.querySelector('.status-badge');
  badge.textContent = meta.label;
  badge.classList.add(meta.badge);

  return node;
}

function showSkeleton() {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 4; i += 1) {
    fragment.append(document.getElementById('tpl-skeleton-row').content.cloneNode(true));
  }
  elements.list.replaceChildren(fragment);
}

function render() {
  const bookings = getFilteredBookings();
  elements.list.setAttribute('aria-busy', 'false');

  if (bookings.length === 0) {
    elements.list.replaceChildren();
    elements.emptyState.hidden = false;
    elements.emptyHint.textContent = 'Hãy thử đổi từ khoá tìm kiếm hoặc bộ lọc.';
    elements.summary.textContent = '';
    return;
  }

  elements.emptyState.hidden = true;
  elements.list.replaceChildren(...bookings.map(createRow));
  elements.summary.textContent = `${bookings.length} lượt đặt sân`;
}

function loadWithSkeleton() {
  elements.list.setAttribute('aria-busy', 'true');
  showSkeleton();
  window.setTimeout(render, 300);
}

function selectStatusTab(tab, button) {
  activeStatusTab = tab;
  elements.tabs.querySelectorAll('[data-status]').forEach(btn => {
    const active = btn === button;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  loadWithSkeleton();
}

function init() {
  if (!isLoggedIn()) return requireLogin();
  
  elements.content.hidden = false;

  loadAllBookings();

  elements.tabs.querySelectorAll('[data-status]').forEach(button => {
    button.addEventListener('click', () => selectStatusTab(button.dataset.status, button));
  });

  elements.form.addEventListener('submit', event => { event.preventDefault(); loadWithSkeleton(); });
  elements.form.addEventListener('input', () => loadWithSkeleton());

  loadWithSkeleton();
}

init();
