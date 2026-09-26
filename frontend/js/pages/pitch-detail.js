import '../components/site-header.js';
import '../components/site-footer.js';
import {
  formatPitchPrice,
  getPitchById,
  preparePitchCatalog,
} from '../services/pitch-service.js';

const STATUS_META = Object.freeze({
  active: { label: 'Đang hoạt động', message: 'Lịch trống sẽ được kiểm tra tại bước chọn lịch.' },
  deactivated: { label: 'Tạm ngừng nhận lịch', message: 'Sân hiện không tiếp nhận yêu cầu đặt sân mới.' },
  suspended: { label: 'Không khả dụng', message: 'Sân hiện không thể nhận yêu cầu đặt sân.' },
});

const elements = {
  content: document.getElementById('pitch-content'),
  state: document.getElementById('pitch-state'),
  stateTitle: document.getElementById('pitch-state-title'),
  stateMessage: document.getElementById('pitch-state-message'),
  title: document.getElementById('pitch-title'),
  status: document.getElementById('pitch-status'),
  location: document.getElementById('pitch-location'),
  rating: document.getElementById('pitch-rating'),
  image: document.getElementById('pitch-image'),
  description: document.getElementById('pitch-description'),
  type: document.getElementById('pitch-type'),
  surface: document.getElementById('pitch-surface'),
  hours: document.getElementById('pitch-hours'),
  district: document.getElementById('pitch-district'),
  facilities: document.getElementById('pitch-facilities'),
  facilityTemplate: document.getElementById('tpl-facility'),
  ownerTitle: document.getElementById('owner-title'),
  ownerButton: document.getElementById('view-owner-button'),
  messageButton: document.getElementById('message-manager-button'),
  reviewSummary: document.getElementById('review-summary'),
  price: document.getElementById('pitch-price'),
  bookingAvailability: document.getElementById('booking-availability'),
  bookingButton: document.getElementById('booking-button'),
};

function showState(title, message) {
  elements.content.hidden = true;
  elements.stateTitle.textContent = title;
  elements.stateMessage.textContent = message;
  elements.state.hidden = false;
}

function renderFacilities(services) {
  const nodes = services.map(service => {
    const node = elements.facilityTemplate.content.cloneNode(true);
    node.querySelector('.pitch-detail-page__facility-name').textContent = service;
    return node;
  });
  elements.facilities.replaceChildren(...nodes);
}

function renderPitch(pitch) {
  const status = STATUS_META[pitch.status] ?? STATUS_META.suspended;
  document.title = `${pitch.name} — Pitch Point`;
  elements.title.textContent = pitch.name;
  elements.status.textContent = status.label;
  elements.status.dataset.status = pitch.status;
  elements.location.textContent = pitch.location;
  elements.rating.textContent = `★ ${pitch.rating.toFixed(1)} · ${pitch.reviewCount} lượt đánh giá`;
  elements.image.src = pitch.image;
  elements.image.alt = `Hình ảnh ${pitch.name}`;
  elements.description.textContent = pitch.description;
  elements.type.textContent = pitch.typeLabel;
  elements.surface.textContent = pitch.surface;
  elements.hours.textContent = pitch.operatingHours.label;
  elements.district.textContent = pitch.district;
  elements.ownerTitle.textContent = pitch.ownerName;
  elements.ownerButton.dataset.ownerId = pitch.ownerProfileId;
  elements.messageButton.dataset.managerId = pitch.managerId;
  elements.reviewSummary.textContent = `${pitch.rating.toFixed(1)} / 5`;
  elements.price.textContent = formatPitchPrice(pitch.price);
  elements.bookingAvailability.textContent = status.message;
  elements.bookingButton.dataset.pitchId = String(pitch.id);
  if (pitch.status === 'active') {
    elements.bookingButton.href = `booking-schedule.html?pitchId=${encodeURIComponent(pitch.id)}`;
    elements.bookingButton.removeAttribute('aria-disabled');
  } else {
    elements.bookingButton.removeAttribute('href');
    elements.bookingButton.setAttribute('aria-disabled', 'true');
  }
  renderFacilities(pitch.services);
  elements.state.hidden = true;
  elements.content.hidden = false;
}

async function init() {
  const pitchId = new URLSearchParams(location.search).get('pitchId');
  if (!pitchId) {
    showState('Thiếu thông tin sân', 'Hãy chọn một sân từ danh sách tìm kiếm để xem chi tiết.');
    return;
  }

  try {
    await preparePitchCatalog();
    const pitch = getPitchById(pitchId);
    if (!pitch) {
      showState('Không tìm thấy sân', 'Mã sân không hợp lệ hoặc sân không còn tồn tại trong dữ liệu hiện tại.');
      return;
    }
    renderPitch(pitch);
  } catch {
    showState('Không thể tải thông tin sân', 'Dữ liệu sân hiện không khả dụng. Hãy thử tải lại trang.');
  }
}

init();
