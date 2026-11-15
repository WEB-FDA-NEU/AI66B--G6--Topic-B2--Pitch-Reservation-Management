import { api } from '../services/api-client.js';
import { renderBadge, createIcon } from '../core/ui.js';
import { el, formatVnd, formatDate, formatDateTime, appRole, bookingBadge, paymentBadge, paymentBadgeShown, buildDirectionsLink } from '../core/render.js';
import { buildBookingStepper } from '../components/booking-stepper.js';
import { $, ensureAuthenticated, params, bootCustomerPage } from '../features/customer-kit.js';

async function renderBookingResultPage() {
  const main = $('#main');
  if (!main) return;
  main.className = 'container container--result stack-lg page-flow';
  const u = await ensureAuthenticated();
  if (!u) return;

  const bookingId = params.get('id') || params.get('bookingId');
  const b = await api.entities.Booking.get(bookingId);
  if (![b.customer_id, b.manager_id].includes(u.id) && appRole(u) !== 'admin') {
    location.replace('403.html');
    return;
  }

  const isConfirmed = b.status === 'confirmed' || b.status === 'completed';
  let original = null;
  if (b.reschedule_from_id) {
    try { original = await api.entities.Booking.get(b.reschedule_from_id); } catch { }
  }
  const rescheduled = isConfirmed && original?.cancel_type === 'rescheduled';
  const resultStepper = buildBookingStepper(3, {
    finalState: isConfirmed ? 'done' : b.status === 'pending' ? 'pending' : 'failed',
    finalLabel: isConfirmed ? 'Hoàn tất đặt sân' : b.status === 'pending' ? 'Chờ thanh toán' : 'Chưa hoàn tất'
  });

  const celebrationEmblem = isConfirmed
    ? el('div', null, { class: 'booking-success-hero', 'aria-hidden': 'true' }, [
        el('span', null, { class: 'booking-ripple-ring booking-ripple-ring--1' }),
        el('span', null, { class: 'booking-ripple-ring booking-ripple-ring--2' }),
        el('span', null, { class: 'booking-success-mark' }, [createIcon('CheckCircle2', 34)])
      ])
    : null;

  const card = el('section', null, { id: 'booking', class: 'surface stack booking-result-card' }, [
    el('div', null, { class: 'row-between' }, [
      renderBadge(bookingBadge(b), b.status),
      paymentBadgeShown(b) ? renderBadge(paymentBadge(b), b.payment_status) : null
    ]),
    celebrationEmblem,
    el('h1', rescheduled ? 'Đổi lịch thành công!' : isConfirmed ? 'Đặt sân thành công!' : b.status === 'pending' ? 'Đơn đang chờ thanh toán' : b.cancel_type === 'hold_expired' ? 'Giữ chỗ đã hết hạn' : b.cancel_type === 'hold_released' ? 'Bạn đã hủy giữ chỗ' : 'Đơn đặt sân đã hủy'),
    el('p', isConfirmed
      ? `Đơn ${b.code} đã được thanh toán lúc ${formatDateTime(b.paid_at || b.updated_date)}.`
      : `Trạng thái hiện tại của đơn ${b.code}.`, { class: 'muted' }),
    rescheduled
      ? el('div', `Đơn cũ ${original.code} (${formatDate(original.local_date)}, ${original.slot_label || original.start_time}) đã được hủy và hoàn ${formatVnd(original.amount_vnd)} vào ví. Đơn mới không đổi lịch thêm được.`, { id: 'reschedule-result', class: 'alert alert--success text-sm' })
      : null,
    el('div', null, { class: 'card card--compact card--subtle stack-sm' }, [
      el('div', null, { class: 'row-between' }, [
        el('span', 'Sân bóng:', { class: 'text-sm muted' }),
        el('strong', b.pitch_name || 'Sân bóng')
      ]),
      el('div', null, { class: 'row-between' }, [
        el('span', 'Địa chỉ:', { class: 'text-sm muted' }),
        el('span', b.pitch_address || '—', { class: 'text-sm' })
      ]),
      el('div', null, { class: 'row-between' }, [
        el('span', 'Ngày & Khung giờ:', { class: 'text-sm muted' }),
        el('strong', `${formatDate(b.local_date)}, ${b.slot_label || b.start_time}`)
      ]),
      el('div', null, { class: 'row-between' }, [
        el('span', 'Tổng thanh toán:', { class: 'text-sm muted' }),
        el('strong', formatVnd(b.amount_vnd), { utility: 'u-color-brand-text' })
      ])
    ]),
    el('div', 'Khi tới sân, bạn chỉ cần đọc mã đơn cho chủ sân.', {
      class: 'alert alert--info text-sm'
    }),
    el('div', null, { class: 'row' }, [
      el('a', 'Xem chi tiết đơn', { href: `booking-details.html?id=${encodeURIComponent(b.id)}`, class: 'button' }),
      buildDirectionsLink(b),
      el('a', 'Lịch sử đặt sân', { href: 'booking-history.html', class: 'button ghost' })
    ])
  ]);

  main.replaceChildren(resultStepper, card, el('p', '', { id: 'error', role: 'alert' }));
}

bootCustomerPage(user => renderBookingResultPage(user));
