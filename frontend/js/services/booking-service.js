import { initializeState, loadState, updateState } from './storage-service.js';

export const HOLD_DURATION_MS = 10 * 60 * 1000;
export const BOOKING_STATUSES = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
});
export const PAYMENT_STATUSES = Object.freeze({
  PENDING: 'Pending',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
});

export const BOOKING_STATUS_META = Object.freeze({
  Pending: { label: 'Đang chờ', className: 'status-badge--pending' },
  Confirmed: { label: 'Đã xác nhận', className: 'status-badge--confirmed' },
  Completed: { label: 'Hoàn tất', className: 'status-badge--completed' },
  Cancelled: { label: 'Đã huỷ', className: 'status-badge--cancelled' },
});

export const PAYMENT_STATUS_LABELS = Object.freeze({
  Pending: 'Chờ thanh toán',
  Paid: 'Đã thanh toán',
  Refunded: 'Đã hoàn tiền',
  Cancelled: 'Đã huỷ',
});

function requireCustomer(user) {
  if (!user || user.role !== 'customer' || user.status !== 'active') {
    throw new Error('Tài khoản không được phép thực hiện thao tác đặt sân.');
  }
}

function normalizePitchId(pitchId) {
  const value = Number(pitchId);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function isActiveDraft(draft) {
  return draft.status === BOOKING_STATUSES.PENDING && Date.parse(draft.holdExpiresAt) > Date.now();
}

function expireDrafts() {
  const state = loadState();
  if (!state) return;
  const now = Date.now();
  const hasExpired = state.bookingDrafts.some(draft => (
    draft.status === BOOKING_STATUSES.PENDING && Date.parse(draft.holdExpiresAt) <= now
  ));
  if (!hasExpired) return;
  updateState(current => {
    current.bookingDrafts.forEach(draft => {
      if (draft.status === BOOKING_STATUSES.PENDING && Date.parse(draft.holdExpiresAt) <= now) {
        draft.status = BOOKING_STATUSES.CANCELLED;
        draft.cancelledAt = new Date(now).toISOString();
        draft.cancelReason = 'hold-expired';
      }
    });
  });
}

function slotEndFromStart(slotStart) {
  return new Date(Date.parse(slotStart) + 60 * 60 * 1000).toISOString();
}

function isWithinBookingWindow(slotStart) {
  const start = new Date(slotStart);
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 7);
  return Number.isFinite(start.getTime()) && start > now && start <= limit;
}

function slotIsOccupied(state, pitchId, slotStart, ignoredDraftId = null) {
  const held = state.bookingDrafts.some(draft => (
    draft.id !== ignoredDraftId
    && draft.pitchId === pitchId
    && draft.slotStart === slotStart
    && isActiveDraft(draft)
  ));
  const booked = state.bookings.some(booking => (
    booking.pitchId === pitchId
    && booking.slotStart === slotStart
    && [BOOKING_STATUSES.PENDING, BOOKING_STATUSES.CONFIRMED].includes(booking.status)
  ));
  return held || booked;
}

export async function prepareBookingData() {
  await initializeState();
  expireDrafts();
  return loadState();
}

export function getPitch(pitchId) {
  const id = normalizePitchId(pitchId);
  return loadState()?.pitches.find(pitch => pitch.id === id) ?? null;
}

export function listPitchSlots(pitchId, date, times, currentUserId) {
  const id = normalizePitchId(pitchId);
  if (!id) return [];
  expireDrafts();
  const state = loadState();
  if (!state) return [];
  return times.map(time => {
    const slotStart = `${date}T${time}:00+07:00`;
    const ownDraft = state.bookingDrafts.find(draft => (
      draft.customerId === currentUserId
      && draft.pitchId === id
      && draft.slotStart === slotStart
      && isActiveDraft(draft)
    ));
    let status = 'available';
    if (!isWithinBookingWindow(slotStart)) status = 'unavailable';
    else if (ownDraft) status = 'selected';
    else if (slotIsOccupied(state, id, slotStart)) status = 'booked';
    return { time, slotStart, status, draft: ownDraft ?? null };
  });
}

export function createBookingDraft(user, pitchId, slotStart, rescheduleBookingId = null) {
  requireCustomer(user);
  expireDrafts();
  const state = loadState();
  const id = normalizePitchId(pitchId);
  const pitch = state?.pitches.find(item => item.id === id);
  if (!pitch || pitch.status !== 'active' || !isWithinBookingWindow(slotStart)) return null;
  if (slotIsOccupied(state, id, slotStart)) return null;

  const now = new Date();
  const draft = {
    id: `BD-${now.getTime()}`,
    customerId: user.id,
    managerId: pitch.ownerId,
    pitchId: pitch.id,
    slotStart,
    slotEnd: slotEndFromStart(slotStart),
    amount: pitch.price,
    status: BOOKING_STATUSES.PENDING,
    paymentStatus: PAYMENT_STATUSES.PENDING,
    holdExpiresAt: new Date(now.getTime() + HOLD_DURATION_MS).toISOString(),
    createdAt: now.toISOString(),
    rescheduleBookingId,
    snapshot: {
      pitchName: pitch.name,
      pitchLocation: pitch.location,
      pitchTypeLabel: pitch.typeLabel,
      price: pitch.price,
      services: [...pitch.services],
    },
  };

  updateState(current => {
    current.bookingDrafts.forEach(item => {
      if (item.customerId === user.id && isActiveDraft(item)) {
        item.status = BOOKING_STATUSES.CANCELLED;
        item.cancelledAt = now.toISOString();
        item.cancelReason = 'replaced-by-new-hold';
      }
    });
    current.bookingDrafts.push(draft);
  });
  return draft;
}

export function getCustomerDraft(user, bookingDraftId) {
  requireCustomer(user);
  expireDrafts();
  return loadState()?.bookingDrafts.find(draft => (
    draft.id === bookingDraftId && draft.customerId === user.id
  )) ?? null;
}

export function getActiveCustomerDraftForPitch(user, pitchId) {
  requireCustomer(user);
  expireDrafts();
  const id = normalizePitchId(pitchId);
  return loadState()?.bookingDrafts.find(draft => (
    draft.customerId === user.id && draft.pitchId === id && isActiveDraft(draft)
  )) ?? null;
}

export function releaseBookingDraft(user, bookingDraftId) {
  requireCustomer(user);
  const draft = getCustomerDraft(user, bookingDraftId);
  if (!draft || !isActiveDraft(draft)) return false;
  updateState(current => {
    const target = current.bookingDrafts.find(item => item.id === bookingDraftId);
    target.status = BOOKING_STATUSES.CANCELLED;
    target.cancelledAt = new Date().toISOString();
    target.cancelReason = 'customer-released';
  });
  return true;
}

export function revalidateBookingDraft(user, bookingDraftId) {
  const draft = getCustomerDraft(user, bookingDraftId);
  if (!draft || !isActiveDraft(draft)) return { valid: false, reason: 'expired' };
  const pitch = getPitch(draft.pitchId);
  if (!pitch || pitch.status !== 'active') return { valid: false, reason: 'pitch-unavailable' };
  const state = loadState();
  if (slotIsOccupied(state, draft.pitchId, draft.slotStart, draft.id)) {
    return { valid: false, reason: 'slot-unavailable' };
  }
  const termsChanged = pitch.price !== draft.amount
    || JSON.stringify(pitch.services) !== JSON.stringify(draft.snapshot.services);
  return { valid: true, draft, pitch, termsChanged };
}

export function listCustomerBookings(user) {
  requireCustomer(user);
  return (loadState()?.bookings ?? []).filter(booking => booking.customerId === user.id);
}

export function getCustomerBooking(user, bookingId) {
  requireCustomer(user);
  return listCustomerBookings(user).find(booking => booking.id === bookingId) ?? null;
}

export function listManagerPitches(user) {
  if (!user || user.role !== 'manager' || user.status !== 'active') return [];
  return (loadState()?.pitches ?? []).filter(pitch => pitch.ownerId === user.id);
}

export function listManagerBookings(user, pitchId) {
  const pitch = listManagerPitches(user).find(item => item.id === normalizePitchId(pitchId));
  if (!pitch) return [];
  const state = loadState();
  return state.bookings
    .filter(booking => booking.pitchId === pitch.id && booking.managerId === user.id)
    .map(booking => ({
      ...booking,
      customer: state.users.find(account => account.id === booking.customerId) ?? null,
    }));
}

export function getManagerBooking(user, pitchId, bookingId) {
  return listManagerBookings(user, pitchId).find(booking => booking.id === bookingId) ?? null;
}

export function canCustomerCancel(user, booking) {
  if (!booking || booking.customerId !== user.id) return false;
  if (![BOOKING_STATUSES.PENDING, BOOKING_STATUSES.CONFIRMED].includes(booking.status)) return false;
  return Date.parse(booking.slotStart) - Date.now() >= 2 * 60 * 60 * 1000;
}

export function canCustomerReschedule(user, booking) {
  return canCustomerCancel(user, booking)
    && booking.status === BOOKING_STATUSES.CONFIRMED
    && Number(booking.rescheduleCount ?? 0) < 1;
}
