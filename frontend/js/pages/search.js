import '../components/site-header.js';
import '../components/site-footer.js';
import {
  formatPitchPrice,
  normalizePitchSearch,
  preparePitchCatalog,
  searchPitches,
} from '../services/pitch-service.js';

const PAGE_SIZE = 6;
const FILTER_KEYS = ['q', 'location', 'date', 'time', 'pitchType', 'sort'];

const elements = {
  form: document.getElementById('filter-form'),
  sort: document.getElementById('search-sort'),
  summary: document.getElementById('result-summary'),
  results: document.getElementById('results'),
  pagination: document.getElementById('pagination'),
  sidebar: document.getElementById('search-sidebar'),
  toggle: document.getElementById('filter-toggle'),
  cardTemplate: document.getElementById('tpl-card'),
  emptyTemplate: document.getElementById('tpl-empty-state'),
};

let currentPage = 1;

function readFilters() {
  const params = new URLSearchParams(location.search);
  return normalizePitchSearch(Object.fromEntries(FILTER_KEYS.map(key => [key, params.get(key) ?? ''])));
}

function syncControls(filters) {
  if (!elements.form || !elements.sort) return;
  elements.form.elements.q.value = filters.q;
  elements.form.elements.location.value = filters.location;
  elements.form.elements.date.value = filters.date;
  elements.form.elements.time.value = filters.time;
  elements.sort.value = filters.sort;
  const pitchTypeControl = [...elements.form.elements.pitchType]
    .find(input => input.value === filters.pitchType);
  if (pitchTypeControl) pitchTypeControl.checked = true;
}

function writeFilters(input) {
  const filters = normalizePitchSearch(input);
  const params = new URLSearchParams();
  FILTER_KEYS.forEach(key => {
    const value = filters[key];
    if (value && !(key === 'sort' && value === 'recommended')) params.set(key, value);
  });
  history.pushState({}, '', params.size ? `?${params.toString()}` : location.pathname);
  currentPage = 1;
  renderResults();
}

function createPitchCard(pitch) {
  const node = elements.cardTemplate.content.cloneNode(true);
  const cardControl = node.querySelector('.search-page__card-link');
  const image = node.querySelector('.card__img');
  image.src = pitch.image;
  image.alt = `Hình ảnh ${pitch.name}`;
  node.querySelector('.card__title').textContent = pitch.name;
  node.querySelector('.card__meta').textContent = pitch.location;
  node.querySelector('.search-page__type').textContent = `${pitch.typeLabel} · ${pitch.surface}`;
  node.querySelector('.card__price').textContent = formatPitchPrice(pitch.price);
  node.querySelector('.card__badge').textContent = pitch.badge;
  node.querySelector('.search-page__rating').textContent = `★ ${pitch.rating.toFixed(1)}`;
  cardControl.setAttribute('aria-label', `Xem chi tiết ${pitch.name}`);
  cardControl.dataset.pitchId = String(pitch.id);
  cardControl.href = `pitch-detail.html?pitchId=${encodeURIComponent(pitch.id)}`;
  return node;
}

function renderPagination(total) {
  const pageCount = Math.ceil(total / PAGE_SIZE);
  elements.pagination.replaceChildren();
  if (pageCount <= 1) return;

  const createButton = (label, page, disabled = false) => {
    const button = document.createElement('button');
    button.className = `btn${page === currentPage ? ' is-active' : ''}`;
    button.type = 'button';
    button.textContent = label;
    button.disabled = disabled;
    if (page === currentPage) button.setAttribute('aria-current', 'page');
    if (!disabled) button.addEventListener('click', () => {
      currentPage = page;
      renderResults();
      elements.summary?.focus({ preventScroll: true });
    });
    return button;
  };

  elements.pagination.append(createButton('‹ Trước', currentPage - 1, currentPage === 1));
  for (let page = 1; page <= pageCount; page += 1) {
    elements.pagination.append(createButton(String(page), page));
  }
  elements.pagination.append(createButton('Sau ›', currentPage + 1, currentPage === pageCount));
}

function renderEmptyState() {
  const node = elements.emptyTemplate.content.cloneNode(true);
  node.querySelector('#clear-search-button')?.addEventListener('click', clearFilters);
  elements.results.replaceChildren(node);
  elements.pagination.replaceChildren();
}

function renderResults() {
  if (!elements.results || !elements.summary) return;
  const filters = readFilters();
  syncControls(filters);
  const pitches = searchPitches(filters);
  const pageCount = Math.max(1, Math.ceil(pitches.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visiblePitches = pitches.slice(start, start + PAGE_SIZE);

  if (!visiblePitches.length) {
    renderEmptyState();
    elements.summary.textContent = 'Không có sân đang hoạt động phù hợp với bộ lọc.';
    elements.results.setAttribute('aria-busy', 'false');
    return;
  }

  elements.results.replaceChildren(...visiblePitches.map(createPitchCard));
  const schedule = filters.date && filters.time ? ` · ${filters.date} lúc ${filters.time}` : '';
  elements.summary.textContent = `${pitches.length} sân phù hợp${schedule}`;
  elements.results.setAttribute('aria-busy', 'false');
  renderPagination(pitches.length);
}

function clearFilters() {
  elements.form?.reset();
  writeFilters({});
  elements.sidebar?.classList.remove('is-open');
  elements.toggle?.setAttribute('aria-expanded', 'false');
}

function configureDateRange() {
  const dateInput = elements.form?.elements.date;
  if (!dateInput) return;
  const today = new Date();
  const limit = new Date(today);
  limit.setDate(today.getDate() + 7);
  const toValue = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  dateInput.min = toValue(today);
  dateInput.max = toValue(limit);
}

function bindEvents() {
  elements.form?.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(elements.form);
    writeFilters(Object.fromEntries(FILTER_KEYS.map(key => [
      key,
      key === 'sort' ? elements.sort?.value ?? 'recommended' : data.get(key) ?? '',
    ])));
    elements.sidebar?.classList.remove('is-open');
    elements.toggle?.setAttribute('aria-expanded', 'false');
  });

  elements.form?.addEventListener('reset', event => {
    event.preventDefault();
    clearFilters();
  });

  elements.sort?.addEventListener('change', () => {
    writeFilters({ ...readFilters(), sort: elements.sort.value });
  });

  elements.toggle?.addEventListener('click', () => {
    const open = elements.sidebar?.classList.toggle('is-open') ?? false;
    elements.toggle.setAttribute('aria-expanded', String(open));
  });

  window.addEventListener('popstate', () => {
    currentPage = 1;
    renderResults();
  });
}

async function init() {
  try {
    await preparePitchCatalog();
    configureDateRange();
    bindEvents();
    renderResults();
  } catch {
    elements.results?.replaceChildren();
    if (elements.summary) elements.summary.textContent = 'Không thể tải danh sách sân.';
    elements.results?.setAttribute('aria-busy', 'false');
  }
}

init();
