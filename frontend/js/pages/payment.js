import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { FINANCE_RESULT_CODES, getPaymentContext, processSimulatedPayment } from '../services/finance-service.js';
import { formatVND } from '../render.js';

const messages = {
  [FINANCE_RESULT_CODES.INVALID_DRAFT]: ['Không tìm thấy lượt giữ chỗ', 'Mã giữ chỗ không hợp lệ hoặc không thuộc tài khoản hiện tại.'],
  [FINANCE_RESULT_CODES.HOLD_EXPIRED]: ['Lượt giữ chỗ đã hết hạn', 'Khung giờ đã được giải phóng. Hãy chọn lại lịch đặt sân.'],
  [FINANCE_RESULT_CODES.PITCH_UNAVAILABLE]: ['Sân không còn khả dụng', 'Trạng thái sân đã thay đổi trước khi thanh toán.'],
  [FINANCE_RESULT_CODES.SLOT_UNAVAILABLE]: ['Khung giờ không còn trống', 'Khung giờ đã được một lượt đặt khác xác nhận.'],
  [FINANCE_RESULT_CODES.TERMS_CHANGED]: ['Thông tin đặt sân đã thay đổi', 'Giá hoặc dịch vụ đã thay đổi. Hãy quay lại chọn lịch để xác nhận lại.'],
  [FINANCE_RESULT_CODES.INSUFFICIENT_BALANCE]: ['Số dư không đủ', 'Thanh toán không được thực hiện và số dư không thay đổi.'],
  [FINANCE_RESULT_CODES.RESCHEDULE_NOT_ELIGIBLE]: ['Không thể đổi lịch', 'Lượt đặt sân ban đầu không còn đủ điều kiện đổi lịch.'],
};

const elements = {
  content: document.querySelector('#payment-content'), state: document.querySelector('#payment-state'),
  stateTitle: document.querySelector('#payment-state-title'), stateMessage: document.querySelector('#payment-state-message'),
  timer: document.querySelector('#hold-timer'), pitchName: document.querySelector('#pitch-name'),
  pitchLocation: document.querySelector('#pitch-location'), slotTime: document.querySelector('#slot-time'),
  draftId: document.querySelector('#draft-id'), total: document.querySelector('#payment-total'),
  balance: document.querySelector('#customer-balance'), balanceHint: document.querySelector('#balance-hint'),
  confirmation: document.querySelector('#confirm-payment'), payButton: document.querySelector('#pay-button'),
  feedback: document.querySelector('#payment-feedback'),
};

let currentUser;
let context;
let timerId;

function showState(code) {
  window.clearInterval(timerId);
  const [title, message] = messages[code] ?? ['Không thể thanh toán', 'Dữ liệu thanh toán không hợp lệ.'];
  elements.content.hidden = true;
  elements.stateTitle.textContent = title;
  elements.stateMessage.textContent = message;
  elements.state.hidden = false;
}

function updateTimer() {
  const remaining = Date.parse(context.draft.holdExpiresAt) - Date.now();
  if (remaining <= 0) { showState(FINANCE_RESULT_CODES.HOLD_EXPIRED); return; }
  elements.timer.textContent = `${String(Math.floor(remaining / 60000)).padStart(2, '0')}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
}

async function pay() {
  elements.payButton.disabled = true;
  const result = await processSimulatedPayment(currentUser, context.draft.id);
  if (result.ok || result.code === FINANCE_RESULT_CODES.ALREADY_PAID) {
    const bookingId = result.booking?.id ?? result.bookingId;
    location.assign(`booking-result.html?${new URLSearchParams({ bookingId })}`);
    return;
  }
  if (result.code === FINANCE_RESULT_CODES.INSUFFICIENT_BALANCE) {
    elements.feedback.textContent = messages[result.code][1];
    elements.balance.textContent = formatVND(result.balance);
    return;
  }
  showState(result.code);
}

async function init() {
  currentUser = requireRole([ROLES.CUSTOMER]);
  if (!currentUser) return;
  const bookingDraftId = new URLSearchParams(location.search).get('bookingDraftId');
  context = await getPaymentContext(currentUser, bookingDraftId);
  if (context.code === FINANCE_RESULT_CODES.ALREADY_PAID && context.bookingId) {
    location.replace(`booking-result.html?${new URLSearchParams({ bookingId: context.bookingId })}`);
    return;
  }
  if (!context.ok) { showState(context.code); return; }
  const { draft, balance, availableBalance } = context;
  elements.pitchName.textContent = draft.snapshot.pitchName;
  elements.pitchLocation.textContent = draft.snapshot.pitchLocation;
  elements.slotTime.textContent = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(draft.slotStart));
  elements.draftId.textContent = draft.id;
  elements.total.textContent = formatVND(draft.amount);
  elements.balance.textContent = formatVND(balance.amount);
  elements.balanceHint.textContent = availableBalance >= draft.amount
    ? `Số dư sau thanh toán: ${formatVND(availableBalance - draft.amount)}`
    : 'Số dư hiện tại không đủ để thanh toán.';
  elements.confirmation.disabled = availableBalance < draft.amount;
  elements.confirmation.addEventListener('change', () => { elements.payButton.disabled = !elements.confirmation.checked; });
  elements.payButton.addEventListener('click', pay);
  elements.content.hidden = false;
  updateTimer();
  timerId = window.setInterval(updateTimer, 1000);
}

init();
