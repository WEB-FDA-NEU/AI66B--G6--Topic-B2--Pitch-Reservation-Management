import { api } from '../services/api-client.js';
import { toast, renderBadge, renderStatCard } from '../core/ui.js';
import { el, formatVnd, formatDate, normalizeText, bookingBadge, paymentBadge, paymentBadgeShown, sortBookings, readBookingSort, buildBookingSortField, createPager, infoList, buildFilterChip } from '../core/render.js';
import { content, fetchRows, openActionDialog, params, bootManagement } from '../features/management-kit.js';

async function renderAdminBookings() {
  const bookings = await fetchRows('Booking');
  let qText = params.get('q') || '';
  let statusFilter = params.get('status') || 'all';
  let userIdFilter = new URLSearchParams(location.search).get('userId') || '';
  let managerIdFilter = new URLSearchParams(location.search).get('managerId') || '';
  let pitchIdFilter = new URLSearchParams(location.search).get('pitchId') || '';

  const statsGrid = el('div', null, { class: 'grid-4' });

  const qInput = el('input', null, { id: 'ab-q', value: qText, placeholder: 'Tìm theo mã đơn, khách, chủ sân hoặc tên sân...' });
  const statusSelect = el('select', null, { id: 'ab-status' }, [
    el('option', 'Tất cả trạng thái', { value: 'all' }),
    el('option', 'Sắp tới (giữ chỗ + đã xác nhận)', { value: 'upcoming' }),
    el('option', 'Đủ điều kiện hủy & hoàn tiền', { value: 'confirmed' }),
    el('option', 'Đang giữ chỗ', { value: 'pending' }),
    el('option', 'Đã hoàn thành', { value: 'completed' }),
    el('option', 'Đã hủy', { value: 'cancelled' })
  ]);
  statusSelect.value = statusFilter;

  let sortMode = readBookingSort() || 'recent';
  const { field: sortField } = buildBookingSortField({
    id: 'ab-sort',
    value: sortMode,
    onChange(value) { sortMode = value; pager.reset(); updateList(); }
  });

  const setUrlParam = (key, value) => {
    const url = new URL(location.href);
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    history.replaceState(history.state, '', url.pathname.split('/').pop() + url.search);
  };

  // Tìm theo mã đơn, khách, chủ sân, tên sân.
  const filterCard = el('section', null, { class: 'surface stack' }, [
    el('div', null, { class: 'grid-3' }, [
      el('div', null, { class: 'field-group' }, [el('label', 'Tìm kiếm đơn đặt sân', { for: 'ab-q' }), qInput]),
      el('div', null, { class: 'field-group' }, [el('label', 'Trạng thái đơn', { for: 'ab-status' }), statusSelect]),
      sortField
    ])
  ]);

  // Lọc theo ?userId / ?managerId / ?pitchId.
  if (userIdFilter || managerIdFilter || pitchIdFilter) {
    const name = pitchIdFilter
      ? (bookings.find(b => b.pitch_id === pitchIdFilter)?.pitch_name || 'Sân đã chọn')
      : managerIdFilter
        ? (bookings.find(b => b.manager_id === managerIdFilter)?.manager_name || 'Chủ sân đã chọn')
        : (bookings.find(b => b.customer_id === userIdFilter)?.customer_name || 'Khách hàng đã chọn');
    const chip = buildFilterChip(name, pitchIdFilter ? 'Bỏ lọc sân' : managerIdFilter ? 'Bỏ lọc chủ sân' : 'Bỏ lọc khách', () => {
      userIdFilter = '';
      managerIdFilter = '';
      pitchIdFilter = '';
      setUrlParam('userId', '');
      setUrlParam('managerId', '');
      setUrlParam('pitchId', '');
      chip.remove();
      pager.reset();
      updateList();
      qInput.focus({ preventScroll: true });
    });
    filterCard.append(chip);
  }

  const listWrap = el('div', null, { class: 'stack' });
  const pager = createPager({ noun: 'đơn', onChange: () => updateList(), scrollTarget: listWrap });

  function updateList() {
    let filtered = bookings;
    if (userIdFilter) filtered = filtered.filter(b => b.customer_id === userIdFilter);
    if (managerIdFilter) filtered = filtered.filter(b => b.manager_id === managerIdFilter);
    if (pitchIdFilter) filtered = filtered.filter(b => b.pitch_id === pitchIdFilter);
    if (qText) {
      const norm = normalizeText(qText);
      filtered = filtered.filter(b => normalizeText(`${b.code} ${b.customer_name} ${b.manager_name} ${b.pitch_name}`).includes(norm));
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => statusFilter === 'upcoming' ? ['pending', 'confirmed'].includes(b.status) : b.status === statusFilter);
    }

    statsGrid.replaceChildren(
      renderStatCard({ label: 'Tổng số đơn đang lọc', value: String(filtered.length), icon: 'ReceiptText' }),
      renderStatCard({ label: 'Đã xác nhận', value: String(filtered.filter(b => b.status === 'confirmed').length), icon: 'Ticket', tone: 'info' }),
      renderStatCard({ label: 'Đã hủy / Hết hạn', value: String(filtered.filter(b => b.status === 'cancelled').length), hint: `${filtered.filter(b => b.cancel_type === 'hold_expired').length} giữ chỗ hết hạn`, icon: 'Flag', tone: 'warning' }),
      renderStatCard({ label: 'Giá trị đơn hiệu lực', value: formatVnd(filtered.filter(b => ['confirmed', 'completed'].includes(b.status)).reduce((sum, b) => sum + Number(b.amount_vnd || 0), 0)), icon: 'Wallet', tone: 'success' })
    );

    filtered = sortBookings(filtered, sortMode);
    const slice = pager.slice(filtered, [userIdFilter, managerIdFilter, pitchIdFilter, qText, statusFilter, sortMode].join('|'));

    listWrap.replaceChildren();
    if (!slice.length) {
      listWrap.append(el('div', 'Không có đơn đặt sân nào khớp với bộ lọc.', { class: 'empty' }));
    } else {
      for (const b of slice) {
        const actions = el('div', null, { class: 'row' }, [
          el('a', 'Chi tiết', { href: `booking-details.html?id=${encodeURIComponent(b.id)}`, class: 'button secondary sm' })
        ]);
        if (b.status === 'confirmed') {
          const cancelBtn = el('button', 'Hủy & hoàn tiền', { type: 'button', class: 'button danger-outline sm' });
          cancelBtn.addEventListener('click', () => {
            openActionDialog({
              title: `Hủy đơn & hoàn tiền: ${b.code}`,
              danger: true,
              confirmLabel: 'Hủy đơn & hoàn tiền',
              description: `Đơn tại ${b.pitch_name} (${formatVnd(b.amount_vnd)}) sẽ được hủy và hoàn lại 100% vào ví của khách hàng ${b.customer_name || ''}.`,
              label: 'Lý do hủy đơn (bắt buộc)',
              required: true,
              placeholder: 'Nhập lý do quản trị viên hủy đơn...',
              async onConfirm(reason) {
                const res = await api.functions.invoke('cancelBooking', { booking_id: b.id, reason });
                if (res.data?.error) throw new Error(res.data.error);
                toast(`Đã hủy đơn ${b.code} và hoàn tiền cho khách.`);
                await renderAdminBookings();
              }
            });
          });
          actions.append(cancelBtn);
        }

        actions.className = 'admin-card-actions';
        listWrap.append(
          el('article', null, { class: 'surface stack-sm admin-card', 'data-memory-id': `booking-${b.id}` }, [
            el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
              el('span', b.code, { class: 'text-xs font-bold muted' }),
              renderBadge(bookingBadge(b), b.status),
              paymentBadgeShown(b) ? renderBadge(paymentBadge(b), b.payment_status) : null
            ]),
            el('h2', b.pitch_name || 'Sân bóng', { utility: 'u-font-size-1p05rem' }),
            infoList([
              ['Ngày đá', formatDate(b.local_date)],
              ['Giờ đá', b.slot_label || b.start_time],
              ['Khách', b.customer_name || '—'],
              ['Chủ sân', b.manager_name || '—'],
              ['Số tiền', formatVnd(b.amount_vnd), { strong: true }]
            ], { className: 'text-sm' }),
            actions
          ])
        );
      }
    }

  }

  qInput.addEventListener('input', () => { qText = qInput.value.trim(); updateList(); });
  statusSelect.addEventListener('change', () => { statusFilter = statusSelect.value; updateList(); });

  content.replaceChildren(statsGrid, filterCard, listWrap, pager.el);
  updateList();
}

bootManagement(renderAdminBookings);
