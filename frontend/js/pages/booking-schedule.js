import '../components/site-header.js';
import '../components/site-footer.js';
import { initializeState } from '../services/storage-service.js';
import { requireRole, ROLES } from '../services/access-control.js';
import {
  canCustomerReschedule,
  createBookingDraft,
  getActiveCustomerDraftForPitch,
  getCustomerBooking,
  getPitch,
  listPitchSlots,
  releaseBookingDraft,
} from '../services/booking-service.js';
import { formatVND } from '../render.js';

const SLOT_TIMES = ['06:00', '08:00', '10:00', '14:00', '16:00', '18:00', '20:00'];
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const elements = {
  content: document.getElementById('booking-content'),
  pageState: document.getElementById('page-state'),
  pageStateTitle: document.getElementById('page-state-title'),
  pageStateMessage: document.getElementById('page-state-message'),
  pitchHint: document.getElementById('pitch-summary-hint'),
  pitchImage: document.getElementById('pitch-summary-img'),
  pitchTitle: document.getElementById('pitch-summary-title'),
  pitchMeta: document.getElementById('pitch-summary-meta'),
  pitchPrice: document.getElementById('pitch-summary-price'),
  dateRow: document.getElementById('date-chip-row'),
  slotGrid: document.getElementById('slot-grid'),
  slotEmpty: document.getElementById('slot-empty-state'),
  holdBanner: document.getElementById('hold-banner'),
  holdSlot: document.getElementById('hold-banner-slot'),
  holdTimer: document.getElementById('hold-banner-timer'),
  notice: document.getElementById('schedule-notice'),
  noticeTitle: document.getElementById('schedule-notice-title'),
  noticeMessage: document.getElementById('schedule-notice-message'),
  cancelButton: document.getElementById('cancel-button'),
  continueButton: document.getElementById('continue-button'),
  dateTemplate: document.getElementById('tpl-date-chip'),
  slotTemplate: document.getElementById('tpl-slot-button'),
};

const state = {
  user: null,
  pitch: null,
  dates: [],
  selectedDate: '',
  draft: null,
  timerId: null,
  rescheduleBookingId: null,
};

function dateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSlot(slotStart) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(slotStart));
}

function showPageState(title, message) {
  elements.content.hidden = true;
  elements.pageStateTitle.textContent = title;
  elements.pageStateMessage.textContent = message;
  elements.pageState.hidden = false;
}

function showNotice(title, message) {
  elements.noticeTitle.textContent = title;
  elements.noticeMessage.textContent = message;
  elements.notice.hidden = false;
}

function hideNotice() {
  elements.notice.hidden = true;
}

function renderPitch() {
  const pitch = state.pitch;
  elements.pitchHint.textContent = `${pitch.name} · ${pitch.location}`;
  elements.pitchImage.src = pitch.image;
  elements.pitchImage.alt = `Hình ảnh ${pitch.name}`;
  elements.pitchTitle.textContent = pitch.name;
  elements.pitchMeta.textContent = `${pitch.location} · ${pitch.typeLabel}`;
  elements.pitchPrice.textContent = `${formatVND(pitch.price)} / giờ`;
}

function renderDates() {
  const nodes = state.dates.map(date => {
    const node = elements.dateTemplate.content.cloneNode(true);
    const button = node.querySelector('button');
    const value = dateValue(date);
    const selected = value === state.selectedDate;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-selected', String(selected));
    button.querySelector('.booking-schedule-page__weekday').textContent = WEEKDAYS[date.getDay()];
    button.querySelector('.booking-schedule-page__day').textContent = new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
    button.addEventListener('click', () => {
      state.selectedDate = value;
      renderDates();
      renderSlots();
    });
    return node;
  });
  elements.dateRow.replaceChildren(...nodes);
}

function statusLabel(status) {
  return {
    available: 'Còn trống',
    selected: 'Đang giữ',
    booked: 'Đã có người đặt',
    unavailable: 'Không khả dụng',
  }[status];
}

function renderSlots() {
  const slots = listPitchSlots(state.pitch.id, state.selectedDate, SLOT_TIMES, state.user.id);
  const nodes = slots.map(slot => {
    const node = elements.slotTemplate.content.cloneNode(true);
    const button = node.querySelector('button');
    button.classList.toggle('is-selected', slot.status === 'selected');
    button.disabled = !['available', 'selected'].includes(slot.status);
    button.setAttribute('aria-pressed', String(slot.status === 'selected'));
    button.querySelector('.booking-schedule-page__slot-time').textContent = slot.time;
    button.querySelector('.booking-schedule-page__slot-status').textContent = statusLabel(slot.status);
    button.addEventListener('click', () => selectSlot(slot));
    return node;
  });
  elements.slotGrid.replaceChildren(...nodes);
  elements.slotEmpty.hidden = nodes.length > 0;
}

function selectSlot(slot) {
  hideNotice();
  if (slot.status === 'selected' && slot.draft) {
    releaseBookingDraft(state.user, slot.draft.id);
    state.draft = null;
    stopTimer();
    renderHold();
    renderSlots();
    return;
  }

  const draft = createBookingDraft(
    state.user,
    state.pitch.id,
    slot.slotStart,
    state.rescheduleBookingId,
  );
  if (!draft) {
    showNotice('Khung giờ không còn khả dụng', 'Dữ liệu đã được kiểm tra lại. Hãy chọn một khung giờ khác.');
    renderSlots();
    return;
  }
  state.draft = draft;
  renderHold();
  renderSlots();
  startTimer();
}

function renderHold() {
  const active = Boolean(state.draft);
  elements.holdBanner.hidden = !active;
  elements.cancelButton.disabled = !active;
  elements.continueButton.disabled = !active;
  if (active) elements.holdSlot.textContent = formatSlot(state.draft.slotStart);
}

function stopTimer() {
  if (state.timerId) window.clearInterval(state.timerId);
  state.timerId = null;
}

function updateTimer() {
  if (!state.draft) return;
  const remaining = Date.parse(state.draft.holdExpiresAt) - Date.now();
  if (remaining <= 0) {
    stopTimer();
    state.draft = null;
    renderHold();
    renderSlots();
    showNotice('Thời gian giữ chỗ đã hết', 'Khung giờ đã được mở lại để người khác có thể đặt.');
    return;
  }
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  elements.holdTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startTimer() {
  stopTimer();
  updateTimer();
  state.timerId = window.setInterval(updateTimer, 1000);
}

function resolveInput(user) {
  const params = new URLSearchParams(location.search);
  const rescheduleBookingId = params.get('rescheduleBookingId');
  if (rescheduleBookingId) {
    const booking = getCustomerBooking(user, rescheduleBookingId);
    if (!canCustomerReschedule(user, booking)) return null;
    state.rescheduleBookingId = booking.id;
    return booking.pitchId;
  }
  return params.get('pitchId');
}

async function init() {
  await initializeState();
  const user = requireRole([ROLES.CUSTOMER]);
  if (!user) return;
  state.user = user;

  const pitchId = resolveInput(user);
  const pitch = getPitch(pitchId);
  if (!pitch || pitch.status !== 'active') {
    showPageState('Không thể mở lịch đặt sân', 'Sân không tồn tại, không hoạt động hoặc yêu cầu đổi lịch không hợp lệ.');
    return;
  }

  state.pitch = pitch;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  state.dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
  state.selectedDate = dateValue(state.dates[0]);
  state.draft = getActiveCustomerDraftForPitch(user, pitch.id);
  if (state.draft) state.selectedDate = state.draft.slotStart.slice(0, 10);

  renderPitch();
  renderDates();
  renderSlots();
  renderHold();
  if (state.draft) startTimer();
  elements.content.hidden = false;

  elements.cancelButton.addEventListener('click', () => {
    if (!state.draft) return;
    releaseBookingDraft(state.user, state.draft.id);
    state.draft = null;
    stopTimer();
    renderHold();
    renderSlots();
  });
  elements.continueButton.addEventListener('click', () => {
    if (!state.draft) return;
    const params = new URLSearchParams({ bookingDraftId: state.draft.id });
    location.href = `booking-confirmation.html?${params.toString()}`;
  });
}

init();
