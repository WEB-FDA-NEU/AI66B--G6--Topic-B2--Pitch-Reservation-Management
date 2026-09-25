// ============================================================
//  S08 — Booking Confirmation
//  Đọc pitchId, slotId, holdExpiresAt (từ S07), hiển thị tóm tắt để khách
//  xác nhận trước khi sang thanh toán mô phỏng (S09 — KHÔNG triển khai ở đây).
//  Không trừ số dư, không xử lý thanh toán, không hiển thị Booking Result.
// ============================================================
import { MOCK_PITCHES, formatPitchPrice } from '../data/pitches.js';
import { formatVND } from '../render.js';
import { getUser } from '../auth.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const SERVICE_FEE = 20000; // phí dịch vụ mô phỏng, cố định cho Mốc 2

const elements = {
  invalidState: document.getElementById('invalid-state'),
  invalidHint: document.getElementById('invalid-state-hint'),
  expiredState: document.getElementById('expired-state'),
  expiredRetryLink: document.getElementById('expired-retry-link'),
  content: document.getElementById('confirmation-content'),
  holdTimer: document.getElementById('hold-banner-timer'),
  pitchName: document.getElementById('summary-pitch-name'),
  pitchLocation: document.getElementById('summary-pitch-location'),
  pitchType: document.getElementById('summary-pitch-type'),
  date: document.getElementById('summary-date'),
  time: document.getElementById('summary-time'),
  customerName: document.getElementById('summary-customer-name'),
  customerPhone: document.getElementById('summary-customer-phone'),
  priceBase: document.getElementById('price-base'),
  priceFee: document.getElementById('price-fee'),
  priceTotal: document.getElementById('price-total'),
  backButton: document.getElementById('back-button'),
  proceedButton: document.getElementById('proceed-button'),
};

let holdTimerId = null;

function showInvalid(message) {
  elements.invalidHint.textContent = message;
  elements.invalidState.hidden = false;
  elements.expiredState.hidden = true;
  elements.content.hidden = true;
}

function showExpired(pitchId) {
  elements.expiredRetryLink.href = pitchId
    ? `booking-schedule.html?pitchId=${encodeURIComponent(pitchId)}`
    : 'booking-schedule.html';
  elements.expiredState.hidden = false;
  elements.invalidState.hidden = true;
  elements.content.hidden = true;
}

/** Chấp nhận cả dạng số lẫn dạng "P001", giống S07. */
function findPitch(pitchIdParam) {
  if (!pitchIdParam) return null;
  const direct = MOCK_PITCHES.find(p => String(p.id) === pitchIdParam);
  if (direct) return direct;
  const numeric = Number(pitchIdParam.replace(/\D/g, ''));
  return MOCK_PITCHES.find(p => p.id === numeric) ?? null;
}

function parseSlotId(slotId) {
  // Định dạng do S07 tạo ra: "YYYY-MM-DDTHH:mm"
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(slotId ?? '');
  if (!match) return null;
  const [, dateStr, time] = match;
  const [year, month, day] = dateStr.split('-');
  return { dateStr, time, displayDate: `${day}/${month}/${year}` };
}

function updateHoldTimer(holdExpiresAt) {
  const remainingMs = Math.max(0, holdExpiresAt - Date.now());
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  elements.holdTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function renderConfirmation(pitch, slot, bookingDraftId) {
  elements.pitchName.textContent = pitch.name;
  elements.pitchLocation.textContent = pitch.location;
  elements.pitchType.textContent = pitch.typeLabel;
  elements.date.textContent = slot.displayDate;
  elements.time.textContent = slot.time;

  const user = getUser();
  elements.customerName.textContent = user?.display_name ?? 'Khách demo (chưa đăng nhập)';
  elements.customerPhone.textContent = user?.phone ?? 'Chưa cập nhật';

  elements.priceBase.textContent = formatPitchPrice(pitch.price).replace(' / giờ', '');
  elements.priceFee.textContent = formatVND(SERVICE_FEE);
  const total = pitch.price + SERVICE_FEE;
  elements.priceTotal.textContent = formatVND(total);

  elements.proceedButton.dataset.bookingDraftId = bookingDraftId;
  elements.proceedButton.dataset.amount = String(total);

  elements.content.hidden = false;
  elements.invalidState.hidden = true;
  elements.expiredState.hidden = true;
}

function handleProceed() {
  // Cố ý ĐỂ TRỐNG: điểm vào S09 — Mock Payment thuộc mảng Payment & Finance
  // và chưa được duyệt tích hợp trong Sub-issue này. Nút hiển thị nhưng
  // không điều hướng, không đổi URL, không hiện thông báo giả lập.
}

function init() {
  const params = new URLSearchParams(location.search);
  const pitchId = params.get('pitchId');
  const slotId = params.get('slotId');
  const holdExpiresAtRaw = params.get('holdExpiresAt');

  const pitch = findPitch(pitchId);
  const slot = parseSlotId(slotId);
  const holdExpiresAt = Number(holdExpiresAtRaw);

  if (!pitch || !slot || !holdExpiresAtRaw || Number.isNaN(holdExpiresAt)) {
    showInvalid('Thiếu hoặc sai thông tin sân, khung giờ hay thời hạn giữ chỗ.');
    return;
  }

  if (Date.now() >= holdExpiresAt) {
    showExpired(pitchId);
    return;
  }

  const bookingDraftId = params.get('bookingDraftId') ?? `BD-${pitch.id}-${Date.now()}`;
  renderConfirmation(pitch, slot, bookingDraftId);
  updateHoldTimer(holdExpiresAt);

  holdTimerId = window.setInterval(() => {
    if (Date.now() >= holdExpiresAt) {
      window.clearInterval(holdTimerId);
      showExpired(pitchId);
      return;
    }
    updateHoldTimer(holdExpiresAt);
  }, 1000);

  elements.backButton.addEventListener('click', () => {
    const backParams = new URLSearchParams({ pitchId: String(pitch.id) });
    location.href = `booking-schedule.html?${backParams.toString()}`;
  });
  elements.proceedButton.addEventListener('click', handleProceed);
}

init();
