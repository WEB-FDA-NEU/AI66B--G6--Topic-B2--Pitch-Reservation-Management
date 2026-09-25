import { MOCK_PITCHES, formatPitchPrice } from '../data/pitches.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const PAGE_SIZE = 6;
const favoriteIds = new Set();

const elements = {
  grid: document.getElementById('results'),
  form: document.getElementById('filter-form'),
  sort: document.getElementById('sort'),
  summary: document.getElementById('result-summary'),
  pagination: document.getElementById('pagination'),
  sidebar: document.getElementById('search-sidebar'),
  toggle: document.getElementById('filter-toggle'),
};

function readFilters() {
  const params = new URLSearchParams(location.search);
  return {
    q: params.get('q') ?? '',
    pitchType: params.get('pitchType') ?? '',
    date: params.get('date') ?? '',
    time: params.get('time') ?? '',
    min_price: params.get('min_price') ?? '',
    max_price: params.get('max_price') ?? '',
    sort: params.get('sort') ?? 'recommended',
    page: Math.max(1, Number(params.get('page') ?? 1)),
  };
}

function syncControls(filters) {
  elements.form.elements.q.value = filters.q;
  elements.form.elements.date.value = filters.date;
  elements.form.elements.time.value = filters.time;
  elements.form.elements.min_price.value = filters.min_price;
  elements.form.elements.max_price.value = filters.max_price;
  elements.sort.value = filters.sort;
  const typeControl = [...elements.form.elements.pitchType]
    .find(input => input.value === filters.pitchType);
  if (typeControl) typeControl.checked = true;
}

function writeFilters(patch = {}) {
  const next = { ...readFilters(), ...patch };
  if (!Object.hasOwn(patch, 'page')) next.page = 1;
  const params = new URLSearchParams();
  Object.entries(next).forEach(([key, value]) => {
    if (value !== '' && value != null && !(key === 'page' && value === 1)) {
      params.set(key, String(value));
    }
  });
  history.pushState({}, '', params.size ? `?${params}` : location.pathname);
  renderResults();
}

function getFilteredPitches(filters) {
  const query = filters.q.trim().toLocaleLowerCase('vi');
  let items = MOCK_PITCHES.filter(pitch => {
    const matchesText = !query
      || pitch.name.toLocaleLowerCase('vi').includes(query)
      || pitch.location.toLocaleLowerCase('vi').includes(query);
    const matchesType = !filters.pitchType || pitch.type === filters.pitchType;
    const matchesMin = !filters.min_price || pitch.price >= Number(filters.min_price);
    const matchesMax = !filters.max_price || pitch.price <= Number(filters.max_price);
    return matchesText && matchesType && matchesMin && matchesMax;
  });

  if (filters.sort === 'rating_desc') items = [...items].sort((a, b) => b.rating - a.rating);
  if (filters.sort === 'price_asc') items = [...items].sort((a, b) => a.price - b.price);
  if (filters.sort === 'price_desc') items = [...items].sort((a, b) => b.price - a.price);
  if (filters.sort === 'recommended') {
    items = [...items].sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
  }
  return items;
}

function createPitchCard(pitch) {
  const node = document.getElementById('tpl-card').content.cloneNode(true);
  const link = node.querySelector('.card__link');
  const image = node.querySelector('.card__img');
  const favoriteButton = node.querySelector('.card__favorite');
  const rating = node.querySelector('.card__rating');

  link.href = `pitch_detail.html?id=${pitch.id}`;
  image.src = pitch.image;
  image.alt = `Hình ảnh ${pitch.name}`;
  node.querySelector('.card__title').textContent = pitch.name;
  node.querySelector('.card__meta').textContent = pitch.location;
  node.querySelector('.card__type').textContent = pitch.typeLabel;
  node.querySelector('.card__price').textContent = formatPitchPrice(pitch.price);
  node.querySelector('.card__badge').textContent = pitch.badge;
  rating.textContent = `★ ${pitch.rating.toFixed(1)}`;
  rating.setAttribute('aria-label', `${pitch.rating.toFixed(1)} trên 5 sao`);
  favoriteButton.setAttribute('aria-label', `Thêm ${pitch.name} vào danh sách yêu thích`);
  favoriteButton.addEventListener('click', () => toggleFavorite(pitch, favoriteButton));
  return node;
}

function toggleFavorite(pitch, button) {
  const active = !favoriteIds.has(pitch.id);
  if (active) favoriteIds.add(pitch.id);
  else favoriteIds.delete(pitch.id);
  button.classList.toggle('is-active', active);
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', active
    ? `Bỏ ${pitch.name} khỏi danh sách yêu thích`
    : `Thêm ${pitch.name} vào danh sách yêu thích`);
  button.querySelector('[aria-hidden="true"]').textContent = active ? '♥' : '♡';
}

function renderPagination(total, currentPage) {
  const pageCount = Math.ceil(total / PAGE_SIZE);
  elements.pagination.replaceChildren();
  if (pageCount <= 1) return;

  const createButton = (label, page, options = {}) => {
    const button = document.createElement('button');
    button.className = `btn${options.active ? ' is-active' : ''}`;
    button.type = 'button';
    button.textContent = label;
    button.disabled = options.disabled ?? false;
    if (options.active) button.setAttribute('aria-current', 'page');
    if (!button.disabled) button.addEventListener('click', () => writeFilters({ page }));
    return button;
  };

  elements.pagination.append(createButton('‹ Trước', currentPage - 1, { disabled: currentPage === 1 }));
  for (let page = 1; page <= pageCount; page += 1) {
    elements.pagination.append(createButton(String(page), page, { active: page === currentPage }));
  }
  elements.pagination.append(createButton('Sau ›', currentPage + 1, { disabled: currentPage === pageCount }));
}

function renderResults() {
  const filters = readFilters();
  syncControls(filters);
  const filtered = getFilteredPitches(filters);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  if (pageItems.length === 0) {
    const emptyState = document.getElementById('tpl-empty-state').content.cloneNode(true);
    elements.grid.replaceChildren(emptyState);
    elements.summary.textContent = 'Không tìm thấy sân phù hợp.';
    elements.pagination.replaceChildren();
    return;
  }

  elements.grid.replaceChildren(...pageItems.map(createPitchCard));
  const schedule = filters.date && filters.time ? ` · ${filters.date} lúc ${filters.time}` : '';
  elements.summary.textContent = `${filtered.length} sân phù hợp${schedule}`;
  renderPagination(filtered.length, page);
}

elements.form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(elements.form);
  writeFilters({
    q: data.get('q') ?? '',
    pitchType: data.get('pitchType') ?? '',
    date: data.get('date') ?? '',
    time: data.get('time') ?? '',
    min_price: data.get('min_price') ?? '',
    max_price: data.get('max_price') ?? '',
  });
  elements.sidebar.classList.remove('is-open');
  elements.toggle.setAttribute('aria-expanded', 'false');
});

elements.form.addEventListener('reset', event => {
  event.preventDefault();
  history.pushState({}, '', location.pathname);
  renderResults();
});

elements.sort.addEventListener('change', () => writeFilters({ sort: elements.sort.value }));
elements.toggle.addEventListener('click', () => {
  const open = elements.sidebar.classList.toggle('is-open');
  elements.toggle.setAttribute('aria-expanded', String(open));
});
window.addEventListener('popstate', renderResults);

renderResults();
