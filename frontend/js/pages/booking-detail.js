// ============================================================
//  S12 — Booking Details
//  Hiển thị thông tin đầy đủ của một lượt đặt sân.
//  Dữ liệu hợp nhất từ mock cục bộ và các draft đã thanh toán.
// ============================================================
import { formatVND } from '../render.js';
import { isLoggedIn, requireLogin } from '../auth.js';
import { findBooking, pitchForBooking, STATUS_META } from '../data/bookings.js';
import { getCompletedBooking } from '../services/booking-service.js';
import { showPopup } from '../services/popup.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const CANCEL_DEADLINE_HOURS = 2; // BR-12

const elements = {
  loadingState: document.getElementById('loading-state'),
  content: document.getElementById('detail-content'),
  ref: document.getElementById('booking-ref'),
  statusBadge: document.getElementById('booking-status-badge'),
  pitchImg: document.getElementById('detail-pitch-img'),
  pitchName: document.getElementById('detail-pitch-name'),
  pitchLocation: document.getElementById('detail-pitch-location'),
  date: document.getElementById('detail-date'),
  time: document.getElementById('detail-time'),
  customerName: document.getElementById('detail-customer-name'),
  customerPhone: document.getElementById('detail-customer-phone'),
  amount: document.getElementById('detail-amount'),
  paymentBadge: document.getElementById('detail-payment-badge'),
  statusHistory: document.getElementById('status-history'),
  cancelButton: document.getElementById('cancel-button'),
  cancelIneligibleHint: document.getElementById('cancel-ineligible-hint'),
  rescheduleLink: document.getElementById('reschedule-link'),
  rescheduleIneligibleHint: document.getElementById('reschedule-ineligible-hint'),
  reviewButton: document.getElementById('review-button'),
  reviewHint: document.getElementById('review-hint'),
};

function applyBadge(el, statusKey) {
  const meta = STATUS_META[statusKey] ?? { label: statusKey, badge: 'status-badge--pending' };
  el.textContent = meta.label;
  el.className = `status-badge ${meta.badge}`;
}

function hoursUntilStart(booking) {
  const start = new Date(`${booking.date}T${booking.time}:00`);
  return (start.getTime() - Date.now()) / 3_600_000;
}

function renderStatusHistory(booking) {
  const entries = [{ label: 'Đã tạo lượt đặt sân', time: booking.createdAt }];
  if (booking.status === 'confirmed' || booking.status === 'completed' || booking.status === 'rescheduled') {
    entries.push({ label: 'Thanh toán thành công, đặt sân được xác nhận', time: booking.createdAt });
  }
  if (booking.status === 'completed') entries.push({ label: 'Buổi chơi đã hoàn tất', time: `${booking.date}T${booking.time}:00` });
  if (booking.status === 'cancelled') entries.push({ label: 'Lượt đặt sân đã bị huỷ', time: booking.createdAt });
  if (booking.status === 'rescheduled') entries.push({ label: 'Đã được đổi sang lịch mới', time: booking.createdAt });
  if (booking.status === 'payment_failed') entries.push({ label: 'Thanh toán không thành công', time: booking.createdAt });

  elements.statusHistory.replaceChildren(...entries.map(entry => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = entry.label;
    const time = document.createElement('span');
    time.className = 'status-history__time';
    time.textContent = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.time));
    li.append(label, time);
    return li;
  }));
}

function renderActions(booking, pitch) {
  const remainingHours = hoursUntilStart(booking);

  // ---- Huỷ đặt sân (BR-12, BR-13) ----
  const cancelEligible = ['pending', 'confirmed'].includes(booking.status) && remainingHours >= CANCEL_DEADLINE_HOURS;
  elements.cancelButton.hidden = !cancelEligible;
  elements.cancelIneligibleHint.hidden = cancelEligible;
  if (!cancelEligible && ['pending', 'confirmed'].includes(booking.status)) {
    elements.cancelIneligibleHint.hidden = false;
    elements.cancelIneligibleHint.textContent = 'Không thể huỷ: đã trong vòng 2 giờ trước giờ đá.';
  }
  elements.cancelButton.onclick = () => {
    showPopup({
      type: 'warning',
      title: 'Huỷ đặt sân này?',
      message: `Bạn sẽ huỷ ${booking.id}. Nếu đủ điều kiện, khoản tiền sẽ được hoàn theo chính sách của Pitch Point.`,
      actions: [
        { text: 'Đóng', onClick: () => {} },
        { text: 'Huỷ đặt sân', primary: true, onClick: () => {
          booking.status = 'cancelled'; // chỉ cập nhật cục bộ
          applyBadge(elements.statusBadge, booking.status);
          renderStatusHistory(booking);
          renderActions(booking, pitch);
          showPopup({ type: 'success', title: 'Huỷ sân thành công', message: 'Lượt đặt sân đã được huỷ.', actions: [{ text: 'Đóng' }] });
        }}
      ]
    });
  };

  // ---- Đổi lịch (BR-15, BR-16) ----
  const rescheduleEligible = booking.status === 'confirmed' && remainingHours >= CANCEL_DEADLINE_HOURS;
  elements.rescheduleLink.hidden = !rescheduleEligible;
  elements.rescheduleIneligibleHint.hidden = rescheduleEligible;
  if (rescheduleEligible && pitch) {
    const params = new URLSearchParams({ pitchId: String(pitch.id), bookingId: booking.id });
    elements.rescheduleLink.href = `booking-schedule.html?${params.toString()}`;
  } else if (booking.status === 'confirmed') {
    elements.rescheduleIneligibleHint.textContent = 'Không thể đổi lịch: đã trong vòng 2 giờ trước giờ đá.';
  }

  // ---- Đánh giá ----
  const reviewEligible = booking.status === 'completed' && !booking.reviewed;
  elements.reviewButton.hidden = !reviewEligible && booking.status !== 'completed';
  elements.reviewHint.hidden = booking.status !== 'completed';
  if (booking.status === 'completed') {
    elements.reviewButton.hidden = false;
    elements.reviewHint.hidden = false;
    elements.reviewHint.textContent = booking.reviewed
      ? 'Bạn đã gửi đánh giá cho lượt đặt sân này.'
      : 'Viết đánh giá sẽ được liên kết sau khi được duyệt.';
    elements.reviewButton.setAttribute('aria-disabled', 'true');
  }
}

function renderBooking(booking) {
  const pitch = pitchForBooking(booking);

  elements.ref.textContent = booking.id;
  applyBadge(elements.statusBadge, booking.status);

  elements.pitchImg.src = pitch?.image ?? 'img/placeholder.svg';
  elements.pitchImg.alt = pitch ? `Hình ảnh ${pitch.name}` : 'Sân bóng';
  elements.pitchName.textContent = pitch ? pitch.name : 'Sân bóng không xác định';
  elements.pitchLocation.textContent = pitch ? pitch.location : '—';

  // Format date/time cho draft booking nếu cần
  if (!booking.date && booking.slotId) {
    const [d, t] = booking.slotId.split('T');
    booking.date = d;
    booking.time = t;
  }

  const [year, month, day] = booking.date.split('-');
  elements.date.textContent = `${day}/${month}/${year}`;
  elements.time.textContent = booking.time;

  elements.customerName.textContent = booking.customerName || 'Khách hàng';
  elements.customerPhone.textContent = booking.customerPhone || '—';

  elements.amount.textContent = formatVND(booking.amount);
  applyBadge(elements.paymentBadge, booking.paymentStatus);

  renderStatusHistory(booking);
  renderActions(booking, pitch);

  elements.content.hidden = false;
  elements.loadingState.hidden = true;
}

function init() {
  if (!isLoggedIn()) return requireLogin();

  const bookingId = new URLSearchParams(location.search).get('bookingId');
  elements.loadingState.hidden = false;

  window.setTimeout(() => {
    const booking = findBooking(bookingId) || getCompletedBooking(bookingId);
    if (!booking) {
      elements.loadingState.hidden = true;
      showPopup({
        type: 'error',
        title: 'Không tìm thấy lượt đặt sân',
        message: 'Mã đặt sân không hợp lệ hoặc không thuộc tài khoản của bạn.',
        actions: [{ text: 'Về lịch sử đặt sân', href: 'booking-history.html', primary: true }]
      });
      return;
    }
    renderBooking(booking);
  }, 250);
}

init();
