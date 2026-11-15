import { api } from '../services/api-client.js';
import { renderBadge, updateLiquidIndicator, animateTabPanel } from '../core/ui.js';
import { el, formatVnd, formatDate, bookingBadge, paymentBadge, paymentBadgeShown, buildDirectionsLink, createPager, sortBookings, readBookingSort, buildBookingSortField, infoList } from '../core/render.js';
import { $, ensureAuthenticated, params, bootCustomerPage } from '../features/customer-kit.js';

async function renderBookingHistoryPage() {
  const main = $('#main');
  if (!main) return;
  main.className = 'container stack-lg';
  const u = await ensureAuthenticated();
  if (!u) return;

  const res = await api.entities.Booking.filter({ customer_id: u.id }, { sort: '-created_date' });
  const all = res.items || [];
  let activeTab = params.get('tab') || 'upcoming';

  const header = el('header', null, { class: 'page-header row-between' }, [
    el('div', null, {}, [
      el('p', 'Quản lý lịch thi đấu', { class: 'eyebrow' }),
      el('h1', 'Đơn đặt sân của tôi')
    ]),
    el('a', '+ Đặt sân mới', { href: 'search.html', class: 'button sm' })
  ]);

  const tabsWrap = el('div', null, { class: 'tabs', role: 'tablist', 'aria-label': 'Lọc đơn đặt sân' });
  const resultsList = el('div', null, { id: 'results', class: 'stack', role: 'tabpanel' });

  const tabDefs = [
    ['upcoming', 'Sắp tới / Giữ chỗ', b => ['pending', 'confirmed'].includes(b.status)],
    ['completed', 'Đã hoàn thành', b => b.status === 'completed'],
    ['cancelled', 'Đã hủy / Hết hạn', b => b.status === 'cancelled'],
    ['all', 'Tất cả', () => true]
  ];

  if (!tabDefs.some(([key]) => key === activeTab)) {
    activeTab = 'upcoming';
    const url = new URL(location.href); url.searchParams.set('tab', activeTab); history.replaceState(null, '', url);
  }

  // Mặc định: tab Sắp tới theo giờ đá sớm nhất, tab khác theo thao tác gần đây.
  let chosenSort = readBookingSort();
  const effectiveSort = () => chosenSort || (activeTab === 'upcoming' ? 'date-asc' : 'recent');
  const { field: sortField, select: sortSelect } = buildBookingSortField({
    id: 'bh-sort',
    value: effectiveSort(),
    onChange(value) { chosenSort = value; renderList(); animateTabPanel(resultsList); }
  });
  const listToolbar = el('div', null, { class: 'list-toolbar' }, [sortField]);

  const tabBtnMap = new Map();
  for (const [key] of tabDefs) {
    const btn = el('button', '', {
      type: 'button',
      role: 'tab',
      'aria-controls': 'results',
      id: `booking-tab-${key}`,
      class: 'tab-btn'
    });
    btn.addEventListener('click', () => {
      if (activeTab === key) return;
      activeTab = key;
      const url = new URL(location.href);
      if (key === 'upcoming') url.searchParams.delete('tab');
      else url.searchParams.set('tab', key);
      history.replaceState(null, '', url);
      renderList();
      animateTabPanel(resultsList);
      btn.focus({ preventScroll: true });
    });
    tabBtnMap.set(key, btn);
    tabsWrap.append(btn);
  }

  function renderList() {
    for (const [key, label, pred] of tabDefs) {
      const count = all.filter(pred).length;
      const isSel = key === activeTab;
      const btn = tabBtnMap.get(key);
      if (!btn) continue;
      btn.textContent = `${label} (${count})`;
      btn.tabIndex = isSel ? 0 : -1;
      btn.classList.toggle('active', isSel);
      btn.setAttribute('aria-selected', String(isSel));
    }
    updateLiquidIndicator(tabsWrap, '.tab-btn[aria-selected="true"]');

    const currentDef = tabDefs.find(t => t[0] === activeTab) || tabDefs[0];
    resultsList.setAttribute('aria-labelledby', `booking-tab-${currentDef[0]}`);
    const filtered = all.filter(currentDef[2]);
    const now = Date.now();
    const startOf = b => Date.parse(b.starts_at) || Date.parse(`${b.local_date}T${b.start_time || '00:00'}:00+07:00`) || 0;
    const endOf = b => Date.parse(b.ends_at) || startOf(b);
    const phase = b => {
      if (!['pending', 'confirmed'].includes(b.status)) return 2;
      return startOf(b) <= now && now < endOf(b) ? 0 : 1;
    };
    const mode = effectiveSort();
    sortSelect.value = mode;
    let sorted = sortBookings(filtered, mode);
    // Trận đang đá đứng đầu tab Sắp tới.
    if (activeTab === 'upcoming' && mode === 'date-asc') sorted = sorted.sort((a, b) => phase(a) - phase(b));
    filtered.splice(0, filtered.length, ...sorted);
    const pageRows = pager.slice(filtered, `${activeTab}|${mode}`);
    resultsList.replaceChildren();

    if (!filtered.length) {
      resultsList.append(
        el('div', null, { class: 'empty' }, [
          el('h2', 'Chưa có đơn đặt sân trong mục này'),
          el('p', 'Hãy tìm sân bóng phù hợp và chọn khung giờ trống để bắt đầu.'),
          el('a', 'Tìm sân ngay', { href: 'search.html', class: 'button sm', utility: 'u-margin-top-0p5rem' })
        ])
      );
      return;
    }

    for (const b of pageRows) {
      const startsInMs = Date.parse(b.starts_at) - Date.now();
      const isSoon = b.status === 'confirmed' && startsInMs > 0 && startsInMs <= 24 * 3600 * 1000;
      const card = el('article', null, { class: 'surface row-between', 'data-memory-id': `booking-${b.id}` }, [
        el('div', null, { class: 'stack-sm' }, [
          el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
            el('span', b.code, { class: 'text-xs font-bold muted' }),
            renderBadge(bookingBadge(b), b.status),
            paymentBadgeShown(b) ? renderBadge(paymentBadge(b), b.payment_status) : null,
            b.status === 'confirmed' && startOf(b) <= now && now < endOf(b)
              ? el('span', 'Đang đá', { class: 'badge badge--success' })
              : b.status === 'confirmed' && startOf(b) > now
                ? el('span', isSoon ? 'Diễn ra trong 24h tới' : 'Sắp diễn ra', { class: 'badge badge--info' })
                : null
          ]),
          el('h2', b.pitch_name || 'Sân bóng', { utility: 'u-font-size-1p15rem' }),
          infoList([['Ngày đá', formatDate(b.local_date)], ['Giờ đá', b.slot_label || b.start_time], ['Số tiền', formatVnd(b.amount_vnd), { strong: true }]], { className: 'text-sm' })
        ]),
        el('div', null, { class: 'row' }, [
          b.status === 'pending'
            ? el('a', 'Thanh toán ngay', { href: `booking-confirmation.html?id=${encodeURIComponent(b.id)}`, class: 'button sm' })
            : null,
          b.status === 'confirmed' ? buildDirectionsLink(b, 'sm') : null,
          el('a', b.status === 'completed' && !b.reviewed ? 'Xem đơn và đánh giá' : 'Xem chi tiết', { href: `booking-details.html?id=${encodeURIComponent(b.id)}`, class: 'button secondary sm' })
        ])
      ]);
      resultsList.append(card);
    }
  }

  const pager = createPager({ pageSize: 10, noun: 'đơn', onChange: () => renderList(), scrollTarget: tabsWrap });
  renderList();
  main.replaceChildren(header, tabsWrap, listToolbar, resultsList, pager.el, el('p', '', { id: 'error', role: 'alert' }));
}

bootCustomerPage(user => renderBookingHistoryPage(user));
