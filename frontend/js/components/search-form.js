import { BOOKING_ADVANCE_DAYS } from '../core/config.js';
import { api } from '../services/api-client.js';
import { createIcon } from '../core/ui.js';
import { el, todayLocal, addDays, normalizeText, COMMON_FACILITIES } from '../core/render.js';
import { selectableHoursForDate } from './slot-picker.js';
import { page } from '../features/customer-kit.js';

export function normalizeLocationQuery(raw = '') {
  const norm = normalizeText(raw).replace(/[.,]/g, ' ').replace(/\b(quan|huyen|phuong|thanh pho|tp)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (norm === 'hn' || norm === 'tp hn' || norm === 'hanoi') return 'ha noi';
  if (norm === 'hcm' || norm === 'tphcm' || norm === 'sg') return 'ho chi minh';
  return norm;
}


let pitchCache = null;
function loadPitches() {
  if (!pitchCache) {
    pitchCache = api.entities.Pitch.filter({ status: 'active' }, { limit: 10000 })
      .then(res => res.items || [])
      .catch(() => { pitchCache = null; return []; });
  }
  return pitchCache;
}

const pitchNames = async () => [...new Set((await loadPitches()).map(p => p.name).filter(Boolean))];
const pitchAreas = async () => {
  const out = new Set();
  for (const p of await loadPitches()) {
    if (p.district && p.city) out.add(`${p.district}, ${p.city}`);
    if (p.city) out.add(p.city);
  }
  return [...out];
};

function attachSuggestions(input, source) {
  const listId = `${input.id}-suggestions`;
  const list = el('div', null, { id: listId, class: 'header-search-results suggest-results', role: 'listbox', hidden: true });
  input.parentElement.classList.add('suggest-field');
  input.after(list);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', listId);
  input.setAttribute('autocomplete', 'off');
  let active = -1;
  let version = 0;

  const close = () => {
    version++;
    list.hidden = true;
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };
  const pick = (value) => {
    input.value = value;
    close();
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const render = async () => {
    const term = normalizeText(input.value).trim();
    const mine = ++version;
    if (!term) { close(); return; }
    const all = await source();
    if (mine !== version) return;
    const matches = all.filter(item => normalizeText(item).includes(term) && normalizeText(item) !== term).slice(0, 8);
    active = -1;
    input.removeAttribute('aria-activedescendant');
    list.replaceChildren(...matches.map((item, i) => {
      const option = el('button', item, { type: 'button', role: 'option', id: `${listId}-${i}`, class: 'header-search-option', 'aria-selected': 'false', tabindex: '-1' });
      option.addEventListener('pointerdown', (e) => e.preventDefault());
      option.addEventListener('click', () => pick(item));
      return option;
    }));
    list.hidden = !matches.length;
    input.setAttribute('aria-expanded', String(!!matches.length));
  };

  input.addEventListener('focus', () => { loadPitches(); });
  input.addEventListener('input', render);
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (event) => {
    const options = [...list.querySelectorAll('[role="option"]')];
    if (event.key === 'Escape' && !list.hidden) { event.preventDefault(); close(); return; }
    if (list.hidden || !options.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      active = event.key === 'ArrowDown' ? (active + 1) % options.length : (active - 1 + options.length) % options.length;
      options.forEach((o, i) => o.setAttribute('aria-selected', String(i === active)));
      input.setAttribute('aria-activedescendant', options[active].id);
      options[active].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      pick(options[active].textContent);
    }
  });
}

export function createSearchFormElement(initialValues = {}, { advanced = false } = {}) {
  const minDate = todayLocal();
  const maxDate = addDays(minDate, BOOKING_ADVANCE_DAYS);
  const selectedDate = initialValues.date !== undefined
    ? initialValues.date
    : minDate;

  const form = el('form', null, { id: 'search-form', class: 'surface stack', novalidate: true, 'data-suspended-ok': '' });
  const basicGrid = el('div', null, { class: 'grid-3', utility: 'u-align-items-end' });

  const locInput = el('input', null, {
    id: 'search-location',
    name: 'location',
    type: 'text',
    placeholder: 'Quận Cầu Giấy, Hà Nội, tên đường...',
    value: initialValues.location || ''
  });
  const locGroup = el('div', null, { class: 'field-group' }, [
    el('label', 'Khu vực', { for: 'search-location' }),
    locInput
  ]);

  const dateInput = el('input', null, {
    id: 'search-date',
    name: 'date',
    type: 'date',
    min: minDate,
    max: maxDate,
    value: selectedDate
  });
  const dateGroup = el('div', null, { class: 'field-group' }, [
    el('label', 'Ngày', { for: 'search-date' }),
    dateInput
  ]);

  const timeSelect = el('select', null, { id: 'search-time', name: 'time' });
  function populateHours(dateVal, currentVal) {
    timeSelect.replaceChildren(el('option', 'Bất kỳ giờ trống', { value: '' }));
    for (const h of selectableHoursForDate(dateVal || minDate)) {
      const opt = el('option', `${h} (60 phút)`, { value: h });
      if (h === currentVal) opt.selected = true;
      timeSelect.append(opt);
    }
  }
  populateHours(selectedDate || minDate, initialValues.time || '');
  dateInput.addEventListener('change', () => populateHours(dateInput.value || minDate, timeSelect.value));

  const timeGroup = el('div', null, { class: 'field-group' }, [
    el('label', 'Giờ bắt đầu', { for: 'search-time' }),
    timeSelect
  ]);

  basicGrid.append(locGroup, dateGroup, timeGroup);

  const hasAdvInitial = Boolean(initialValues.q || initialValues.pitchType || initialValues.maxPrice || initialValues.facility || (initialValues.sort && initialValues.sort !== 'recommended'));
  const advPanel = el('div', null, { class: 'grid-4', hidden: !(advanced && hasAdvInitial), utility: 'u-padding-top-0p5rem u-border-top-1px-solid-border' });

  const qInput = el('input', null, {
    id: 'search-q',
    name: 'q',
    type: 'text',
    placeholder: 'Sân Thành Phát, Sân Đầm Hồng...',
    value: initialValues.q || ''
  });
  const qGroup = el('div', null, { class: 'field-group' }, [
    el('label', 'Tên sân', { for: 'search-q' }),
    qInput
  ]);

  const typeSelect = el('select', null, { id: 'search-type', name: 'pitchType' }, [
    el('option', 'Tất cả loại sân', { value: '' }),
    el('option', 'Sân 5 người', { value: '5v5' }),
    el('option', 'Sân 7 người', { value: '7v7' }),
    el('option', 'Sân 11 người', { value: '11v11' })
  ]);
  typeSelect.value = initialValues.pitchType || '';
  const typeGroup = el('div', null, { class: 'field-group' }, [
    el('label', 'Loại sân', { for: 'search-type' }),
    typeSelect
  ]);

  const maxPriceInput = el('input', null, {
    id: 'search-max-price',
    name: 'maxPrice',
    type: 'number',
    min: '0',
    step: '50000',
    placeholder: '400000',
    value: initialValues.maxPrice || ''
  });
  const priceGroup = el('div', null, { class: 'field-group' }, [
    el('label', 'Giá tối đa (₫/giờ)', { for: 'search-max-price' }),
    maxPriceInput
  ]);

  const facSelect = el('select', null, { id: 'search-facility', name: 'facility' }, [
    el('option', 'Bất kỳ tiện ích', { value: '' }),
    ...COMMON_FACILITIES.map(f => el('option', f, { value: f }))
  ]);
  facSelect.value = initialValues.facility === 'Bãi gửi xe' ? 'Bãi đỗ xe' : initialValues.facility || '';
  const facGroup = el('div', null, { class: 'field-group' }, [
    el('label', 'Tiện ích', { for: 'search-facility' }),
    facSelect
  ]);

  const sortSelect = el('select', null, { id: 'search-sort', name: 'sort' }, [
    el('option', 'Phù hợp nhất', { value: 'recommended' }),
    el('option', 'Giá thấp đến cao', { value: 'price-asc' }),
    el('option', 'Giá cao đến thấp', { value: 'price-desc' }),
    el('option', 'Đánh giá cao nhất', { value: 'rating-desc' })
  ]);
  sortSelect.value = initialValues.sort || 'recommended';
  const sortGroup = el('div', null, { class: 'field-group' }, [
    el('label', 'Sắp xếp', { for: 'search-sort' }),
    sortSelect
  ]);

  advPanel.append(qGroup, typeGroup, priceGroup, facGroup, sortGroup);

  const btnRow = el('div', null, { class: 'row', utility: 'u-gap-0p5rem' });
  const submitBtn = el('button', null, { type: 'submit', class: 'button', utility: 'u-gap-0p5rem' }, [
    createIcon('Search', 16),
    el('span', 'Tìm sân trống')
  ]);
  const resetBtn = el('button', null, { type: 'button', class: 'button secondary', utility: 'u-gap-0p5rem' }, [
    createIcon('SlidersHorizontal', 16),
    el('span', 'Xóa bộ lọc')
  ]);
  btnRow.append(submitBtn, resetBtn);

  if (advanced) {
    const advLabelSpan = el('span', hasAdvInitial ? 'Ẩn bộ lọc nâng cao' : 'Bộ lọc nâng cao');
    const advCountBadge = el('span', '0', { class: 'filter-count-badge', hidden: true });
    const advToggleBtn = el('button', null, {
      type: 'button',
      class: 'button secondary sm',
      'aria-expanded': String(hasAdvInitial)
    }, [createIcon('SlidersHorizontal', 14), advLabelSpan, advCountBadge]);

    function updateAdvCount() {
      let c = 0;
      if (qInput.value.trim()) c++;
      if (typeSelect.value) c++;
      if (Number(maxPriceInput.value) > 0) c++;
      if (facSelect.value) c++;
      if (sortSelect.value && sortSelect.value !== 'recommended') c++;
      advCountBadge.textContent = String(c);
      advCountBadge.hidden = c === 0;
      advLabelSpan.textContent = advPanel.hidden ? 'Bộ lọc nâng cao' : 'Ẩn bộ lọc nâng cao';
    }
    advToggleBtn.addEventListener('click', () => {
      advPanel.hidden = !advPanel.hidden;
      advToggleBtn.setAttribute('aria-expanded', String(!advPanel.hidden));
      updateAdvCount();
    });
    for (const ctrl of [qInput, typeSelect, maxPriceInput, facSelect, sortSelect]) {
      ctrl.addEventListener('input', updateAdvCount);
      ctrl.addEventListener('change', updateAdvCount);
    }
    form.addEventListener('reset-filters', updateAdvCount);
    updateAdvCount();
    btnRow.append(advToggleBtn);
  }

  resetBtn.addEventListener('click', () => {
    locInput.value = '';
    dateInput.value = advanced ? minDate : '';
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    populateHours(minDate, '');
    qInput.value = '';
    typeSelect.value = '';
    maxPriceInput.value = '';
    facSelect.value = '';
    sortSelect.value = 'recommended';
    form.dispatchEvent(new Event('reset-filters'));
    if (page === 'search') {
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });

  attachSuggestions(locInput, pitchAreas);
  attachSuggestions(qInput, pitchNames);

  form.append(basicGrid, advPanel, btnRow);
  return form;
}
