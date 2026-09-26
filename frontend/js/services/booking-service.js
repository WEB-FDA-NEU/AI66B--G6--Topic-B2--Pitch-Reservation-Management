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

function requireCustomerAccount(user) {
  if (!user || user.role !== 'customer') {
    throw new Error('Tài khoản không được phép xem dữ liệu đặt sân.');
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

function completeElapsedBookings() {
  const state = loadState();
  if (!state) return;
  const now = Date.now();
  const hasCompleted = state.bookings.some(booking => (
    booking.status === BOOKING_STATUSES.CONFIRMED && Date.parse(booking.slotEnd) <= now
  ));
  if (!hasCompleted) return;
  updateState(current => {
    current.bookings.forEach(booking => {
      if (booking.status === BOOKING_STATUSES.CONFIRMED && Date.parse(booking.slotEnd) <= now) {
        booking.status = BOOKING_STATUSES.COMPLETED;
        booking.completedAt = booking.slotEnd;
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

export function isPitchSlotOperational(pitch, slotStart) {
  if (!pitch || pitch.status !== 'active') return false;
  const override = loadState()?.availability?.find(item => item.pitchId === pitch.id && item.slotStart === slotStart);
  if (override?.status === 'unavailable') return false;
  if (override?.status === 'available') return true;
  const start = new Date(slotStart);
  if (!Number.isFinite(start.getTime())) return false;
  if (Array.isArray(pitch.openWeekdays) && !pitch.openWeekdays.includes(start.getDay())) return false;
  const time = String(slotStart).slice(11, 16);
  return !pitch.operatingHours
    || (time >= pitch.operatingHours.open && time < pitch.operatingHours.close);
}

function getSlotPrice(pitch, slotStart) {
  const override = loadState()?.availability?.find(item => item.pitchId === pitch.id && item.slotStart === slotStart);
  return Number(override?.price) > 0 ? Number(override.price) : pitch.price;
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
  completeElapsedBookings();
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
    const pitch = state.pitches.find(item => item.id === id);
    if (!isWithinBookingWindow(slotStart) || !isPitchSlotOperational(pitch, slotStart)) status = 'unavailable';
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
  if (!pitch || !isPitchSlotOperational(pitch, slotStart) || !isWithinBookingWindow(slotStart)) return null;
  if (slotIsOccupied(state, id, slotStart)) return null;

  const now = new Date();
  const draft = {
    id: `BD-${now.getTime()}`,
    customerId: user.id,
    managerId: pitch.ownerId,
    pitchId: pitch.id,
    slotStart,
    slotEnd: slotEndFromStart(slotStart),
    amount: getSlotPrice(pitch, slotStart),
    status: BOOKING_STATUSES.PENDING,
    paymentStatus: PAYMENT_STATUSES.PENDING,
    holdExpiresAt: new Date(now.getTime() + HOLD_DURATION_MS).toISOString(),
    createdAt: now.toISOString(),
    rescheduleBookingId,
    snapshot: {
      pitchName: pitch.name,
      pitchLocation: pitch.location,
      pitchTypeLabel: pitch.typeLabel,
      price: getSlotPrice(pitch, slotStart),
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
  if (!pitch || !isPitchSlotOperational(pitch, draft.slotStart)) return { valid: false, reason: 'pitch-unavailable' };
  const state = loadState();
  if (slotIsOccupied(state, draft.pitchId, draft.slotStart, draft.id)) {
    return { valid: false, reason: 'slot-unavailable' };
  }
  const currentAmount = getSlotPrice(pitch, draft.slotStart);
  const termsChanged = currentAmount !== draft.amount
    || JSON.stringify(pitch.services) !== JSON.stringify(draft.snapshot.services);
  return { valid: true, draft, pitch, currentAmount, termsChanged };
}

export function acceptBookingDraftTerms(user, bookingDraftId) {
  const validation = revalidateBookingDraft(user, bookingDraftId);
  if (!validation.valid) return null;
  const { pitch } = validation;
  updateState(state => {
    const draft = state.bookingDrafts.find(item => item.id === bookingDraftId && item.customerId === user.id);
    draft.amount = getSlotPrice(pitch, draft.slotStart);
    draft.snapshot.price = draft.amount;
    draft.snapshot.services = [...pitch.services];
    draft.termsAcceptedAt = new Date().toISOString();
  });
  return getCustomerDraft(user, bookingDraftId);
}

export function listCustomerBookings(user) {
  requireCustomerAccount(user);
  completeElapsedBookings();
  return (loadState()?.bookings ?? []).filter(booking => booking.customerId === user.id);
}

export function getCustomerBooking(user, bookingId) {
  requireCustomerAccount(user);
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
  if (!user || user.role !== 'customer' || !booking || booking.customerId !== user.id) return false;
  if (![BOOKING_STATUSES.PENDING, BOOKING_STATUSES.CONFIRMED].includes(booking.status)) return false;
  return Date.parse(booking.slotStart) - Date.now() >= 2 * 60 * 60 * 1000;
}

export function canCustomerReschedule(user, booking) {
  return user?.status === 'active'
    && canCustomerCancel(user, booking)
    && booking.status === BOOKING_STATUSES.CONFIRMED
    && Number(booking.rescheduleCount ?? 0) < 1;
}
