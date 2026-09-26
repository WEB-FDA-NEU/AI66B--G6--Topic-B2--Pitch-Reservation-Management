import '../components/site-header.js';
import '../components/site-footer.js';
import { initializeState } from '../services/storage-service.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { revalidateBookingDraft } from '../services/booking-service.js';
import { formatVND } from '../render.js';

const elements = {
  content: document.getElementById('confirmation-content'),
  pageState: document.getElementById('page-state'),
  pageStateTitle: document.getElementById('page-state-title'),
  pageStateMessage: document.getElementById('page-state-message'),
  timer: document.getElementById('hold-banner-timer'),
  pitchName: document.getElementById('summary-pitch-name'),
  pitchLocation: document.getElementById('summary-pitch-location'),
  pitchType: document.getElementById('summary-pitch-type'),
  date: document.getElementById('summary-date'),
  time: document.getElementById('summary-time'),
  customerName: document.getElementById('summary-customer-name'),
  customerPhone: document.getElementById('summary-customer-phone'),
  total: document.getElementById('price-total'),
  services: document.getElementById('included-services'),
  backLink: document.getElementById('back-link'),
  proceedButton: document.getElementById('proceed-button'),
};

let draft = null;
let timerId = null;

function showState(title, message) {
  if (timerId) window.clearInterval(timerId);
  elements.content.hidden = true;
  elements.pageStateTitle.textContent = title;
  elements.pageStateMessage.textContent = message;
  elements.pageState.hidden = false;
}

function renderDateTime(slotStart) {
  const start = new Date(slotStart);
  elements.date.textContent = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(start);
  elements.time.textContent = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(start);
}

function updateTimer() {
  const remaining = Date.parse(draft.holdExpiresAt) - Date.now();
  if (remaining <= 0) {
    showState('Thời gian giữ chỗ đã hết', 'Khung giờ đã được giải phóng. Hãy chọn lại lịch đặt sân.');
    return;
  }
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  elements.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function init() {
  await initializeState();
  const user = requireRole([ROLES.CUSTOMER]);
  if (!user) return;

  const bookingDraftId = new URLSearchParams(location.search).get('bookingDraftId');
  const result = revalidateBookingDraft(user, bookingDraftId);
  if (!result.valid) {
    showState('Không thể xác nhận đặt sân', 'Phiên giữ chỗ không tồn tại, đã hết hạn hoặc không thuộc tài khoản hiện tại.');
    return;
  }

  draft = result.draft;
  elements.pitchName.textContent = draft.snapshot.pitchName;
  elements.pitchLocation.textContent = draft.snapshot.pitchLocation;
  elements.pitchType.textContent = draft.snapshot.pitchTypeLabel;
  elements.customerName.textContent = user.displayName;
  elements.customerPhone.textContent = user.phone || '—';
  elements.total.textContent = formatVND(draft.amount);
  renderDateTime(draft.slotStart);
  elements.services.replaceChildren(...draft.snapshot.services.map(service => {
    const item = document.createElement('li');
    item.textContent = service;
    return item;
  }));
  elements.backLink.href = `booking-schedule.html?${new URLSearchParams({ pitchId: String(draft.pitchId) })}`;
  elements.content.hidden = false;
  updateTimer();
  timerId = window.setInterval(updateTimer, 1000);
}

init();
