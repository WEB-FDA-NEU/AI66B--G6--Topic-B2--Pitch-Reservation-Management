import { api } from '../services/api-client.js';
import { holdText, noticeText } from '../core/config.js';
import { renderBadge, createIcon } from '../core/ui.js';
import { el, formatVnd, formatDate, appRole, BOOKING_STATUS, bookingBadge, bookingCanReschedule, infoLines } from '../core/render.js';
import { buildBookingStepper } from '../components/booking-stepper.js';
import { $, ensureAuthenticated, params, say } from './customer-kit.js';

export async function renderBookingConfirmOrPaymentPage() {
  const main = $('#main');
  if (!main) return;
  main.className = 'container container--narrow stack-lg';
  const u = await ensureAuthenticated();
  if (!u) return;

  const bookingId = params.get('id') || params.get('bookingDraftId') || params.get('bookingId');
  const errEl = el('p', '', { id: 'error', role: 'alert' });

  if (!bookingId) {
    const pendingRes = await api.entities.Booking.filter({ customer_id: u.id, status: 'pending' }, { sort: '-created_date' });
    const card = el('section', null, { class: 'surface stack' }, [
      el('h1', 'Thanh toán'),
      el('p', pendingRes.items.length
        ? 'Chọn đơn đang giữ chỗ bên dưới để tiếp tục thanh toán:'
        : 'Bạn hiện không có đơn nào đang chờ thanh toán.', { class: 'muted' })
    ]);
    for (const b of pendingRes.items) {
      card.append(
        el('div', null, { class: 'card card--compact row-between' }, [
          el('div', null, {}, [
            el('strong', `${b.pitch_name} (${b.code})`),
            infoLines([formatDate(b.local_date), b.slot_label, formatVnd(b.amount_vnd)])
          ]),
          el('a', 'Tiếp tục thanh toán', { href: `booking-confirmation.html?id=${encodeURIComponent(b.id)}`, class: 'button sm' })
        ])
      );
    }
    card.append(
      el('div', null, { class: 'row' }, [
        el('a', 'Xem lịch sử đặt sân', { href: 'booking-history.html', class: 'button secondary' }),
        el('a', 'Tìm sân bóng', { href: 'search.html', class: 'button' })
      ])
    );
    main.replaceChildren(card, errEl);
    return;
  }

  const [b, walletsRes] = await Promise.all([
    api.entities.Booking.get(bookingId),
    api.entities.Wallet.filter({ user_id: u.id })
  ]);

  if (b.customer_id !== u.id) {
    location.replace(appRole(u) === 'admin' ? `booking-details.html?id=${encodeURIComponent(b.id)}` : '403.html');
    return;
  }

  if (b.status === 'confirmed' || b.payment_status === 'paid') {
    location.replace(`booking-result.html?id=${encodeURIComponent(b.id)}`);
    return;
  }

  let original = null;
  if (b.reschedule_from_id) {
    try { original = await api.entities.Booking.get(b.reschedule_from_id); } catch { }
  }
  const pickAgainHref = original
    ? `booking-schedule.html?id=${encodeURIComponent(b.pitch_id)}&rescheduleBookingId=${encodeURIComponent(original.id)}&date=${encodeURIComponent(b.local_date)}`
    : `pitch-detail.html?id=${encodeURIComponent(b.pitch_id)}&date=${encodeURIComponent(b.local_date)}`;
  const afterReleaseHref = original ? `booking-details.html?id=${encodeURIComponent(original.id)}` : pickAgainHref;

  if (b.status !== 'pending' || Date.parse(b.hold_expires_at) <= Date.now()) {
    main.replaceChildren(el('section', null, { class: 'surface stack' }, [
      el('h1', 'Giữ chỗ không còn hiệu lực'),
      el('p', 'Giữ chỗ này đã hết hạn hoặc đã bị hủy. Vui lòng chọn lại khung giờ.'),
      el('a', 'Chọn lại khung giờ', { href: original && bookingCanReschedule(original) ? pickAgainHref : `pitch-detail.html?id=${encodeURIComponent(b.pitch_id)}&date=${encodeURIComponent(b.local_date)}`, class: 'button' }),
      el('a', 'Về lịch sử đơn', { href: 'booking-history.html', class: 'text-link' })
    ]));
    return;
  }

  const wallet = walletsRes.items[0] || { balance_vnd: 0 };
  const originalValid = !!original && bookingCanReschedule(original);
  const credit = originalValid ? Number(original.amount_vnd) : 0;
  const sufficient = Number(wallet.balance_vnd) + credit >= Number(b.amount_vnd);
  const blockedReschedule = !!b.reschedule_from_id && !originalValid;

  const countdownText = el('span', '', { class: 'countdown-banner-text' });
  const countdownClock = el('span', '--:--', { class: 'countdown-banner-clock tabular-nums' });
  const countdownEl = el('div', null, { id: 'countdown', class: 'countdown-banner alert alert--warning' }, [
    el('div', null, { class: 'countdown-banner-left' }, [
      createIcon('CalendarClock', 18),
      countdownText
    ]),
    countdownClock
  ]);
  const consentInput = el('input', null, { type: 'checkbox', id: 'consent' });
  const consentError = el('p', '', { id: 'consent-error', class: 'field-error', role: 'alert', hidden: true });
  consentInput.addEventListener('change', () => {
    if (consentInput.checked) { consentError.hidden = true; consentError.textContent = ''; consentInput.removeAttribute('aria-invalid'); consentInput.removeAttribute('aria-describedby'); }
  });
  const payBtn = el('button', b.reschedule_from_id ? 'Xác nhận đổi lịch & thanh toán' : 'Xác nhận & thanh toán', { 'data-needs-active': '',
    id: 'pay',
    type: 'button',
    class: 'button full',
    disabled: !sufficient || b.status !== 'pending' || blockedReschedule
  });
  const releaseBtn = el('button', b.reschedule_from_id ? 'Hủy giữ chỗ mới, giữ đơn cũ' : 'Hủy giữ chỗ và chọn lại', { 'data-needs-active': '',
    type: 'button', class: 'button secondary', disabled: b.status !== 'pending'
  });
  const releaseDialog = el('dialog', null, { 'aria-label': 'Xác nhận hủy giữ chỗ' });
  const releaseError = el('p', '', { class: 'field-error', role: 'alert' });
  const releaseConfirm = el('button', 'Hủy giữ chỗ', { type: 'button', class: 'button danger' });
  const releaseClose = el('button', 'Quay lại', { type: 'button', class: 'button secondary' });
  releaseDialog.append(el('div', null, { class: 'stack' }, [
    el('h2', 'Hủy giữ chỗ?'), el('p', b.reschedule_from_id ? `Khung giờ mới sẽ được mở lại cho người khác. Đơn cũ${original ? ` ${original.code}` : ''} vẫn giữ nguyên.` : 'Khung giờ sẽ được mở lại để người khác có thể đặt.'), releaseError,
    el('div', null, { class: 'row' }, [releaseClose, releaseConfirm])
  ]));
  releaseClose.addEventListener('click', () => releaseDialog.close());
  releaseBtn.addEventListener('click', () => {
    if (Date.parse(b.hold_expires_at) <= Date.now()) {
      location.href = originalValid ? pickAgainHref : `pitch-detail.html?id=${encodeURIComponent(b.pitch_id)}&date=${encodeURIComponent(b.local_date)}`;
    } else { releaseError.textContent = ''; releaseDialog.showModal(); }
  });
  releaseConfirm.addEventListener('click', async () => {
    if (releaseConfirm.disabled) return;
    releaseConfirm.disabled = true;
    releaseBtn.disabled = true;
    try {
      if (Date.parse(b.hold_expires_at) > Date.now()) {
        const result = await api.functions.invoke('cancelBooking', { booking_id: b.id, reason: 'Khách chọn lại khung giờ' });
        if (result.data?.error) throw new Error(result.data.error);
      }
      location.href = afterReleaseHref;
    } catch (err) {
      releaseBtn.disabled = false;
      releaseConfirm.disabled = false;
      releaseError.textContent = err.message || 'Không thể hủy giữ chỗ.';
    }
  });

  let timerId = null;
  function updateCountdown() {
    if (b.status !== 'pending') {
      countdownEl.className = 'countdown-banner alert alert--danger font-bold';
      countdownText.textContent = 'Đơn giữ chỗ này đã hết hạn hoặc đã bị hủy.';
      countdownClock.textContent = '00:00';
      payBtn.disabled = true;
      if (timerId) clearInterval(timerId);
      return;
    }
    const rem = Math.max(0, Date.parse(b.hold_expires_at) - Date.now());
    const mins = String(Math.floor(rem / 60000)).padStart(2, '0');
    const secs = String(Math.floor(rem / 1000) % 60).padStart(2, '0');
    if (rem <= 0) {
      countdownEl.className = 'countdown-banner alert alert--danger font-bold';
      countdownText.textContent = `Thời gian giữ chỗ ${holdText()} đã hết hạn. Vui lòng chọn lại khung giờ.`;
      countdownClock.textContent = '00:00';
      payBtn.disabled = true;
      releaseBtn.textContent = 'Chọn lại khung giờ';
      const expiredBadge = renderBadge({ ...BOOKING_STATUS.cancelled, label: 'Hết hạn giữ chỗ' }, 'cancelled');
      bookingStatusBadge.className = expiredBadge.className;
      bookingStatusBadge.replaceChildren(...expiredBadge.childNodes);
      consentInput.disabled = true;
      bookingBox.querySelector('[data-payment-wallet]')?.setAttribute('hidden', '');
      bookingBox.querySelector('[data-wallet-warning]')?.setAttribute('hidden', '');
      consentInput.closest('label')?.setAttribute('hidden', '');
      consentError.hidden = true;
      payBtn.hidden = true;
      if (timerId) clearInterval(timerId);
    } else {
      countdownText.textContent = 'Thời gian giữ chỗ còn lại (khóa tạm thời cho bạn)';
      countdownClock.textContent = `${mins}:${secs}`;
    }
  }
  const bookingStatusBadge = renderBadge(bookingBadge(b), b.status);
  const bookingBox = el('section', null, { id: 'booking', class: 'surface stack' }, [
    el('div', null, { class: 'row-between' }, [
      el('div', null, {}, [
        el('p', `Mã đơn: ${b.code}`, { class: 'eyebrow' }),
        el('h1', b.reschedule_from_id ? 'Xác nhận đổi lịch' : 'Xác nhận & thanh toán')
      ]),
      bookingStatusBadge
    ]),
    countdownEl,
    original ? el('div', null, { id: 'reschedule-from', class: `alert alert--${originalValid ? 'info' : 'danger'} stack-sm` }, [
      el('strong', `Đổi lịch từ đơn ${original.code}`),
      el('p', `Lịch cũ: ${formatDate(original.local_date)}, ${original.slot_label || original.start_time}, ${formatVnd(original.amount_vnd)}.`, { class: 'text-sm' }),
      el('p', originalValid
        ? 'Khi bạn bấm thanh toán, đơn cũ được hủy và hoàn đủ tiền vào ví, sau đó ví trừ tiền cho lịch mới. Nếu bạn không thanh toán, đơn cũ vẫn giữ nguyên.'
        : `Đơn cũ không còn đủ điều kiện đổi lịch (đã hủy, đã diễn ra hoặc còn dưới ${noticeText()} trước giờ đá). Hãy hủy giữ chỗ mới này.`, { class: 'text-sm' })
    ]) : b.reschedule_from_id ? el('div', 'Không tìm thấy đơn cũ cần đổi lịch. Hãy hủy giữ chỗ mới này.', { id: 'reschedule-from', class: 'alert alert--danger' }) : null,
    el('div', null, { class: 'grid-2' }, [
      el('div', null, { class: 'card card--compact card--subtle stack-sm' }, [
        el('div', 'Thông tin sân & lịch thi đấu', { class: 'text-xs font-bold muted' }),
        el('strong', b.pitch_name || 'Sân bóng'),
        el('div', b.pitch_address || '', { class: 'text-sm muted' }),
        el('div', `Ngày: ${formatDate(b.local_date)}`, { class: 'text-sm font-bold' }),
        el('div', `Khung giờ: ${b.slot_label || b.start_time}`, { class: 'text-sm font-bold' })
      ]),
      el('div', null, { class: 'card card--compact card--subtle stack-sm', 'data-payment-wallet': '' }, [
        el('div', 'Ví của bạn', { class: 'text-xs font-bold muted' }),
        el('div', null, { class: 'row-between' }, [
          el('span', 'Số dư hiện tại:', { class: 'text-sm' }),
          el('strong', formatVnd(wallet.balance_vnd))
        ]),
        credit ? el('div', null, { class: 'row-between' }, [
          el('span', `Hoàn từ đơn ${original.code}:`, { class: 'text-sm' }),
          el('strong', `+${formatVnd(credit)}`, { utility: 'u-color-info' })
        ]) : null,
        el('div', null, { class: 'row-between' }, [
          el('span', 'Số tiền thanh toán:', { class: 'text-sm' }),
          el('strong', formatVnd(b.amount_vnd), { utility: 'u-color-brand-text u-font-size-1p15rem' })
        ]),
        el('div', null, { class: 'row-between', utility: 'u-border-top-1px-solid-border u-padding-top-0p35rem' }, [
          el('span', 'Số dư sau thanh toán:', { class: 'text-xs muted' }),
          el('span', sufficient ? formatVnd(Number(wallet.balance_vnd) + credit - b.amount_vnd) : 'Không đủ số dư', { class: 'text-xs font-bold' })
        ])
      ])
    ]),
    !sufficient
      ? el('div', 'Số dư ví của bạn không đủ để thanh toán đơn này.', { class: 'alert alert--danger', 'data-wallet-warning': '' })
      : null,
    el('div', null, { class: 'card card--compact card--subtle stack-sm text-sm' }, [
      el('strong', 'Chính sách đặt sân & hoàn tiền:'),
      el('ul', null, { class: 'muted' }, [
        el('li', `Giữ chỗ có hiệu lực trong ${holdText()} kể từ lúc tạo đơn.`),
        el('li', `Hủy đơn trước giờ đá ít nhất ${noticeText()} được hoàn lại 100% vào ví.`),
        el('li', `Mỗi đơn được đổi lịch 1 lần khi còn ít nhất ${noticeText()} trước giờ đá (trong trang Chi tiết đơn).`)
      ])
    ]),
    el('label', null, { class: 'checkbox-label' }, [
      consentInput,
      el('span', `Tôi đã kiểm tra kỹ ngày giờ và đồng ý với điều khoản đặt sân, chính sách hủy trước ${noticeText()}.`)
    ]),
    consentError,
    payBtn,
    el('div', null, { class: 'row-between text-sm' }, [
      b.status === 'pending' ? releaseBtn : el('a', '← Chọn lại khung giờ khác', { href: `pitch-detail.html?id=${encodeURIComponent(b.pitch_id)}&date=${encodeURIComponent(b.local_date)}` }),
      el('a', 'Về lịch sử đơn', { href: 'booking-history.html', class: 'text-link' })
    ])
  ]);

  updateCountdown();
  if (Date.parse(b.hold_expires_at) > Date.now()) timerId = setInterval(updateCountdown, 1000);

  let checkingHold = false;
  async function checkSharedHold() {
    if (checkingHold || document.visibilityState === 'hidden') return;
    checkingHold = true;
    try {
      const latest = await api.entities.Booking.get(b.id);
      if (latest.status !== b.status || latest.payment_status !== b.payment_status) location.reload();
    } catch { }
    finally { checkingHold = false; }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void checkSharedHold(); });

  payBtn.addEventListener('click', async () => {
    if (!consentInput.checked) {
      consentError.textContent = 'Vui lòng đồng ý với điều khoản và chính sách hủy trước khi thanh toán.';
      consentError.hidden = false;
      consentInput.setAttribute('aria-invalid', 'true');
      consentInput.setAttribute('aria-describedby', 'consent-error');
      consentInput.focus();
      return;
    }
    try {
      payBtn.disabled = true;
      const r = await api.functions.invoke('payBooking', { booking_id: b.id });
      if (r.data?.error) throw new Error(r.data.error);
      if (timerId) clearInterval(timerId);
      location.href = `booking-result.html?id=${encodeURIComponent(b.id)}`;
    } catch (e) {
      payBtn.disabled = Date.parse(b.hold_expires_at) <= Date.now() || !sufficient || blockedReschedule;
      say(e.message);
    }
  });

  const stepper = buildBookingStepper(2);
  main.replaceChildren(stepper, bookingBox, errEl, releaseDialog);
}
