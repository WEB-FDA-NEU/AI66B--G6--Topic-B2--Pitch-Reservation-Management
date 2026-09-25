// ============================================================
//  S07 — Booking Schedule
//  Đọc pitchId, cho chọn ngày (trong 7 ngày tới) và khung giờ,
//  mô phỏng giữ chỗ tạm thời 10 phút (BR-14, BR-18, BR-26, BR-27).
//  Không xử lý thanh toán, không xác nhận đặt sân cuối cùng (chỉ S08/S09).
// ============================================================
import { MOCK_PITCHES, formatPitchPrice } from '../data/pitches.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 phút — yêu cầu hiện tại của nhóm
const DAY_COUNT = 7; // BR-14: chỉ đặt trong 7 ngày tới
const SLOT_TIMES = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const elements = {
  hint: document.getElementById('pitch-summary-hint'),
  invalidState: document.getElementById('invalid-pitch-state'),
  content: document.getElementById('booking-content'),
  summaryCard: document.getElementById('pitch-summary-card'),
  summaryImg: document.getElementById('pitch-summary-img'),
  summaryTitle: document.getElementById('pitch-summary-title'),
  summaryMeta: document.getElementById('pitch-summary-meta'),
  summaryPrice: document.getElementById('pitch-summary-price'),
  dateRow: document.getElementById('date-chip-row'),
  slotGrid: document.getElementById('slot-grid'),
  slotEmptyState: document.getElementById('slot-empty-state'),
  holdBanner: document.getElementById('hold-banner'),
  holdBannerSlot: document.getElementById('hold-banner-slot'),
  holdBannerTimer: document.getElementById('hold-banner-timer'),
  holdExpiredBanner: document.getElementById('hold-expired-banner'),
  conflictBanner: document.getElementById('conflict-banner'),
  cancelButton: document.getElementById('cancel-button'),
  continueButton: document.getElementById('continue-button'),
};

const state = {
  pitch: null,
  dates: [],
  selectedDateIndex: 0,
  selectedSlot: null, // { time, dateStr }
  holdExpiresAt: null,
  holdTimerId: null,
};

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Chấp nhận cả dạng số (khớp mock hiện có) lẫn dạng "P001". */
function findPitch(pitchIdParam) {
  if (!pitchIdParam) return null;
  const direct = MOCK_PITCHES.find(p => String(p.id) === pitchIdParam);
  if (direct) return direct;
  const numeric = Number(pitchIdParam.replace(/\D/g, ''));
  return MOCK_PITCHES.find(p => p.id === numeric) ?? null;
}

/** Sinh trạng thái khung giờ mô phỏng, cố định theo sân + ngày (không dùng random
 *  để có thể kiểm thử lại được nhiều lần trên cùng một ngày). */
function generateSlots(pitch, dateObj, dateIndex) {
  const dateStr = toDateValue(dateObj);
  const isToday = toDateValue(dateObj) === toDateValue(startOfDay(new Date()));
  const now = new Date();
  const seed = pitch.id * 31 + dateObj.getDate();

  const slots = SLOT_TIMES.map((time, index) => {
    let status = 'available';
    if ((seed + index) % 5 === 0) status = 'booked';
    else if ((seed + index) % 7 === 0) status = 'unavailable';

    if (isToday) {
      const [hour] = time.split(':').map(Number);
      const slotMoment = new Date(dateObj);
      slotMoment.setHours(hour, 0, 0, 0);
      if (slotMoment <= now) status = 'unavailable'; // BR-11: không đặt giờ đã qua
    }

    return { time, dateStr, status, conflict: false };
  });

  // Mô phỏng một xung đột giữ chỗ (BR-18) có thể tái hiện được: ngày thứ 2
  // trong danh sách, khung giờ trống đầu tiên vừa bị người khác giữ.
  if (dateIndex === 1) {
    const firstAvailable = slots.find(slot => slot.status === 'available');
    if (firstAvailable) firstAvailable.conflict = true;
  }

  return slots;
}

function buildDates() {
  const today = startOfDay(new Date());
  return Array.from({ length: DAY_COUNT }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return date;
  });
}

function renderPitchSummary(pitch) {
  elements.summaryImg.src = pitch.image;
  elements.summaryImg.alt = `Hình ảnh ${pitch.name}`;
  elements.summaryTitle.textContent = pitch.name;
  elements.summaryMeta.textContent = `${pitch.location} · ${pitch.typeLabel}`;
  elements.summaryPrice.textContent = formatPitchPrice(pitch.price);
  elements.hint.textContent = `Chọn ngày và khung giờ bạn muốn chơi tại ${pitch.name}.`;
}

function renderDateChips() {
  const fragment = document.createDocumentFragment();
  state.dates.forEach((date, index) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'date-chip';
    chip.setAttribute('role', 'tab');
    chip.setAttribute('aria-selected', String(index === state.selectedDateIndex));
    if (index === state.selectedDateIndex) chip.classList.add('is-selected');

    const weekday = document.createElement('span');
    weekday.className = 'date-chip__weekday';
    weekday.textContent = index === 0 ? 'Hôm nay' : WEEKDAY_LABELS[date.getDay()];

    const day = document.createElement('span');
    day.className = 'date-chip__day';
    day.textContent = `${date.getDate()}/${date.getMonth() + 1}`;

    chip.append(weekday, day);
    chip.addEventListener('click', () => selectDate(index));
    fragment.append(chip);
  });
  elements.dateRow.replaceChildren(fragment);
}

function selectDate(index) {
  if (index === state.selectedDateIndex) return;
  releaseHold();
  state.selectedDateIndex = index;
  renderDateChips();
  loadSlotsForSelectedDate();
}

function loadSlotsForSelectedDate() {
  elements.slotGrid.setAttribute('aria-busy', 'true');
  elements.slotEmptyState.hidden = true;
  elements.conflictBanner.hidden = true;
  showSkeleton();

  // Mô phỏng độ trễ kiểm tra lịch trống.
  window.setTimeout(() => {
    const date = state.dates[state.selectedDateIndex];
    const slots = generateSlots(state.pitch, date, state.selectedDateIndex);
    renderSlots(slots);
    elements.slotGrid.setAttribute('aria-busy', 'false');
  }, 350);
}

function showSkeleton() {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < SLOT_TIMES.length; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'skeleton-slot';
    fragment.append(cell);
  }
  elements.slotGrid.replaceChildren(fragment);
}

const STATUS_LABEL = {
  available: 'Còn trống',
  booked: 'Đã đặt',
  unavailable: 'Không khả dụng',
};

function renderSlots(slots) {
  const availableCount = slots.filter(slot => slot.status === 'available').length;
  if (availableCount === 0) {
    elements.slotGrid.replaceChildren();
    elements.slotEmptyState.hidden = false;
    return;
  }
  elements.slotEmptyState.hidden = true;

  const fragment = document.createDocumentFragment();
  slots.forEach(slot => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot-button';
    button.disabled = slot.status !== 'available';
    if (slot.status === 'booked') button.classList.add('is-booked');

    const isSelected = state.selectedSlot
      && state.selectedSlot.dateStr === slot.dateStr
      && state.selectedSlot.time === slot.time;
    if (isSelected) button.classList.add('is-selected');

    const timeEl = document.createElement('span');
    timeEl.className = 'slot-button__time';
    timeEl.textContent = slot.time;

    const statusEl = document.createElement('span');
    statusEl.className = 'slot-button__status';
    statusEl.textContent = isSelected ? 'Đang giữ chỗ' : STATUS_LABEL[slot.status];

    button.append(timeEl, statusEl);
    button.addEventListener('click', () => handleSlotClick(slot, statusEl));
    fragment.append(button);
  });
  elements.slotGrid.replaceChildren(fragment);
}

function handleSlotClick(slot, statusEl) {
  if (slot.status !== 'available') return;

  if (slot.conflict) {
    slot.status = 'booked';
    slot.conflict = false;
    statusEl.textContent = STATUS_LABEL.booked;
    elements.conflictBanner.hidden = false;
    elements.holdExpiredBanner.hidden = true;
    return;
  }

  elements.conflictBanner.hidden = true;
  startHold(slot);
  loadSlotsForSelectedDate(); // vẽ lại lưới để phản ánh khung giờ vừa chọn
}

function startHold(slot) {
  clearHoldTimer();
  state.selectedSlot = { time: slot.time, dateStr: slot.dateStr };
  state.holdExpiresAt = Date.now() + HOLD_DURATION_MS;
  elements.holdExpiredBanner.hidden = true;
  elements.holdBanner.hidden = false;
  elements.continueButton.disabled = false;

  const [year, month, day] = slot.dateStr.split('-');
  elements.holdBannerSlot.textContent = `${slot.time} · ${day}/${month}/${year}`;

  updateHoldTimerText();
  state.holdTimerId = window.setInterval(() => {
    if (Date.now() >= state.holdExpiresAt) {
      expireHold();
      return;
    }
    updateHoldTimerText();
  }, 1000);
}

function updateHoldTimerText() {
  const remainingMs = Math.max(0, state.holdExpiresAt - Date.now());
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  elements.holdBannerTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function expireHold() {
  clearHoldTimer();
  state.selectedSlot = null;
  state.holdExpiresAt = null;
  elements.holdBanner.hidden = true;
  elements.holdExpiredBanner.hidden = false;
  elements.continueButton.disabled = true;
  loadSlotsForSelectedDate();
}

function releaseHold() {
  clearHoldTimer();
  state.selectedSlot = null;
  state.holdExpiresAt = null;
  elements.holdBanner.hidden = true;
  elements.holdExpiredBanner.hidden = true;
  elements.continueButton.disabled = true;
}

function clearHoldTimer() {
  if (state.holdTimerId) {
    window.clearInterval(state.holdTimerId);
    state.holdTimerId = null;
  }
}

function handleContinue() {
  if (!state.selectedSlot || !state.holdExpiresAt || Date.now() >= state.holdExpiresAt) return;
  const params = new URLSearchParams({
    pitchId: String(state.pitch.id),
    slotId: `${state.selectedSlot.dateStr}T${state.selectedSlot.time}`,
    holdExpiresAt: String(state.holdExpiresAt),
  });
  location.href = `booking-confirmation.html?${params.toString()}`;
}

function handleCancel() {
  releaseHold();
  loadSlotsForSelectedDate();
}

function init() {
  const pitchId = new URLSearchParams(location.search).get('pitchId');
  const pitch = findPitch(pitchId);

  if (!pitch) {
    elements.invalidState.hidden = false;
    elements.content.hidden = true;
    elements.hint.textContent = 'Không tìm thấy sân bóng phù hợp.';
    return;
  }

  state.pitch = pitch;
  state.dates = buildDates();
  elements.invalidState.hidden = true;
  elements.content.hidden = false;

  renderPitchSummary(pitch);
  renderDateChips();
  loadSlotsForSelectedDate();

  elements.continueButton.addEventListener('click', handleContinue);
  elements.cancelButton.addEventListener('click', handleCancel);
}

init();
