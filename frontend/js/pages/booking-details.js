import { api } from '../services/api-client.js';
import { toast, clearFieldErrors, setFieldError, focusFirstInvalid, renderBadge } from '../core/ui.js';
import { el, formatVnd, formatDate, formatDateTime, appRole, bookingCanCancel, bookingCanReschedule, bookingBadge, paymentBadge, paymentBadgeShown, buildDirectionsLink, staffBackLink } from '../core/render.js';
import { noticeText } from '../core/config.js';
import { $, ensureAuthenticated, params, bootCustomerPage } from '../features/customer-kit.js';

async function renderBookingDetailsPage() {
  const main = $('#main');
  if (!main) return;
  main.className = 'container container--narrow stack-lg';
  const u = await ensureAuthenticated();
  if (!u) return;

  const bookingId = params.get('id') || params.get('bookingId');
  const b = await api.entities.Booking.get(bookingId);
  const role = appRole(u);
  if (![b.customer_id, b.manager_id].includes(u.id) && role !== 'admin') {
    location.replace('403.html');
    return;
  }

  const [paymentsRes, refundsRes, reviewsRes] = await Promise.all([
    api.entities.Payment.filter({ booking_id: b.id }),
    api.entities.Refund.filter({ booking_id: b.id }),
    api.entities.Review.filter({ booking_id: b.id })
  ]);
  const linkedBooking = async id => { try { return id ? await api.entities.Booking.get(id) : null; } catch { return null; } };
  const [rescheduledFrom, rescheduledTo, pendingReschedule] = await Promise.all([
    linkedBooking(b.reschedule_from_id),
    linkedBooking(b.rescheduled_to_id),
    role === 'customer' && b.status === 'confirmed'
      ? api.entities.Booking.filter({ customer_id: u.id, status: 'pending', reschedule_from_id: b.id }).then(r => r.items[0] || null).catch(() => null)
      : Promise.resolve(null)
  ]);
  const payment = paymentsRes.items[0] || null;
  const refund = refundsRes.items[0] || null;
  const existingReview = reviewsRes.items[0] || null;

  const back = staffBackLink(u, 'booking-details.html', {
    href: role === 'admin'
      ? 'admin-finance.html'
      : role === 'manager'
        ? `manager-bookings.html?id=${encodeURIComponent(b.pitch_id)}`
        : 'booking-history.html',
    label: role === 'admin'
      ? '← Về quản lý đơn & hoàn tiền'
      : role === 'manager'
        ? '← Về danh sách đơn của sân'
        : '← Về lịch sử đặt sân'
  }, role === 'admin' ? ['pitch-detail.html', 'manager-bookings.html'] : ['pitch-detail.html']);
  const backHref = back.href;
  const backLabel = back.label;

  const badgesRow = el('div', null, { class: 'row' }, [
    renderBadge(bookingBadge(b), b.status),
    paymentBadgeShown(b) ? renderBadge(paymentBadge(b), b.payment_status) : null
  ]);

  const canCustomerCancel = role === 'customer' && bookingCanCancel(b);
  const canReschedule = role === 'customer' && bookingCanReschedule(b) && !pendingReschedule;
  const canStaffCancel = (role === 'manager' || role === 'admin') && b.status === 'confirmed';

  const cancelDialog = el('dialog', null, { 'aria-label': 'Xác nhận hủy đơn' });
  const reasonTextarea = el('textarea', null, {
    id: 'cancel-reason-input',
    maxlength: '400',
    placeholder: role === 'customer' ? 'Nhập lý do hủy (không bắt buộc)...' : 'Nhập lý do hủy đơn (bắt buộc)...'
  });
  const cancelDialogErr = el('p', '', { class: 'field-error', hidden: true });
  const cancelForm = el('form', null, { class: 'stack', novalidate: true }, [
    el('h2', `Xác nhận hủy đơn ${b.code}`),
    el('p', `Đơn sẽ được chuyển sang trạng thái Đã hủy và hoàn lại ${formatVnd(b.amount_vnd)} vào ${role === 'customer' ? 'ví của bạn' : 'ví của khách hàng'}.`, { class: 'text-sm muted' }),
    el('div', null, { class: 'field-group' }, [
      el('label', role === 'customer' ? 'Lý do hủy đơn (không bắt buộc)' : 'Lý do hủy đơn (bắt buộc)', { for: 'cancel-reason-input' }),
      reasonTextarea,
      cancelDialogErr
    ]),
    el('div', null, { class: 'row-between' }, [
      el('button', 'Đóng', { type: 'button', class: 'button secondary' }),
      el('button', 'Xác nhận hủy & hoàn tiền', { type: 'submit', class: 'button danger' })
    ])
  ]);
  cancelForm.querySelector('button[type="button"]').addEventListener('click', () => cancelDialog.close());
  cancelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = reasonTextarea.value.trim();
    if (role !== 'customer' && !reason) {
      cancelDialogErr.textContent = 'Vui lòng nhập lý do hủy đơn.';
      cancelDialogErr.hidden = false;
      reasonTextarea.focus();
      return;
    }
    const r = await api.functions.invoke('cancelBooking', { booking_id: b.id, reason });
    if (r.data?.error) {
      cancelDialogErr.textContent = r.data.error;
      cancelDialogErr.hidden = false;
      return;
    }
    cancelDialog.close();
    toast('Đã hủy đơn và hoàn tiền vào ví.');
    await renderBookingDetailsPage();
    const heading = main.querySelector('h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  });
  cancelDialog.append(cancelForm);

  const cancelBtn = el('button', 'Hủy đơn và hoàn tiền', { 'data-needs-active': '',
    id: 'cancel',
    type: 'button',
    class: 'button danger',
    hidden: !(canCustomerCancel || canStaffCancel)
  });
  cancelBtn.addEventListener('click', () => cancelDialog.showModal());

  const msgBtn = el('button', role === 'customer' ? 'Nhắn chủ sân' : 'Nhắn khách hàng', { 'data-needs-active': '',
    type: 'button',
    class: 'button secondary'
  });
  msgBtn.addEventListener('click', async () => {
    // Admin nhắn khách qua hội thoại hỗ trợ.
    if (role === 'admin') { location.href = `messages.html?userId=${encodeURIComponent(b.customer_id)}`; return; }
    const found = await api.entities.Conversation.filter({
      customer_id: b.customer_id,
      manager_id: b.manager_id,
      pitch_id: b.pitch_id
    });
    const conv = found.items[0];
    location.href = conv ? `messages.html?conversationId=${encodeURIComponent(conv.id)}` : `messages.html?bookingId=${encodeURIComponent(b.id)}`;
  });

  const detailCard = el('section', null, { id: 'booking', class: 'surface stack' }, [
    el('div', null, { class: 'row-between' }, [
      el('div', null, {}, [
        el('p', `Mã đơn: ${b.code}`, { class: 'eyebrow' }),
        el('h1', b.pitch_name || 'Chi tiết đơn đặt sân')
      ]),
      badgesRow
    ]),
    el('div', null, { class: 'grid-2' }, [
      el('div', null, { class: 'card card--compact card--subtle stack-sm' }, [
        el('div', 'Thông tin lịch đặt', { class: 'text-xs font-bold muted' }),
        el('div', `Ngày thi đấu: ${formatDate(b.local_date)}`, { class: 'font-bold' }),
        el('div', `Khung giờ: ${b.slot_label || b.start_time}`, { class: 'font-bold' }),
        el('div', `Địa chỉ: ${b.pitch_address || '—'}`, { class: 'text-sm muted' }),
        b.pitch_address ? buildDirectionsLink(b, 'link') : null,
        ...(b.booked_facilities != null ? [el('div', `Tiện ích khi đặt: ${b.booked_facilities.join(', ') || 'Không có'}`, { class: 'text-sm' })] : []),
        ...(b.booked_rules != null ? [el('div', `Nội quy khi đặt: ${b.booked_rules || 'Không có'}`, { class: 'text-sm' })] : []),
        el('div', `Khách đặt: ${b.customer_name || '—'}`, { class: 'text-sm muted' })
      ]),
      el('div', null, { class: 'card card--compact card--subtle stack-sm' }, [
        el('div', 'Thanh toán & hoàn tiền', { class: 'text-xs font-bold muted' }),
        el('div', `Số tiền: ${formatVnd(b.amount_vnd)}`, { class: 'font-bold', utility: 'u-color-brand-text' }),
        payment ? el('div', `Thanh toán lúc: ${formatDateTime(payment.paid_at || payment.created_date)}`, { class: 'text-sm muted' }) : null,
        refund ? el('div', `Đã hoàn ${formatVnd(refund.amount_vnd)} lúc ${formatDateTime(refund.created_date)}`, { class: 'text-sm font-bold', utility: 'u-color-info' }) : null,
        b.cancel_reason ? el('div', `Lý do hủy: ${b.cancel_reason}`, { class: 'text-sm muted' }) : null
      ])
    ]),
    b.status === 'confirmed' && role === 'customer' && !canCustomerCancel
      ? el('div', `Đơn này còn dưới ${noticeText()} trước giờ bóng lăn nên không đủ điều kiện tự hủy hoặc đổi lịch theo chính sách.`, { class: 'alert alert--warning text-sm' })
      : null,
    rescheduledTo
      ? el('div', null, { id: 'rescheduled-to', class: 'alert alert--info text-sm' }, [
        document.createTextNode(`Đơn này đã được đổi lịch sang đơn ${rescheduledTo.code} (${formatDate(rescheduledTo.local_date)}, ${rescheduledTo.slot_label || rescheduledTo.start_time}). `),
        el('a', 'Xem đơn mới', { href: `booking-details.html?id=${encodeURIComponent(rescheduledTo.id)}`, class: 'text-link font-bold' })
      ])
      : null,
    rescheduledFrom
      ? el('div', null, { id: 'rescheduled-from', class: 'alert alert--info text-sm' }, [
        document.createTextNode(`Đơn này được đổi lịch từ đơn ${rescheduledFrom.code} (${formatDate(rescheduledFrom.local_date)}, ${rescheduledFrom.slot_label || rescheduledFrom.start_time}). ${b.status === 'confirmed' && role === 'customer' ? 'Mỗi đơn chỉ đổi lịch 1 lần nên đơn này không đổi lịch thêm được. ' : ''}`),
        el('a', 'Xem đơn cũ', { href: `booking-details.html?id=${encodeURIComponent(rescheduledFrom.id)}`, class: 'text-link font-bold' })
      ])
      : null,
    pendingReschedule
      ? el('div', null, { id: 'pending-reschedule', class: 'alert alert--warning text-sm' }, [
        document.createTextNode(`Bạn đang giữ khung giờ mới ${formatDate(pendingReschedule.local_date)}, ${pendingReschedule.slot_label} để đổi lịch đơn này. Đơn hiện tại vẫn giữ nguyên cho tới khi bạn thanh toán. `),
        el('a', 'Tiếp tục đổi lịch', { href: `booking-confirmation.html?id=${encodeURIComponent(pendingReschedule.id)}`, class: 'text-link font-bold' })
      ])
      : null,
    el('div', null, { class: 'booking-actions' }, [
      el('div', null, { class: 'booking-actions-main' }, [
        b.status === 'pending' && role === 'customer'
          ? el('a', 'Tiếp tục thanh toán', { href: `booking-confirmation.html?id=${encodeURIComponent(b.id)}`, class: 'button' })
          : null,
        canReschedule
          ? el('a', 'Đổi lịch', { 'data-needs-active': '', id: 'reschedule', href: `booking-schedule.html?id=${encodeURIComponent(b.pitch_id)}&rescheduleBookingId=${encodeURIComponent(b.id)}&date=${encodeURIComponent(b.local_date)}`, class: 'button secondary' })
          : null,
        msgBtn,
        el('a', 'Xem thông tin sân', { href: `pitch-detail.html?id=${encodeURIComponent(b.pitch_id)}`, class: 'button secondary' })
      ]),
      el('div', null, { class: 'booking-actions-danger', hidden: cancelBtn.hidden }, [cancelBtn])
    ])
  ]);

  const reviewSection = el('section', null, { class: 'surface stack', hidden: b.status !== 'completed' });
  if (b.status === 'completed') {
    if (existingReview) {
      reviewSection.append(
        el('h2', 'Đánh giá của bạn cho trận đấu này'),
        el('div', null, { class: 'card card--compact card--subtle stack-sm' }, [
          el('span', `★ ${existingReview.rating}/5`, { class: 'badge badge--warning' }),
          el('p', existingReview.body || ''),
          el('span', `Gửi lúc ${formatDateTime(existingReview.created_date)}`, { class: 'text-xs muted' })
        ])
      );
    } else if (role === 'customer' && b.customer_id === u.id) {
      const RATING_TEXT = { 1: 'Không hài lòng', 2: 'Cần cải thiện', 3: 'Bình thường', 4: 'Tốt', 5: 'Rất hài lòng' };
      const ratingCaption = el('span', `5 sao: ${RATING_TEXT[5]}`, { class: 'star-rating-caption text-sm muted', 'aria-live': 'polite' });
      const starInputs = [];
      const starRow = el('div', null, { class: 'star-rating-stars' });
      for (let n = 5; n >= 1; n -= 1) {
        const input = el('input', null, { type: 'radio', name: 'rating', value: String(n), id: `review-star-${n}`, class: 'star-rating-input' });
        input.checked = n === 5;
        input.addEventListener('change', () => { ratingCaption.textContent = `${n} sao: ${RATING_TEXT[n]}`; });
        starInputs.push(input);
        starRow.append(input, el('label', '★', { for: `review-star-${n}`, class: 'star-rating-star', title: `${n} sao: ${RATING_TEXT[n]}`, 'aria-label': `${n} sao: ${RATING_TEXT[n]}` }));
      }
      const ratingSelect = { get value() { return starInputs.find(i => i.checked)?.value || '5'; } };
      const ratingField = el('fieldset', null, { class: 'star-rating' }, [
        el('legend', 'Mức đánh giá', { class: 'star-rating-legend' }),
        el('div', null, { class: 'star-rating-row' }, [starRow, ratingCaption])
      ]);
      const reviewBody = el('textarea', null, {
        id: 'review-body',
        name: 'body',
        required: true,
        maxlength: '800',
        placeholder: 'Chia sẻ chất lượng mặt cỏ, ánh sáng, thái độ phục vụ...'
      });
      const revForm = el('form', null, { class: 'stack', novalidate: true }, [
        el('h2', 'Gửi đánh giá sân sau trận đấu'),
        ratingField,
        el('div', null, { class: 'field-group' }, [
          el('label', 'Nhận xét của bạn', { for: 'review-body' }),
          reviewBody
        ]),
        el('button', 'Gửi đánh giá', { type: 'submit', class: 'button' })
      ]);
      revForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submit = revForm.querySelector('button[type="submit"]');
        if (submit.disabled) return;
        clearFieldErrors(revForm);
        if (!reviewBody.value.trim()) {
          setFieldError(reviewBody, 'Vui lòng nhập nhận xét đánh giá của bạn.');
          focusFirstInvalid(revForm);
          return;
        }
        submit.disabled = true;
        try {
          const r = await api.functions.invoke('submitReview', {
            booking_id: b.id,
            rating: Number(ratingSelect.value),
            body: reviewBody.value.trim()
          });
          if (r.data?.error) throw new Error(r.data.error);
          toast('Cảm ơn bạn đã gửi đánh giá!');
          await renderBookingDetailsPage();
          const heading = main.querySelector('h1');
          if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
        } catch (err) {
          setFieldError(reviewBody, err.message || 'Không thể gửi đánh giá.');
        } finally {
          submit.disabled = false;
          if (reviewBody.isConnected && reviewBody.getAttribute('aria-invalid') === 'true') reviewBody.focus();
        }
      });
      reviewSection.append(revForm);
    }
  }

  main.replaceChildren(
    el('a', backLabel, { href: backHref, class: 'text-sm font-bold text-link' }),
    detailCard,
    reviewSection,
    el('p', '', { id: 'error', role: 'alert' }),
    cancelDialog
  );
}

bootCustomerPage(user => renderBookingDetailsPage(user));
