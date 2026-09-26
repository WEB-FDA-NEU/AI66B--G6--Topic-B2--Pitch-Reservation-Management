import { initializeState, loadState, updateState } from './storage-service.js';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function nextReviewId(reviews) {
  const largest = reviews.reduce((result, review) => {
    const match = String(review.id).match(/^RV-(\d+)$/);
    return match ? Math.max(result, Number(match[1])) : result;
  }, 0);
  return `RV-${String(largest + 1).padStart(4, '0')}`;
}

function updatePitchRating(state, pitchId) {
  const pitchReviews = state.reviews.filter(review => review.pitchId === pitchId && review.status === 'published');
  const pitch = state.pitches.find(item => item.id === pitchId);
  if (!pitch) return;
  const baseCount = Number(pitch.reviewCountBase ?? pitch.reviewCount ?? 0);
  const baseRating = Number(pitch.ratingBase ?? pitch.rating ?? 0);
  const totalCount = baseCount + pitchReviews.length;
  pitch.reviewCount = totalCount;
  pitch.rating = totalCount
    ? Number(((baseRating * baseCount + pitchReviews.reduce((sum, review) => sum + review.rating, 0)) / totalCount).toFixed(1))
    : 0;
}

export async function prepareReviews() {
  await initializeState();
  updateState(state => {
    state.pitches.forEach(pitch => updatePitchRating(state, pitch.id));
  });
  return loadState();
}

export function listPitchReviews(pitchId) {
  const id = Number(pitchId);
  const state = loadState();
  if (!state || !Number.isInteger(id)) return [];
  return state.reviews
    .filter(review => review.pitchId === id && review.status === 'published')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(review => ({
      ...clone(review),
      customerName: state.users.find(user => user.id === review.customerId)?.displayName ?? 'Khách hàng Pitch Point',
    }));
}

export function getReviewEligibility(user, bookingId) {
  const state = loadState();
  if (!state || !user || user.role !== 'customer' || user.status !== 'active') return { eligible: false, reason: 'unauthorized' };
  const booking = state.bookings.find(item => item.id === bookingId && item.customerId === user.id);
  if (!booking) return { eligible: false, reason: 'not-found' };
  if (booking.status !== 'Completed') return { eligible: false, reason: 'not-completed', booking: clone(booking) };
  const existing = state.reviews.find(review => review.bookingId === booking.id);
  if (existing || booking.reviewId) return { eligible: false, reason: 'already-reviewed', booking: clone(booking), review: clone(existing) };
  return { eligible: true, booking: clone(booking) };
}

export function createReview(user, bookingId, input) {
  const eligibility = getReviewEligibility(user, bookingId);
  if (!eligibility.eligible) throw new Error('Lượt đặt sân này không đủ điều kiện đánh giá.');
  const rating = Number(input.rating);
  const comment = String(input.comment ?? '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Vui lòng chọn số sao từ 1 đến 5.');
  if (comment.length < 10 || comment.length > 500) throw new Error('Nội dung đánh giá cần từ 10 đến 500 ký tự.');

  let created;
  updateState(state => {
    const booking = state.bookings.find(item => item.id === bookingId && item.customerId === user.id);
    if (!booking || booking.status !== 'Completed' || booking.reviewId || state.reviews.some(review => review.bookingId === bookingId)) {
      throw new Error('Lượt đặt sân này không còn đủ điều kiện đánh giá.');
    }
    created = {
      id: nextReviewId(state.reviews),
      bookingId: booking.id,
      pitchId: booking.pitchId,
      customerId: user.id,
      rating,
      comment,
      status: 'published',
      createdAt: new Date().toISOString(),
    };
    state.reviews.push(created);
    booking.reviewId = created.id;
    updatePitchRating(state, booking.pitchId);
  });
  return clone(created);
}
