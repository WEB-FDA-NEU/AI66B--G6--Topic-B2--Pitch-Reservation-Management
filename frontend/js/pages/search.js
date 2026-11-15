import { api } from '../services/api-client.js';
import { BOOKING_ADVANCE_DAYS } from '../core/config.js';
import { el, formatVnd, formatDate, todayLocal, addDays, normalizeText, PITCH_TYPE_LABEL, createPager } from '../core/render.js';
import { buildPitchCard, fetchReviewSummaries } from '../components/pitch-card.js';
import { createSearchFormElement, normalizeLocationQuery } from '../components/search-form.js';
import { $, params, say, validBookingDate, bootCustomerPage } from '../features/customer-kit.js';

async function renderSearchPage() {
  const main = $('#main');
  if (!main) return;
  main.className = 'container stack-lg page-flow';

  const initial = {
    location: params.get('location') || '',
    date: validBookingDate(params.get('date')) ? params.get('date') : todayLocal(),
    time: params.get('time') || '',
    q: params.get('q') || '',
    pitchType: params.get('pitchType') || '',
    maxPrice: params.get('maxPrice') || '',
    facility: params.get('facility') || '',
    sort: params.get('sort') || 'recommended'
  };

  if (params.has('date') && !validBookingDate(params.get('date'))) {
    const url = new URL(location.href); url.searchParams.set('date', initial.date); history.replaceState(null, '', url);
  }

  const header = el('header', null, { class: 'page-header' }, [
    el('p', 'Tìm kiếm', { class: 'eyebrow' }),
    el('h1', 'Kết quả sân bóng'),
    el('p', 'Chọn ngày để xem sân còn giờ trống. Giá có thể khác nhau tùy ngày.', { class: 'muted' })
  ]);

  const searchForm = createSearchFormElement(initial, { advanced: true });
  const activeChipsRow = el('div', null, { class: 'active-filters-bar', hidden: true, 'aria-label': 'Các bộ lọc đang áp dụng' });
  const statusRow = el('div', null, { class: 'row-between' });
  const countEl = el('p', 'Đang tìm sân...', { id: 'count', class: 'font-bold' });
  statusRow.append(countEl);

  const resultsGrid = el('div', null, { id: 'results', class: 'grid-3' });
  const errEl = el('p', '', { id: 'error', role: 'alert' });

  let autoAdvance = !validBookingDate(params.get('date')) && !params.get('time');
  const autoNotice = el('div', '', { class: 'alert alert--info text-sm', role: 'status', hidden: true });

  let searchRequest = 0;
  const pager = createPager({ pageSize: 12, noun: 'sân', onChange: () => executeSearch(), scrollTarget: () => statusRow });

  async function executeSearch() {
    const request = ++searchRequest;
    countEl.textContent = 'Đang tìm sân…';
    const fd = new FormData(searchForm);
    const state = Object.fromEntries(fd.entries());
    const dateVal = state.date || todayLocal();
    const timeVal = state.time || '';
    const pitchType = state.pitchType || '';
    const maxPrice = Number(state.maxPrice || 0);
    const facility = state.facility || '';
    const sortBy = state.sort || 'recommended';
    const rawQ = (state.q || '').trim();
    const rawLoc = (state.location || '').trim();

    let res, reviewMap;
    try {
      [res, reviewMap] = await Promise.all([
        api.functions.invoke('searchPitches', {
          date: dateVal,
          time: timeVal || undefined,
          pitchType: pitchType || undefined
        }),
        fetchReviewSummaries()
      ]);
      if (request !== searchRequest) return;
      if (res.data?.error) throw new Error(res.data.error);
    } catch (error) {
      if (request !== searchRequest) return;
      countEl.textContent = 'Chưa tải được kết quả.';
      resultsGrid.replaceChildren();
      say(error.message || 'Không tìm được sân. Vui lòng thử lại.');
      return;
    }
    say('');
    let items = res.data?.results || [];
    if (rawQ) {
      const qNorm = normalizeText(rawQ);
      items = items.filter(p => normalizeText(`${p.name} ${p.address} ${p.district} ${p.city}`).includes(qNorm));
    }
    if (rawLoc) {
      const locNorm = normalizeLocationQuery(rawLoc);
      const terms = locNorm.split(/\s+/).filter(Boolean);
      items = items.filter(p => {
        const location = normalizeLocationQuery(`${p.district} ${p.city} ${p.address} ${p.name}`);
        return terms.every(term => location.includes(term));
      });
    }
    if (maxPrice > 0) {
      items = items.filter(p => Number(p.price_on_date ?? p.base_price_vnd) <= maxPrice);
    }
    if (facility) {
      const facNorm = normalizeText(facility);
      items = items.filter(p => Array.isArray(p.facilities) && p.facilities.some(f => normalizeText(f === 'Bãi gửi xe' ? 'Bãi đỗ xe' : f).includes(facNorm)));
    }
    const beforeDateFilter = items;
    if (dateVal) {
      items = items.filter(p => (p.available_count ?? 1) > 0);
    }

    if (autoAdvance) {
      autoAdvance = false;
      const nearest = beforeDateFilter.map(p => p.next_slot?.local_date).filter(Boolean).sort()[0];
      if (!items.length && nearest && nearest > dateVal) {
        searchForm.elements.date.value = nearest;
        searchForm.elements.date.dispatchEvent(new Event('change'));
        const url = new URL(location.href);
        url.searchParams.set('date', nearest);
        history.replaceState(null, '', url);
        autoNotice.textContent = `Hôm nay đã hết khung giờ trống nên hệ thống tự động chuyển sang ngày gần nhất còn sân (${formatDate(nearest)}).`;
        autoNotice.hidden = false;
        return executeSearch();
      }
    }

    if (sortBy === 'price-asc') {
      items.sort((a, b) => Number(a.price_on_date ?? a.base_price_vnd) - Number(b.price_on_date ?? b.base_price_vnd));
    } else if (sortBy === 'price-desc') {
      items.sort((a, b) => Number(b.price_on_date ?? b.base_price_vnd) - Number(a.price_on_date ?? a.base_price_vnd));
    } else if (sortBy === 'rating-desc') {
      items.sort((a, b) => (reviewMap[b.id]?.avg || 0) - (reviewMap[a.id]?.avg || 0));
    } else {
      items.sort((a, b) => (b.available_count || 0) - (a.available_count || 0));
    }

    const activeDefs = [];
    if (rawLoc) activeDefs.push(['Khu vực', rawLoc, () => { searchForm.elements.location.value = ''; }]);
    if (timeVal) activeDefs.push(['Giờ', timeVal, () => { searchForm.elements.time.value = ''; }]);
    if (rawQ) activeDefs.push(['Tên sân', rawQ, () => { searchForm.elements.q.value = ''; }]);
    if (pitchType) activeDefs.push(['Loại sân', PITCH_TYPE_LABEL[pitchType] || pitchType, () => { searchForm.elements.pitchType.value = ''; }]);
    if (maxPrice > 0) activeDefs.push(['Tối đa', formatVnd(maxPrice), () => { searchForm.elements.maxPrice.value = ''; }]);
    if (facility) activeDefs.push(['Tiện ích', facility, () => { searchForm.elements.facility.value = ''; }]);
    if (sortBy && sortBy !== 'recommended') {
      const sortNames = { 'price-asc': 'Giá tăng dần', 'price-desc': 'Giá giảm dần', 'rating-desc': 'Đánh giá cao' };
      activeDefs.push(['Sắp xếp', sortNames[sortBy] || sortBy, () => { searchForm.elements.sort.value = 'recommended'; }]);
    }
    activeChipsRow.replaceChildren();
    if (activeDefs.length) {
      activeChipsRow.hidden = false;
      activeChipsRow.append(el('span', 'Đang lọc:', { class: 'text-xs font-bold muted' }));
      for (const [kLabel, vLabel, clearFn] of activeDefs) {
        const chipBtn = el('button', null, {
          type: 'button',
          class: 'active-filter-chip',
          'aria-label': `Bỏ lọc ${kLabel}: ${vLabel}`
        }, [
          el('span', `${kLabel}: `, { class: 'muted' }),
          el('strong', vLabel),
          el('span', '×', { class: 'active-filter-chip-close', 'aria-hidden': 'true' })
        ]);
        chipBtn.addEventListener('click', () => {
          clearFn();
          searchForm.dispatchEvent(new Event('reset-filters'));
          searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
          searchForm.querySelector('input, select, button')?.focus({ preventScroll: true });
        });
        activeChipsRow.append(chipBtn);
      }
    } else {
      activeChipsRow.hidden = true;
    }

    countEl.textContent = `Tìm thấy ${items.length} sân phù hợp cho ngày ${formatDate(dateVal)}${timeVal ? ` lúc ${timeVal}` : ''}`;
    resultsGrid.replaceChildren();
    const pageRows = pager.slice(items, location.search);
    pager.el.hidden = !items.length;

    if (!items.length) {
      const pitchFilters = activeDefs.some(([key]) => !['Giờ', 'Sắp xếp'].includes(key));
      const nextDayUrl = new URL(location.href);
      nextDayUrl.searchParams.set('date', addDays(dateVal, 1));
      const nextDayHref = `search.html${nextDayUrl.search}`;
      const emptyBox = el('div', null, { class: 'empty', utility: 'u-grid-column-1-over-n1' }, [
        el('h2', 'Không tìm thấy sân phù hợp'),
        el('p', pitchFilters
          ? 'Không có sân nào khớp với bộ lọc hiện tại. Hãy bỏ bớt bộ lọc (tên sân, khu vực, loại sân, giá hoặc tiện ích) rồi thử lại.'
          : activeDefs.length ? 'Hãy thử chọn ngày khác hoặc đổi khung giờ.' : 'Ngày đã chọn không còn sân trống. Hãy thử chọn một ngày khác.'),
        !pitchFilters && dateVal < addDays(todayLocal(), BOOKING_ADVANCE_DAYS) ? el('a', 'Xem ngày tiếp theo', { href: nextDayHref, class: 'button secondary sm' }) : null,
        activeDefs.length ? el('button', 'Xóa toàn bộ bộ lọc', {
          type: 'button',
          class: 'button secondary sm',
          utility: 'u-margin-top-0p5rem'
        }) : null
      ]);
      emptyBox.querySelector('button')?.addEventListener('click', () => {
        location.href = 'search.html';
      });
      resultsGrid.append(emptyBox);
      return;
    }

    for (const p of pageRows) {
      resultsGrid.append(buildPitchCard(p, reviewMap[p.id], { dateParam: dateVal }));
    }
  }

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    autoNotice.hidden = true;
    const fd = new FormData(searchForm);
    const nextParams = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (String(v).trim()) nextParams.set(k, String(v).trim());
    }
    const nextUrl = new URL('search.html', location.href);
    nextUrl.search = nextParams.toString();
    if (nextUrl.href !== location.href) history.pushState(null, '', nextUrl);
    executeSearch().catch(err => { countEl.textContent = 'Chưa tải được kết quả.'; say(err.message); });
  });

  window.addEventListener('popstate', () => location.reload());

  main.replaceChildren(header, searchForm, activeChipsRow, autoNotice, statusRow, resultsGrid, pager.el, errEl);
  await executeSearch();
}

bootCustomerPage(user => renderSearchPage(user));
