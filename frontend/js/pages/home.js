import '../components/site-header.js';
import '../components/site-footer.js';
import { getCurrentUser } from '../services/auth-service.js';
import { initializeState } from '../services/storage-service.js';

const FEATURED_PITCHES = [
  {
    name: 'Sân bóng Bách Khoa',
    location: 'Hai Bà Trưng, Hà Nội',
    typeLabel: 'Sân 7 người',
    price: 420000,
    rating: 4.9,
    badge: 'Đặt nhiều',
    image: 'img/placeholder.svg',
  },
  {
    name: 'Green Field Minh Khai',
    location: 'Bắc Từ Liêm, Hà Nội',
    typeLabel: 'Sân 5 người',
    price: 300000,
    rating: 4.8,
    badge: 'Còn giờ đẹp',
    image: 'img/placeholder.svg',
  },
  {
    name: 'Arena Tây Hồ',
    location: 'Tây Hồ, Hà Nội',
    typeLabel: 'Sân 7 người',
    price: 500000,
    rating: 4.7,
    badge: 'Mới',
    image: 'img/placeholder.svg',
  },
  {
    name: 'Sân bóng Thành Công',
    location: 'Ba Đình, Hà Nội',
    typeLabel: 'Sân 11 người',
    price: 900000,
    rating: 4.8,
    badge: 'Đánh giá cao',
    image: 'img/placeholder.svg',
  },
];

const elements = {
  form: document.getElementById('quick-search-form'),
  dateButton: document.getElementById('date-picker-button'),
  datePanel: document.getElementById('date-picker-panel'),
  dateValue: document.getElementById('date-picker-value'),
  dateInput: document.getElementById('search-date'),
  calendarMonth: document.getElementById('calendar-month'),
  calendarDays: document.getElementById('calendar-days'),
  timeButton: document.getElementById('time-picker-button'),
  timePanel: document.getElementById('time-picker-panel'),
  timeValue: document.getElementById('time-picker-value'),
  timeInput: document.getElementById('search-time'),
  results: document.getElementById('results'),
  resultSummary: document.getElementById('result-summary'),
  messageBubble: document.querySelector('.message-bubble'),
  quickSearch: document.getElementById('quick-search'),
  featuredSection: document.getElementById('results')?.closest('section'),
  footer: document.querySelector('site-footer'),
  adminDashboardLink: document.getElementById('admin-dashboard-link'),
};

const today = startOfDay(new Date());
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = null;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPitchPrice(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ / giờ`;
}

function closePickers(except = null) {
  [[elements.dateButton, elements.datePanel], [elements.timeButton, elements.timePanel]]
    .forEach(([button, panel]) => {
      if (!button || !panel || panel === except) return;
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    });
}

function togglePicker(button, panel) {
  if (!button || !panel) return;
  const willOpen = panel.hidden;
  closePickers(panel);
  panel.hidden = !willOpen;
  button.setAttribute('aria-expanded', String(willOpen));
}

function renderCalendar() {
  if (!elements.calendarDays || !elements.calendarMonth) return;

  elements.calendarMonth.textContent = new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth);

  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - mondayOffset);

  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(date.getDate());
    button.dataset.date = toDateValue(date);
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date));

    const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
    const isPast = startOfDay(date) < today;
    const isSelected = selectedDate && toDateValue(date) === toDateValue(selectedDate);
    if (isOutsideMonth) button.classList.add('is-outside-month');
    if (isSelected) {
      button.classList.add('is-selected');
      button.setAttribute('aria-selected', 'true');
    }
    button.disabled = isPast;
    button.addEventListener('click', () => selectDate(date));
    fragment.append(button);
  }

  elements.calendarDays.replaceChildren(fragment);
  const previousButton = elements.datePanel?.querySelector('[data-calendar-action="previous"]');
  if (previousButton) {
    previousButton.disabled = visibleMonth.getFullYear() === today.getFullYear()
      && visibleMonth.getMonth() === today.getMonth();
  }
}

function selectDate(date) {
  selectedDate = startOfDay(date);
  visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  if (elements.dateInput) elements.dateInput.value = toDateValue(date);
  if (elements.dateValue) {
    elements.dateValue.textContent = new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  }
  renderCalendar();
  closePickers();
  elements.dateButton?.focus();
}

function changeMonth(offset) {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  if (visibleMonth < currentMonth) visibleMonth = currentMonth;
  renderCalendar();
}

function selectTime(button) {
  const value = button.dataset.time;
  if (!value || !elements.timePanel) return;

  elements.timePanel.querySelectorAll('[data-time]').forEach(slot => {
    const active = slot === button;
    slot.classList.toggle('is-selected', active);
    slot.setAttribute('aria-pressed', String(active));
  });
  if (elements.timeInput) elements.timeInput.value = value;
  if (elements.timeValue) elements.timeValue.textContent = value;
  closePickers();
  elements.timeButton?.focus();
}

function renderFeaturedPitches(items) {
  if (!elements.results || !elements.resultSummary) return;
  const template = document.getElementById('tpl-card');
  const emptyTemplate = document.getElementById('tpl-empty-state');
  if (!template || !emptyTemplate) return;

  if (items.length === 0) {
    elements.results.replaceChildren(emptyTemplate.content.cloneNode(true));
    elements.resultSummary.textContent = 'Chưa có sân mẫu để hiển thị.';
    elements.results.setAttribute('aria-busy', 'false');
    return;
  }

  const cards = items.map(pitch => {
    const node = template.content.cloneNode(true);
    const link = node.querySelector('.card__link');
    const image = node.querySelector('.card__img');
    const favoriteButton = node.querySelector('.card__favorite');
    const rating = node.querySelector('.card__rating');

    link.setAttribute('aria-label', `Xem chi tiết ${pitch.name}`);
    image.src = pitch.image;
    image.alt = `Hình ảnh minh họa ${pitch.name}`;
    node.querySelector('.card__title').textContent = pitch.name;
    node.querySelector('.card__meta').textContent = pitch.location;
    node.querySelector('.card__type').textContent = pitch.typeLabel;
    node.querySelector('.card__price').textContent = formatPitchPrice(pitch.price);
    rating.textContent = `★ ${pitch.rating.toFixed(1)}`;
    rating.setAttribute('aria-label', `${pitch.rating.toFixed(1)} trên 5 sao`);
    node.querySelector('.card__badge').textContent = pitch.badge;
    favoriteButton.setAttribute('aria-label', `Thêm ${pitch.name} vào danh sách yêu thích`);
    return node;
  });

  elements.results.replaceChildren(...cards);
  elements.resultSummary.textContent = `${items.length} sân mẫu dùng để minh họa giao diện Home.`;
  elements.results.setAttribute('aria-busy', 'false');
}

function disableUnfinishedNavigation() {
  const header = document.querySelector('site-header');
  const footer = document.querySelector('site-footer');

  [
    header?.querySelector('[data-nav="search"]'),
    footer?.querySelector('a[href="search.html"]'),
  ].filter(Boolean).forEach(link => {
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
  });

  const headerSearch = header?.querySelector('.site-header__search');
  if (headerSearch) {
    headerSearch.removeAttribute('action');
    headerSearch.addEventListener('submit', event => event.preventDefault());
  }
}

function protectMobileControlsFromMessageBubble() {
  if (!elements.messageBubble || !('IntersectionObserver' in window)) return;
  const media = matchMedia('(max-width: 560px)');
  const visibleTargets = new Set();
  const update = () => {
    elements.messageBubble.classList.toggle('is-suppressed', media.matches && visibleTargets.size > 0);
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleTargets.add(entry.target);
      else visibleTargets.delete(entry.target);
    });
    update();
  }, { threshold: 0.08 });

  [elements.quickSearch, elements.featuredSection, elements.footer]
    .filter(Boolean)
    .forEach(target => observer.observe(target));
  media.addEventListener('change', update);
}

async function showAdminDashboardLink() {
  if (!elements.adminDashboardLink) return;
  try {
    await initializeState();
    const user = getCurrentUser();
    elements.adminDashboardLink.hidden = user?.role !== 'admin' || user.status !== 'active';
  } catch {
    elements.adminDashboardLink.hidden = true;
  }
}

function bindEvents() {
  elements.dateButton?.addEventListener('click', () => togglePicker(elements.dateButton, elements.datePanel));
  elements.timeButton?.addEventListener('click', () => togglePicker(elements.timeButton, elements.timePanel));
  elements.datePanel?.querySelector('[data-calendar-action="previous"]')
    ?.addEventListener('click', () => changeMonth(-1));
  elements.datePanel?.querySelector('[data-calendar-action="next"]')
    ?.addEventListener('click', () => changeMonth(1));

  elements.timePanel?.querySelectorAll('[data-time]').forEach(button => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => selectTime(button));
  });

  elements.form?.addEventListener('submit', event => event.preventDefault());

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const clickedPicker = elements.datePanel?.contains(target)
      || elements.dateButton?.contains(target)
      || elements.timePanel?.contains(target)
      || elements.timeButton?.contains(target);
    if (!clickedPicker) closePickers();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const dateWasOpen = elements.datePanel && !elements.datePanel.hidden;
    const timeWasOpen = elements.timePanel && !elements.timePanel.hidden;
    closePickers();
    if (dateWasOpen) elements.dateButton?.focus();
    if (timeWasOpen) elements.timeButton?.focus();
  });
}

renderCalendar();
renderFeaturedPitches(FEATURED_PITCHES);
disableUnfinishedNavigation();
protectMobileControlsFromMessageBubble();
bindEvents();
showAdminDashboardLink();
