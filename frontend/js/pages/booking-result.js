import '../components/site-header.js';
import '../components/site-footer.js';
import { initializeState } from '../services/storage-service.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { BOOKING_STATUS_META, BOOKING_STATUSES, getCustomerBooking } from '../services/booking-service.js';
import { formatVND } from '../render.js';

const elements = {
  content: document.getElementById('result-content'),
  pageState: document.getElementById('page-state'),
  pageStateTitle: document.getElementById('page-state-title'),
  pageStateMessage: document.getElementById('page-state-message'),
  bookingId: document.getElementById('result-booking-id'),
  pitchName: document.getElementById('result-pitch-name'),
  dateTime: document.getElementById('result-datetime'),
  amount: document.getElementById('result-amount'),
  status: document.getElementById('result-status'),
  transactionRow: document.getElementById('result-transaction-row'),
  transactionId: document.getElementById('result-transaction-id'),
  detailsLink: document.getElementById('booking-details-link'),
};

function showState(title, message) {
  elements.content.hidden = true;
  elements.pageStateTitle.textContent = title;
  elements.pageStateMessage.textContent = message;
  elements.pageState.hidden = false;
}

async function init() {
  await initializeState();
  const user = requireRole([ROLES.CUSTOMER]);
  if (!user) return;

  const bookingId = new URLSearchParams(location.search).get('bookingId');
  const booking = getCustomerBooking(user, bookingId);
  if (!booking || booking.status !== BOOKING_STATUSES.CONFIRMED || booking.paymentStatus !== 'Paid') {
    showState('Không tìm thấy kết quả đã xác nhận', 'Mã đặt sân không hợp lệ hoặc lượt đặt chưa được thanh toán thành công.');
    return;
  }

  elements.bookingId.textContent = booking.id;
  elements.pitchName.textContent = booking.snapshot.pitchName;
  elements.dateTime.textContent = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(booking.slotStart));
  elements.amount.textContent = formatVND(booking.amount);
  elements.status.textContent = BOOKING_STATUS_META[booking.status].label;
  elements.transactionRow.hidden = !booking.transactionId;
  elements.transactionId.textContent = booking.transactionId || '';
  elements.detailsLink.href = `booking-details.html?${new URLSearchParams({ bookingId: booking.id })}`;
  elements.content.hidden = false;
}

init();
