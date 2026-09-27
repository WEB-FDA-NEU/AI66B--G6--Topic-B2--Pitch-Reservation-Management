import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import {
  BOOKING_STATUS_META,
  PAYMENT_STATUS_LABELS,
  canCustomerCancel,
  canCustomerReschedule,
  getCustomerBooking,
  prepareBookingData,
} from '../services/booking-service.js';
import { formatVND } from '../render.js';
import { cancelCustomerBooking } from '../services/finance-service.js';
import { createReview, getReviewEligibility, prepareReviews } from '../services/review-service.js';

const elements = {
  content: document.getElementById('details-content'),
  reference: document.getElementById('booking-reference'),
  bookingStatus: document.getElementById('booking-status'),
  pitchImage: document.getElementById('pitch-image'),
  pitchName: document.getElementById('pitch-name'),
  pitchLocation: document.getElementById('pitch-location'),
  date: document.getElementById('booking-date'),
  time: document.getElementById('booking-time'),
  amount: document.getElementById('booking-amount'),
  paymentStatus: document.getElementById('payment-status'),
  services: document.getElementById('booking-services'),
  history: document.getElementById('status-history'),
  cancelButton: document.getElementById('cancel-button'),
  rescheduleButton: document.getElementById('reschedule-button'),
  reviewButton: document.getElementById('review-button'),
  reviewStatus: document.getElementById('review-status'),
  userReviewPanel: document.getElementById('user-review-panel'),
  userReviewRating: document.getElementById('user-review-rating'),
  userReviewComment: document.getElementById('user-review-comment'),
  userReviewDate: document.getElementById('user-review-date'),
  actionFeedback: document.getElementById('action-feedback'),
  cancelDialog: document.getElementById('cancel-dialog'),
  cancelForm: document.getElementById('cancel-form'),
  cancelFeedback: document.getElementById('cancel-feedback'),
  reviewDialog: document.getElementById('review-dialog'),
  reviewForm: document.getElementById('review-form'),
  reviewFeedback: document.getElementById('review-feedback'),
  reviewComment: document.getElementById('review-comment'),
  ratingCaption: document.getElementById('rating-caption'),
  charCounter: document.getElementById('char-counter'),
};

const RATING_CAPTIONS = Object.freeze({
  1: '1 sao · Rất thất vọng',
  2: '2 sao · Chưa tốt',
  3: '3 sao · Bình thường',
  4: '4 sao · Hài lòng',
  5: '5 sao · Rất hài lòng',
});

let currentUser;
let currentBooking;

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function createHistoryEntry(label, value) {
  const item = document.createElement('li');
  const text = document.createElement('span');
  const time = document.createElement('time');
  text.textContent = label;
  time.dateTime = value;
  time.textContent = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
  item.append(text, time);
  return item;
}

function renderHistory(booking) {
  const entries = [createHistoryEntry('Đã tạo lượt đặt sân', booking.createdAt)];
  if (booking.confirmedAt) entries.push(createHistoryEntry('Đặt sân đã được xác nhận', booking.confirmedAt));
  if (booking.completedAt) entries.push(createHistoryEntry('Buổi chơi đã hoàn tất', booking.completedAt));
  if (booking.cancelledAt) entries.push(createHistoryEntry('Lượt đặt sân đã bị huỷ', booking.cancelledAt));
  elements.history.replaceChildren(...entries);
}

function renderActions(user, booking) {
  elements.cancelButton.hidden = !canCustomerCancel(user, booking);
  elements.rescheduleButton.hidden = !canCustomerReschedule(user, booking);
  renderReviewState(user, booking);
}

function renderSubmittedReview(review) {
  elements.userReviewPanel.hidden = !review;
  if (!review) return;
  elements.userReviewRating.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`;
  elements.userReviewRating.setAttribute('aria-label', `${review.rating} trên 5 sao`);
  elements.userReviewComment.textContent = review.comment;
  elements.userReviewDate.dateTime = review.createdAt;
  elements.userReviewDate.textContent = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(review.createdAt));
}

function renderReviewState(user, booking) {
  const eligibility = getReviewEligibility(user, booking.id);
  elements.reviewButton.hidden = !eligibility.eligible;
  renderSubmittedReview(eligibility.review ?? null);
  if (eligibility.eligible) {
    elements.reviewStatus.textContent = 'Buổi chơi đã hoàn tất. Bạn có thể chia sẻ một đánh giá đã xác minh cho sân này.';
  } else if (eligibility.reason === 'already-reviewed') {
    elements.reviewStatus.textContent = 'Bạn đã hoàn thành đánh giá cho lượt đặt sân này.';
  } else if (eligibility.reason === 'not-completed') {
    elements.reviewStatus.textContent = booking.status === 'Cancelled'
      ? 'Lượt đặt đã huỷ không đủ điều kiện đánh giá.'
      : 'Đánh giá sẽ khả dụng sau khi buổi chơi được xác nhận hoàn tất.';
  } else if (user.status !== 'active') {
    elements.reviewStatus.textContent = 'Tài khoản hiện không đủ điều kiện gửi đánh giá mới.';
  } else {
    elements.reviewStatus.textContent = '';
  }
}

function renderBooking(user, booking) {
  const statusMeta = BOOKING_STATUS_META[booking.status];
  elements.reference.textContent = booking.id;
  elements.bookingStatus.textContent = statusMeta.label;
  elements.bookingStatus.classList.add(statusMeta.className);
  elements.pitchImage.alt = `Hình ảnh ${booking.snapshot.pitchName}`;
  elements.pitchName.textContent = booking.snapshot.pitchName;
  elements.pitchLocation.textContent = booking.snapshot.pitchLocation;
  elements.date.textContent = formatDate(booking.slotStart);
  elements.time.textContent = `${formatTime(booking.slotStart)}–${formatTime(booking.slotEnd)}`;
  elements.amount.textContent = formatVND(booking.amount);
  elements.paymentStatus.textContent = PAYMENT_STATUS_LABELS[booking.paymentStatus];
  elements.services.replaceChildren(...booking.snapshot.services.map(service => {
    const item = document.createElement('li');
    item.textContent = service;
    return item;
  }));
  renderHistory(booking);
  renderActions(user, booking);
  elements.content.hidden = false;
}

async function init() {
  await Promise.all([prepareBookingData(), prepareReviews()]);
  currentUser = requireRole([ROLES.CUSTOMER], { allowSuspended: true });
  if (!currentUser) return;
  const bookingId = new URLSearchParams(location.search).get('bookingId');
  currentBooking = getCustomerBooking(currentUser, bookingId);
  if (!currentBooking) {
    location.replace('404.html');
    return;
  }
  renderBooking(currentUser, currentBooking);
  if (location.hash === '#review' && getReviewEligibility(currentUser, currentBooking.id).eligible) {
    openReviewDialog();
  }
}

elements.cancelButton.addEventListener('click', () => {
  elements.cancelFeedback.textContent = '';
  elements.cancelDialog.showModal();
});

elements.rescheduleButton.addEventListener('click', () => {
  if (!currentBooking) return;
  const params = new URLSearchParams({
    pitchId: String(currentBooking.pitchId),
    rescheduleBookingId: currentBooking.id,
  });
  location.assign(`booking-schedule.html?${params}`);
});

function openReviewDialog() {
  elements.reviewForm.reset();
  elements.reviewFeedback.textContent = '';
  elements.ratingCaption.textContent = 'Vui lòng chọn số sao';
  elements.charCounter.textContent = '0/500';
  elements.reviewDialog.showModal();
}

elements.reviewButton.addEventListener('click', openReviewDialog);

elements.cancelForm.addEventListener('submit', async event => {
  event.preventDefault();
  const reason = new FormData(elements.cancelForm).get('reason');
  const result = await cancelCustomerBooking(currentUser, currentBooking.id, reason);
  if (!result.ok) {
    elements.cancelFeedback.textContent = 'Không thể huỷ lượt đặt sân ở trạng thái hiện tại.';
    return;
  }
  currentBooking = result.booking;
  elements.cancelDialog.close();
  elements.actionFeedback.textContent = 'Đã huỷ đặt sân và hoàn lại số dư mô phỏng.';
  renderBooking(currentUser, currentBooking);
});

elements.reviewForm.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const review = createReview(currentUser, currentBooking.id, Object.fromEntries(new FormData(elements.reviewForm)));
    currentBooking.reviewId = review.id;
    elements.reviewDialog.close();
    elements.actionFeedback.textContent = 'Đánh giá của bạn đã được ghi nhận.';
    renderActions(currentUser, currentBooking);
  } catch (error) {
    elements.reviewFeedback.textContent = error.message;
  }
});

elements.reviewForm.querySelectorAll('input[name="rating"]').forEach(input => {
  input.addEventListener('change', () => {
    elements.ratingCaption.textContent = RATING_CAPTIONS[input.value];
  });
});

elements.reviewComment.addEventListener('input', () => {
  elements.charCounter.textContent = `${elements.reviewComment.value.length}/500`;
});

document.querySelectorAll('[data-close-dialog]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog)?.close());
});

init();
