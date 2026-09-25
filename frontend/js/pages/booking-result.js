// ============================================================
//  S10 — Booking Result
//  Đọc bookingId, transactionId, paymentStatus (từ S09 — chưa triển khai
//  ở Sub-issue này). Vì chưa có backend/S09 thật, dữ liệu hiển thị cho
//  trạng thái "thành công" được suy ra mô phỏng, ổn định theo bookingId,
//  chỉ để minh hoạ giao diện Mốc 2 — không phải dữ liệu đã lưu trữ thật.
// ============================================================
import { MOCK_PITCHES, formatPitchPrice } from '../data/pitches.js';
import { formatVND } from '../render.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const states = {
  success: document.getElementById('success-state'),
  failed: document.getElementById('failed-state'),
  expired: document.getElementById('expired-state'),
  missing: document.getElementById('missing-state'),
};

const elements = {
  bookingId: document.getElementById('result-booking-id'),
  pitchName: document.getElementById('result-pitch-name'),
  datetime: document.getElementById('result-datetime'),
  amount: document.getElementById('result-amount'),
  status: document.getElementById('result-status'),
  transactionRow: document.getElementById('result-transaction-row'),
  transactionId: document.getElementById('result-transaction-id'),
  retryLink: document.getElementById('link-retry-booking'),
};

const STATUS_LABEL = {
  paid: 'Đã xác nhận',
  confirmed: 'Đã xác nhận',
};

function showOnly(name) {
  Object.entries(states).forEach(([key, section]) => {
    if (section) section.hidden = key !== name;
  });
}

/** Suy ra một bản ghi đặt sân mô phỏng ổn định từ bookingId, chỉ để
 *  minh hoạ giao diện khi chưa có S09/backend thật cung cấp dữ liệu. */
function deriveMockBooking(bookingId) {
  let hash = 0;
  for (const char of bookingId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;

  const pitch = MOCK_PITCHES[hash % MOCK_PITCHES.length];
  const daysAhead = 1 + (hash % 7);
  const hours = [6, 8, 10, 14, 16, 18, 20];
  const hour = hours[hash % hours.length];

  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);

  const dateLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);

  return {
    pitch,
    datetimeLabel: `${String(hour).padStart(2, '0')}:00 · ${dateLabel}`,
    amount: pitch.price + 20000,
  };
}

function renderSuccess(bookingId, transactionId, paymentStatus) {
  const booking = deriveMockBooking(bookingId);

  elements.bookingId.textContent = bookingId;
  elements.pitchName.textContent = booking.pitch.name;
  elements.datetime.textContent = booking.datetimeLabel;
  elements.amount.textContent = formatVND(booking.amount);
  elements.status.textContent = STATUS_LABEL[paymentStatus] ?? 'Đã xác nhận';

  if (transactionId) {
    elements.transactionId.textContent = transactionId;
    elements.transactionRow.hidden = false;
  } else {
    elements.transactionRow.hidden = true;
  }

  showOnly('success');
}

function init() {
  const params = new URLSearchParams(location.search);
  const bookingId = params.get('bookingId');
  const transactionId = params.get('transactionId');
  const paymentStatus = params.get('paymentStatus');

  if (!bookingId) {
    showOnly('missing');
    return;
  }

  if (paymentStatus === 'expired') {
    showOnly('expired');
    return;
  }

  if (paymentStatus === 'failed') {
    elements.retryLink.href = 'booking-schedule.html';
    showOnly('failed');
    return;
  }

  if (paymentStatus === 'paid' || paymentStatus === 'confirmed') {
    renderSuccess(bookingId, transactionId, paymentStatus);
    return;
  }

  // paymentStatus thiếu hoặc không nhận diện được cùng bookingId hợp lệ.
  showOnly('missing');
}

// Các nút "Xem chi tiết đặt sân" (S12) và "Lịch sử đặt sân" (S11) giữ nguyên
// trạng thái bất hoạt: hai màn hình đó thuộc Sub-issue khác, chưa được duyệt
// tích hợp trong PR này (AGENTS.md §10.1).

init();
