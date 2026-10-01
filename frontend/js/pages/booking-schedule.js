// ============================================================
//  S07 — Booking Schedule
//  Cho phép người dùng chọn ngày và một khung giờ trống.
//  Khi chọn, sẽ giữ chỗ (hold) 10 phút qua localStorage (để
//  không bị mất nếu tải lại trang).
// ============================================================
import { MOCK_PITCHES, formatPitchPrice } from '../data/pitches.js';
import { requireLogin, isLoggedIn } from '../auth.js';
import { createDraft, getDraftForPitch, removeDraft, isHoldValid, HOLD_DURATION_MS } from '../services/booking-service.js';
import { showPopup } from '../services/popup.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const DAY_COUNT = 7;
const SLOT_TIMES = ['06:00', '08:00', '10:00', '14:00', '16:00', '18:00', '20:00'];
const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const elements = {
  content: document.getElementById('booking-content'),
  pitchSummaryImg: document.getElementById('pitch-summary-img'),
  pitchSummaryTitle: document.getElementById('pitch-summary-title'),
  pitchSummaryMeta: document.getElementById('pitch-summary-meta'),
  pitchSummaryPrice: document.getElementById('pitch-summary-price'),
  dateChipRow: document.getElementById('date-chip-row'),
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
  selectedDate: startOfDay(new Date()), // Ngày đang xem
  selectedSlot: null,                   // Khung giờ đã chọn (giữ chỗ)
  holdExpiresAt: null,                  // Thời hạn giữ chỗ
  holdTimerId: null,
  draftId: null,                        // ID bản nháp đặt sân
};

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateValue(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function findPitch(idStr) {
  if (!idStr) return null;
  const numId = idStr.startsWith('P') ? parseInt(idStr.substring(1), 10) : parseInt(idStr, 10);
  return MOCK_PITCHES.find(p => p.id === numId) ?? null;
}

/** Tạo mốc dữ liệu ngẫu nhiên có tính ổn định cao. */
function generateSlots(dateStr) {
  const seed = state.pitch.id * 31 + parseInt(dateStr.replace(/-/g, ''), 10);
  const now = new Date();
  const isToday = dateStr === toDateValue(now);

  return SLOT_TIMES.map((time, idx) => {
    const slotId = `${dateStr}T${time}`;
    const [h, m] = time.split(':').map(Number);
    const slotDate = new Date(dateStr);
    slotDate.setHours(h, m, 0, 0);

    // BR-11: Chặn khung giờ đã qua
    if (isToday && slotDate < now) {
      return { id: slotId, time, status: 'unavailable' };
    }

    const random = Math.sin(seed + idx) * 10000;
    const value = random - Math.floor(random);

    // Sân đầu tiên (Bách Khoa) có nhiều lịch trống hơn
    const bookChance = state.pitch.id === 1 ? 0.3 : 0.6;
    const status = value > bookChance ? 'available' : 'booked';
    return { id: slotId, time, status };
  });
}

function renderPitchSummary() {
  const p = state.pitch;
  elements.pitchSummaryImg.src = p.image;
  elements.pitchSummaryImg.alt = `Hình ảnh ${p.name}`;
  elements.pitchSummaryTitle.textContent = p.name;
  elements.pitchSummaryMeta.textContent = `${p.location} · ${p.typeLabel}`;
  elements.pitchSummaryPrice.textContent = formatPitchPrice(p.price);
  
  // Update screen title hint
  document.getElementById('pitch-summary-hint').textContent = `${p.name} · ${p.location}`;
}

function generateDates() {
  const today = startOfDay(new Date());
  state.dates = Array.from({ length: DAY_COUNT }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

function renderDateChips() {
  const fragment = document.createDocumentFragment();
  const selectedVal = toDateValue(state.selectedDate);

  state.dates.forEach(d => {
    const val = toDateValue(d);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `date-chip ${val === selectedVal ? 'is-selected' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(val === selectedVal));
    btn.addEventListener('click', () => {
      if (val !== selectedVal) {
        state.selectedDate = d;
        renderDateChips();
        loadSlotsWithSkeleton();
      }
    });

    const weekday = document.createElement('span');
    weekday.className = 'date-chip__weekday';
    weekday.textContent = WEEKDAY_LABELS[d.getDay()];

    const day = document.createElement('span');
    day.className = 'date-chip__day';
    day.textContent = String(d.getDate()).padStart(2, '0');

    btn.append(weekday, day);
    fragment.append(btn);
  });

  elements.dateChipRow.replaceChildren(fragment);
}

function showSkeletonSlots() {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 6; i++) {
    const div = document.createElement('div');
    div.className = 'skeleton-slot';
    fragment.append(div);
  }
  elements.slotGrid.replaceChildren(fragment);
  elements.slotEmptyState.hidden = true;
}

function loadSlotsWithSkeleton() {
  elements.slotGrid.setAttribute('aria-busy', 'true');
  showSkeletonSlots();
  window.setTimeout(() => {
    renderSlots();
    elements.slotGrid.setAttribute('aria-busy', 'false');
  }, 400);
}

function renderSlots() {
  const dateStr = toDateValue(state.selectedDate);
  const slots = generateSlots(dateStr);

  if (slots.length === 0) {
    elements.slotGrid.replaceChildren();
    elements.slotEmptyState.hidden = false;
    return;
  }
  elements.slotEmptyState.hidden = true;

  const fragment = document.createDocumentFragment();
  slots.forEach(slot => {
    const isSelected = slot.id === state.selectedSlot;
    const isAvailable = slot.status === 'available' || isSelected;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `slot-button ${isSelected ? 'is-selected' : ''} ${slot.status === 'booked' ? 'is-booked' : ''}`;
    btn.disabled = !isAvailable;
    btn.setAttribute('aria-pressed', String(isSelected));
    btn.addEventListener('click', () => {
      if (isSelected) releaseHold();
      else startHold(slot);
    });

    const time = document.createElement('span');
    time.className = 'slot-button__time';
    time.textContent = slot.time;

    const status = document.createElement('span');
    status.className = 'slot-button__status';
    if (isSelected) status.textContent = 'Đang chọn';
    else if (slot.status === 'available') status.textContent = 'Trống';
    else if (slot.status === 'booked') status.textContent = 'Đã đặt';
    else status.textContent = 'Đã qua';

    btn.append(time, status);
    fragment.append(btn);
  });

  elements.slotGrid.replaceChildren(fragment);
}

/** BR-26: Bắt đầu giữ chỗ */
function startHold(slot) {
  // BR-18: Phát hiện xung đột (chỉ làm mô phỏng 20% khả năng)
  if (Math.random() < 0.2) {
    elements.conflictBanner.hidden = false;
    elements.holdBanner.hidden = true;
    elements.holdExpiredBanner.hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => { elements.conflictBanner.hidden = true; }, 5000);
    return;
  }

  elements.conflictBanner.hidden = true;
  elements.holdExpiredBanner.hidden = true;

  // Xoá hold cũ nếu có
  if (state.draftId) {
    removeDraft(state.draftId);
  }

  const draft = createDraft(state.pitch.id, slot.id, state.pitch.price);
  state.selectedSlot = slot.id;
  state.holdExpiresAt = draft.holdExpiresAt;
  state.draftId = draft.id;
  
  startHoldTimer();
  renderSlots();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startHoldTimer() {
  elements.holdBannerSlot.textContent = `Ngày ${state.selectedDate instanceof Date ? toDateValue(state.selectedDate) : state.selectedDate} · Lúc ${state.selectedSlot.split('T')[1]}`;
  elements.holdBanner.hidden = false;
  elements.continueButton.disabled = false;
  elements.cancelButton.disabled = false;

  updateHoldTimerText();
  clearHoldTimer();
  state.holdTimerId = window.setInterval(updateHoldTimerText, 1000);
}

function updateHoldTimerText() {
  const ms = state.holdExpiresAt - Date.now();
  if (ms <= 0) {
    expireHold();
    return;
  }
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  elements.holdBannerTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function expireHold() {
  clearHoldTimer();
  if (state.draftId) removeDraft(state.draftId);
  state.selectedSlot = null;
  state.holdExpiresAt = null;
  state.draftId = null;

  elements.holdBanner.hidden = true;
  elements.holdExpiredBanner.hidden = false;
  elements.continueButton.disabled = true;
  renderSlots();
}

function releaseHold() {
  clearHoldTimer();
  if (state.draftId) removeDraft(state.draftId);
  state.selectedSlot = null;
  state.holdExpiresAt = null;
  state.draftId = null;

  elements.holdBanner.hidden = true;
  elements.continueButton.disabled = true;
  renderSlots();
}

function clearHoldTimer() {
  if (state.holdTimerId) {
    window.clearInterval(state.holdTimerId);
    state.holdTimerId = null;
  }
}

function handleContinue() {
  if (!state.selectedSlot || !state.holdExpiresAt || !state.draftId) return;
  const ms = state.holdExpiresAt - Date.now();
  if (ms <= 0) { expireHold(); return; }

  // Truyền id của bản nháp qua URL (bảo mật, không lo bị chỉnh sửa expiresAt)
  const params = new URLSearchParams({
    pitchId: String(state.pitch.id),
    bookingDraftId: state.draftId
  });
  location.href = `booking-confirmation.html?${params.toString()}`;
}

function handleCancel() {
  if (state.selectedSlot) releaseHold();
  else location.href = `pitch-detail.html?id=${state.pitch.id}`;
}

function init() {
  if (!isLoggedIn()) return requireLogin();

  const pitchId = new URLSearchParams(location.search).get('pitchId');
  const pitch = findPitch(pitchId);

  if (!pitch) {
    showPopup({
      type: 'error',
      title: 'Không tìm thấy sân bóng',
      message: 'Liên kết đặt sân không hợp lệ hoặc sân đã ngừng hoạt động.',
      actions: [{ text: 'Quay lại tìm sân', href: 'search.html', primary: true }]
    });
    return;
  }

  state.pitch = pitch;
  renderPitchSummary();
  generateDates();

  const existingDraft = getDraftForPitch(pitch.id);
  if (existingDraft) {
    state.selectedDate = new Date(existingDraft.slotId.split('T')[0]);
    state.selectedSlot = existingDraft.slotId;
    state.holdExpiresAt = existingDraft.holdExpiresAt;
    state.draftId = existingDraft.id;
    startHoldTimer();
  }

  renderDateChips();
  renderSlots();
}

elements.continueButton.addEventListener('click', handleContinue);
elements.cancelButton.addEventListener('click', handleCancel);

init();
