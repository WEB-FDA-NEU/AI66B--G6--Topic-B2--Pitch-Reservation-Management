// ============================================================
//  S10 — Booking Result
//  Nhận bookingId và hiển thị trạng thái tương ứng.
//  Xác thực booking từ shared module / localStorage thay vì URL.
// ============================================================
import { formatVND } from '../render.js';
import { requireLogin, isLoggedIn } from '../auth.js';
import { findBooking, pitchForBooking, STATUS_META } from '../data/bookings.js';
import { getCompletedBooking } from '../services/booking-service.js';
import { showPopup } from '../services/popup.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const elements = {
  successState: document.getElementById('success-state'),
  failedState: document.getElementById('failed-state'),
  expiredState: document.getElementById('expired-state'),
  
  // Thành công
  resultBookingId: document.getElementById('result-booking-id'),
  resultPitchName: document.getElementById('result-pitch-name'),
  resultDatetime: document.getElementById('result-datetime'),
  resultAmount: document.getElementById('result-amount'),
  resultStatus: document.getElementById('result-status'),
  resultTransactionRow: document.getElementById('result-transaction-row'),
  resultTransactionId: document.getElementById('result-transaction-id'),
  linkDetails: document.getElementById('link-booking-details'),
  linkHistory: document.getElementById('link-booking-history'),

  // Thất bại
  linkRetryBooking: document.getElementById('link-retry-booking'),
};

function showOnly(sectionId) {
  ['success-state', 'failed-state', 'expired-state'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = (id !== sectionId);
  });
}

function showMissingPopup() {
  showPopup({
    type: 'error',
    title: 'Không tìm thấy kết quả đặt sân',
    message: 'Liên kết này không đi kèm thông tin đặt sân hợp lệ. Vui lòng thực hiện lại.',
    actions: [{ text: 'Về trang tìm sân', href: 'search.html', primary: true }]
  });
}

function renderSuccess(booking, pitch) {
  elements.resultBookingId.textContent = booking.id;
  elements.resultPitchName.textContent = pitch ? pitch.name : '—';
  
  if (booking.date && booking.time) {
    const [year, month, day] = booking.date.split('-');
    elements.resultDatetime.textContent = `${booking.time} · ${day}/${month}/${year}`;
  } else if (booking.slotId) { // From new drafts
    const [dateStr, timeStr] = booking.slotId.split('T');
    const [year, month, day] = dateStr.split('-');
    elements.resultDatetime.textContent = `${timeStr} · ${day}/${month}/${year}`;
  }

  elements.resultAmount.textContent = formatVND(booking.amount);
  
  const meta = STATUS_META[booking.status] ?? { label: booking.status };
  elements.resultStatus.textContent = meta.label;
  
  if (booking.transactionId) {
    elements.resultTransactionRow.hidden = false;
    elements.resultTransactionId.textContent = booking.transactionId;
  } else {
    elements.resultTransactionRow.hidden = true;
  }

  // Bật nút điều hướng
  elements.linkDetails.removeAttribute('aria-disabled');
  elements.linkDetails.addEventListener('click', () => {
    location.href = `booking-detail.html?bookingId=${booking.id}`;
  });
  
  elements.linkHistory.removeAttribute('aria-disabled');
  elements.linkHistory.addEventListener('click', () => {
    location.href = 'booking-history.html';
  });

  showOnly('success-state');
}

function init() {
  if (!isLoggedIn()) return requireLogin();

  const params = new URLSearchParams(location.search);
  const bookingId = params.get('bookingId');
  const paymentStatus = params.get('paymentStatus'); // paid, failed, expired
  
  if (!bookingId) {
    showMissingPopup();
    return;
  }

  // Hỗ trợ cả booking tĩnh (MOCK_BOOKINGS) và booking vừa tạo (localStorage)
  const booking = findBooking(bookingId) || getCompletedBooking(bookingId);
  if (!booking) {
    showMissingPopup();
    return;
  }
  
  // Dùng pitch từ service nếu có, không thì import từ data
  const pitch = pitchForBooking(booking) || { name: 'Sân bóng' }; 

  // Kiểm tra trạng thái thanh toán từ hệ thống (lấy từ param tạm thời để test các luồng thất bại)
  // Thực tế backend sẽ trả về status nằm trong booking record.
  const actualPaymentStatus = paymentStatus || booking.paymentStatus;

  if (actualPaymentStatus === 'paid') {
    renderSuccess(booking, pitch);
  } else if (actualPaymentStatus === 'expired') {
    showOnly('expired-state');
  } else {
    // Trạng thái thất bại (failed) - Sửa link retry
    elements.linkRetryBooking.href = `booking-schedule.html?pitchId=${booking.pitchId}`;
    showOnly('failed-state');
  }
}

init();
