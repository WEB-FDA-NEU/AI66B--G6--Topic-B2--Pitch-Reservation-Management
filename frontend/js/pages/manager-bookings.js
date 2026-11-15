import { api } from '../services/api-client.js';
import { toast, renderBadge, renderStatCard, updateLiquidIndicator, animateTabPanel } from '../core/ui.js';
import { el, formatVnd, formatDate, todayLocal, addDays, normalizeText, bookingBadge, paymentBadge, paymentBadgeShown, createPager, sortBookings, readBookingSort, buildBookingSortField, infoList } from '../core/render.js';
import { holdText } from '../core/config.js';
import { content, currentUser, fetchRows, openActionDialog, params, bootManagement } from '../features/management-kit.js';

async function renderManagerBookings() {
  const pitchId = params.get('id') || params.get('pitchId') || '';
  const [pitches, allBookings] = await Promise.all([
    fetchRows('Pitch', { manager_id: currentUser.id }),
    fetchRows('Booking', { manager_id: currentUser.id })
  ]);

  let selectedPitchId = pitchId;
  let activeTab = params.get('tab') || 'upcoming';
  if (!['upcoming', 'completed', 'cancelled', 'all'].includes(activeTab)) {
    activeTab = 'upcoming';
    const url = new URL(location.href); url.searchParams.set('tab', activeTab); history.replaceState(null, '', url);
  }
  let searchQuery = '';
  let calStartDate = todayLocal();
  let calRangeDays = 7;

  const filterCard = el('section', null, { class: 'surface stack' });
  const pitchSelect = el('select', null, { id: 'mb-pitch', 'aria-label': 'Chọn sân bóng' }, [
    el('option', 'Tất cả sân', { value: '' }),
    ...pitches.map(p => el('option', p.name, { value: p.id }))
  ]);
  pitchSelect.value = selectedPitchId;

  const searchInput = el('input', null, {
    id: 'mb-search',
    placeholder: 'Tìm theo mã đơn hoặc tên khách hàng...',
    value: ''
  });

  const dateInput = el('input', null, {
    id: 'mb-date',
    type: 'date',
    value: calStartDate
  });

  const rangeSelect = el('select', null, { id: 'mb-range', 'aria-label': 'Phạm vi ngày' }, [
    el('option', 'Xem 7 ngày tới', { value: '7' }),
    el('option', 'Chỉ xem 1 ngày', { value: '1' }),
    el('option', 'Tất cả ngày', { value: '0' })
  ]);
  rangeSelect.value = '0';
  calRangeDays = Number(rangeSelect.value);

  filterCard.append(
    el('div', null, { class: 'grid-4', utility: 'u-align-items-end' }, [
      el('div', null, { class: 'field-group' }, [el('label', 'Sân bóng', { for: 'mb-pitch' }), pitchSelect]),
      el('div', null, { class: 'field-group' }, [el('label', 'Tìm kiếm đơn', { for: 'mb-search' }), searchInput]),
      el('div', null, { class: 'field-group' }, [el('label', 'Từ ngày', { for: 'mb-date' }), dateInput]),
      el('div', null, { class: 'field-group' }, [el('label', 'Phạm vi lịch', { for: 'mb-range' }), rangeSelect])
    ])
  );

  const pitchNotice = el('div', null, { role: 'status' });
  function renderPitchNotice() {
    const pitch = pitches.find(p => p.id === selectedPitchId);
    if (!pitch) { pitchNotice.hidden = true; pitchNotice.replaceChildren(); return; }
    const own = allBookings.filter(b => b.pitch_id === pitch.id);
    const upcoming = own.filter(b => ['pending', 'confirmed'].includes(b.status)).length;
    const showAll = el('button', 'Xem đơn của tất cả sân', { type: 'button', class: 'link-button text-sm' });
    showAll.addEventListener('click', () => { pitchSelect.value = ''; pitchSelect.dispatchEvent(new Event('change')); });
    pitchNotice.hidden = false;
    pitchNotice.className = `alert ${upcoming ? 'alert--info' : 'alert--success'} text-sm row-between`;
    pitchNotice.replaceChildren(
      el('span', upcoming
        ? `Đang xem đơn của ${pitch.name}: ${upcoming} đơn sắp tới hoặc đang giữ chỗ.`
        : own.length
          ? `${pitch.name} hiện chưa có đơn sắp tới. Các đơn cũ vẫn xem được ở tab "Đã hoàn thành" và "Đã hủy / Hết hạn".`
          : `${pitch.name} chưa có đơn đặt sân nào. Khi khách đặt sân này, đơn sẽ hiện ở đây và bạn sẽ nhận được thông báo.`),
      showAll
    );
  }

  // Mặc định: tab Sắp tới theo giờ đá sớm nhất, tab khác theo thao tác gần đây.
  let chosenSort = readBookingSort();
  const effectiveSort = () => chosenSort || (activeTab === 'upcoming' ? 'date-asc' : 'recent');
  const { field: sortField, select: sortSelect } = buildBookingSortField({
    id: 'mb-sort',
    value: effectiveSort(),
    onChange(value) { chosenSort = value; updateView({ skipStats: true }); animateTabPanel(listContainer); }
  });
  const listToolbar = el('div', null, { class: 'list-toolbar' }, [sortField]);

  const statsContainer = el('div', null, { class: 'grid-3' });
  const tabsWrap = el('div', null, { class: 'tabs', role: 'tablist', 'aria-label': 'Trạng thái đơn' });
  const listContainer = el('div', null, { id: 'manager-bookings-panel', role: 'tabpanel', class: 'stack' });

  function updateView({ skipStats = false } = {}) {
    renderPitchNotice();
    let scoped = selectedPitchId ? allBookings.filter(b => b.pitch_id === selectedPitchId) : allBookings;

    if (calRangeDays > 0 && dateInput.value) {
      const startD = dateInput.value;
      const endD = addDays(startD, calRangeDays - 1);
      scoped = scoped.filter(b => b.local_date >= startD && b.local_date <= endD);
    }

    if (searchQuery) {
      const qNorm = normalizeText(searchQuery);
      scoped = scoped.filter(b => normalizeText(`${b.code} ${b.customer_name} ${b.pitch_name}`).includes(qNorm));
    }

    const upcomingCnt = scoped.filter(b => ['pending', 'confirmed'].includes(b.status)).length;
    const completedCnt = scoped.filter(b => b.status === 'completed').length;
    const cancelledCnt = scoped.filter(b => b.status === 'cancelled').length;

    if (!skipStats || !statsContainer.childElementCount) statsContainer.replaceChildren(
      renderStatCard({
        label: 'Đơn sắp tới / Giữ chỗ',
        value: String(upcomingCnt),
        hint: 'Đã thanh toán hoặc đang giữ chỗ, chưa tới giờ đá',
        icon: 'CalendarClock',
        tone: 'info'
      }),
      renderStatCard({
        label: 'Đã hoàn thành',
        value: String(completedCnt),
        hint: 'Trận đã đá xong',
        icon: 'CalendarCheck',
        tone: 'success'
      }),
      renderStatCard({
        label: 'Đã hủy / Hết hạn',
        value: String(cancelledCnt),
        hint: `Gồm cả giữ chỗ quá ${holdText()} chưa thanh toán`,
        icon: 'ReceiptText',
        tone: 'warning'
      })
    );

    const tabDefs = [
      ['upcoming', `Sắp tới (${upcomingCnt})`, b => ['pending', 'confirmed'].includes(b.status)],
      ['completed', `Đã hoàn thành (${completedCnt})`, b => b.status === 'completed'],
      ['cancelled', `Đã hủy / Hết hạn (${cancelledCnt})`, b => b.status === 'cancelled'],
      ['all', `Tất cả (${scoped.length})`, () => true]
    ];

    for (const [key, label] of tabDefs) {
      const isSel = key === activeTab;
      let btn = tabsWrap.querySelector(`#manager-booking-tab-${key}`);
      if (!btn) {
        btn = el('button', label, {
          type: 'button',
          role: 'tab',
          'aria-controls': 'manager-bookings-panel',
          id: `manager-booking-tab-${key}`,
          class: 'tab-btn'
        });
        btn.addEventListener('click', () => {
          if (activeTab === key) return;
          activeTab = key;
          const url = new URL(location.href);
          if (key === 'upcoming') url.searchParams.delete('tab');
          else url.searchParams.set('tab', key);
          history.replaceState(null, '', url);
          updateView({ skipStats: true });
          animateTabPanel(listContainer);
          btn.focus({ preventScroll: true });
        });
        tabsWrap.append(btn);
      }
      btn.textContent = label;
      btn.tabIndex = isSel ? 0 : -1;
      btn.classList.toggle('active', isSel);
      btn.setAttribute('aria-selected', String(isSel));
    }
    updateLiquidIndicator(tabsWrap, '.tab-btn[aria-selected="true"]');

    const pred = (tabDefs.find(t => t[0] === activeTab) || tabDefs[0])[2];
    listContainer.setAttribute('aria-labelledby', `manager-booking-tab-${activeTab}`);
    const mode = effectiveSort();
    sortSelect.value = mode;
    const items = sortBookings(scoped.filter(pred), mode);
    const pageRows = pager.slice(items, [activeTab, selectedPitchId, searchQuery, dateInput.value, calRangeDays, mode].join('|'));
    listContainer.replaceChildren();

    if (!items.length) {
      const pitchName = pitches.find(p => p.id === selectedPitchId)?.name;
      listContainer.append(el('div', pitchName && !searchQuery && !calRangeDays
        ? activeTab === 'upcoming'
          ? `${pitchName} chưa có đơn sắp tới. Khi có khách đặt, đơn sẽ hiện ở đây.`
          : `${pitchName} chưa có đơn nào trong mục này.`
        : 'Không có đơn đặt sân nào khớp với bộ lọc hiện tại.', { class: 'empty' }));
      return;
    }

    for (const b of pageRows) {
      const actions = el('div', null, { class: 'row' }, [
        el('a', 'Chi tiết', { href: `booking-details.html?id=${encodeURIComponent(b.id)}`, class: 'button secondary sm' })
      ]);

      const msgBtn = el('button', 'Nhắn khách', { type: 'button', class: 'button secondary sm' });
      msgBtn.addEventListener('click', async () => {
        const found = await api.entities.Conversation.filter({
          customer_id: b.customer_id,
          manager_id: b.manager_id,
          pitch_id: b.pitch_id
        });
        const conv = found.items[0];
        location.href = conv ? `messages.html?conversationId=${encodeURIComponent(conv.id)}` : `messages.html?bookingId=${encodeURIComponent(b.id)}`;
      });
      actions.append(msgBtn);

      if (b.status === 'confirmed') {
        const cancelBtn = el('button', 'Hủy đơn', { type: 'button', class: 'button danger-outline sm' });
        cancelBtn.addEventListener('click', () => {
          openActionDialog({
            title: `Hủy đơn ${b.code}`,
            danger: true,
            confirmLabel: 'Hủy đơn & hoàn tiền',
            description: `Đơn của khách ${b.customer_name || ''} sẽ được hủy và hoàn lại ${formatVnd(b.amount_vnd)} vào ví của khách.`,
            label: 'Lý do hủy đơn (bắt buộc)',
            required: true,
            placeholder: 'VD: Sân bảo trì đột xuất do mưa lớn...',
            async onConfirm(reason) {
              const res = await api.functions.invoke('cancelBooking', { booking_id: b.id, reason });
              if (res.data?.error) throw new Error(res.data.error);
              toast(`Đã hủy đơn ${b.code} và hoàn tiền cho khách.`);
              await renderManagerBookings();
            }
          });
        });
        actions.append(cancelBtn);
      }

      listContainer.append(
        el('article', null, { class: 'surface row-between' }, [
          el('div', null, { class: 'stack-sm' }, [
            el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
              el('span', b.code, { class: 'text-xs font-bold muted' }),
              renderBadge(bookingBadge(b), b.status),
              paymentBadgeShown(b) ? renderBadge(paymentBadge(b), b.payment_status) : null
            ]),
            el('h2', b.pitch_name || 'Sân bóng', { utility: 'u-font-size-1p1rem' }),
            infoList([
              ['Ngày đá', formatDate(b.local_date)],
              ['Giờ đá', b.slot_label || b.start_time],
              ['Khách đặt', b.customer_name || '—'],
              ['Số tiền', formatVnd(b.amount_vnd), { strong: true }]
            ], { className: 'text-sm' })
          ]),
          actions
        ])
      );
    }
  }

  pitchSelect.addEventListener('change', () => {
    selectedPitchId = pitchSelect.value;
    const url = new URL(location.href);
    url.searchParams.delete('pitchId');
    if (selectedPitchId) url.searchParams.set('id', selectedPitchId); else url.searchParams.delete('id');
    history.replaceState(null, '', url);
    if (selectedPitchId) {
      rangeSelect.value = '0';
      calRangeDays = 0;
    }
    updateView();
  });
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    updateView();
  });
  dateInput.addEventListener('change', updateView);
  rangeSelect.addEventListener('change', () => {
    calRangeDays = Number(rangeSelect.value);
    updateView();
  });

  const pager = createPager({ noun: 'đơn', onChange: () => updateView({ skipStats: true }), scrollTarget: tabsWrap });
  content.replaceChildren(filterCard, pitchNotice, statsContainer, tabsWrap, listToolbar, listContainer, pager.el);
  updateView();
}

bootManagement(renderManagerBookings);
