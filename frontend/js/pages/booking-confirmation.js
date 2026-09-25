// ============================================================
//  S08 — Booking Confirmation
//  Đọc bản nháp từ localStorage (dựa vào bookingDraftId trên URL).
//  Hiển thị thông tin giữ chỗ, tính tiền, và người dùng thật.
// ============================================================
import { MOCK_PITCHES } from '../data/pitches.js';
import { formatVND } from '../render.js';
import { requireLogin, isLoggedIn, getUser } from '../auth.js';
import { getDraft, isHoldValid, completeDraft } from '../services/booking-service.js';
import { showPopup } from '../services/popup.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const SERVICE_FEE = 15000;

const elements = {
  content: document.getElementById('confirmation-content'),
  holdBannerTimer: document.getElementById('hold-banner-timer'),
  
  summaryPitchName: document.getElementById('summary-pitch-name'),
  summaryPitchLocation: document.getElementById('summary-pitch-location'),
  summaryPitchType: document.getElementById('summary-pitch-type'),
  summaryDate: document.getElementById('summary-date'),
  summaryTime: document.getElementById('summary-time'),
  
  summaryCustomerName: document.getElementById('summary-customer-name'),
  summaryCustomerPhone: document.getElementById('summary-customer-phone'),
  
  priceBase: document.getElementById('price-base'),
  priceFee: document.getElementById('price-fee'),
  priceTotal: document.getElementById('price-total'),
  
  backButton: document.getElementById('back-button'),
  proceedButton: document.getElementById('proceed-button'),
};

const state = {
  draft: null,
  pitch: null,
  holdTimerId: null,
};

function findPitch(pitchId) {
  return MOCK_PITCHES.find(p => p.id === pitchId) ?? null;
}

function parseSlotId(slotId) {
  const [dateStr, timeStr] = slotId.split('T');
  const [year, month, day] = dateStr.split('-');
  return { date: `${day}/${month}/${year}`, time: timeStr };
}

function updateHoldTimer() {
  if (!state.draft) return;
  const ms = state.draft.holdExpiresAt - Date.now();
  if (ms <= 0) {
    if (state.holdTimerId) window.clearInterval(state.holdTimerId);
    showExpired();
    return;
  }
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  elements.holdBannerTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function renderConfirmation() {
  const { pitch, draft } = state;
  const { date, time } = parseSlotId(draft.slotId);
  const user = getUser();

  elements.summaryPitchName.textContent = pitch.name;
  elements.summaryPitchLocation.textContent = pitch.location;
  elements.summaryPitchType.textContent = pitch.typeLabel;
  elements.summaryDate.textContent = date;
  elements.summaryTime.textContent = time;

  elements.summaryCustomerName.textContent = user?.display_name || 'Khách hàng';
  elements.summaryCustomerPhone.textContent = user?.phone || '—';

  const total = draft.amount + SERVICE_FEE;
  elements.priceBase.textContent = formatVND(draft.amount);
  elements.priceFee.textContent = formatVND(SERVICE_FEE);
  elements.priceTotal.textContent = formatVND(total);

  elements.proceedButton.removeAttribute('aria-disabled');
}

function showInvalid() {
  showPopup({
    type: 'error',
    title: 'Không thể xác nhận đặt sân',
    message: 'Thông tin đặt sân không hợp lệ hoặc đã thiếu.',
    actions: [{ text: 'Quay lại tìm sân', href: 'search.html', primary: true }]
  });
}

function showExpired() {
  showPopup({
    type: 'warning',
    title: 'Thời gian giữ chỗ đã hết hạn',
    message: 'Khung giờ đã được nhả lại cho người khác. Vui lòng chọn lại lịch đá.',
    actions: [{ text: 'Chọn lại lịch đá', href: state.pitch ? `booking-schedule.html?pitchId=${state.pitch.id}` : 'search.html', primary: true }]
  });
}

function handleProceed() {
  if (elements.proceedButton.getAttribute('aria-disabled') === 'true') return;
  if (!isHoldValid(state.draft)) {
    showExpired();
    return;
  }
  
  // Tích hợp S09 giả lập: Hoàn tất draft thành booking
  const booking = completeDraft(state.draft.id);
  if (!booking) {
    showInvalid();
    return;
  }

  // Chuyển sang S10 truyền vào bookingId
  const params = new URLSearchParams({
    bookingId: booking.id,
    paymentStatus: 'paid' // Truyền trạng thái thanh toán sang S10 để test UI
  });
  location.href = `booking-result.html?${params.toString()}`;
}

function init() {
  if (!isLoggedIn()) return requireLogin();

  const params = new URLSearchParams(location.search);
  const pitchId = Number(params.get('pitchId'));
  const draftId = params.get('bookingDraftId');

  if (!pitchId || !draftId) {
    showInvalid();
    return;
  }

  const pitch = findPitch(pitchId);
  const draft = getDraft(draftId);

  if (!pitch || !draft || draft.pitchId !== pitch.id) {
    showInvalid();
    return;
  }

  if (!isHoldValid(draft)) {
    state.pitch = pitch; // Cần pitch để link quay lại hoạt động
    showExpired();
    return;
  }

  state.pitch = pitch;
  state.draft = draft;
  elements.content.hidden = false;

  renderConfirmation();
  
  updateHoldTimer();
  state.holdTimerId = window.setInterval(updateHoldTimer, 1000);

  elements.proceedButton.addEventListener('click', handleProceed);
  elements.backButton.addEventListener('click', () => {
    location.href = `booking-schedule.html?pitchId=${pitch.id}`;
  });
}

init();
