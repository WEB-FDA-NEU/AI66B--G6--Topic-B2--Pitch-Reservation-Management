import { initializeState, loadState, updateState } from './storage-service.js';
import { recordActivity } from './content-audit-service.js';

const DEFAULT_CUSTOMER_BALANCE = 2000000;
const DEFAULT_MANAGER_BALANCE = 0;

export const FINANCE_RESULT_CODES = Object.freeze({
  INVALID_DRAFT: 'INVALID_DRAFT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  HOLD_EXPIRED: 'HOLD_EXPIRED',
  PITCH_UNAVAILABLE: 'PITCH_UNAVAILABLE',
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  TERMS_CHANGED: 'TERMS_CHANGED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  ALREADY_PAID: 'ALREADY_PAID',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  REFUND_NOT_ELIGIBLE: 'REFUND_NOT_ELIGIBLE',
  ALREADY_REFUNDED: 'ALREADY_REFUNDED',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  CANCELLATION_NOT_ELIGIBLE: 'CANCELLATION_NOT_ELIGIBLE',
  RESCHEDULE_NOT_ELIGIBLE: 'RESCHEDULE_NOT_ELIGIBLE',
});

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function isPitchSlotOperational(state, pitch, slotStart) {
  if (!pitch || pitch.status !== 'active') return false;
  const override = state.availability?.find(item => item.pitchId === pitch.id && item.slotStart === slotStart);
  if (override?.status === 'unavailable') return false;
  if (override?.status === 'available') return true;
  const start = new Date(slotStart);
  if (!Number.isFinite(start.getTime())) return false;
  if (Array.isArray(pitch.openWeekdays) && !pitch.openWeekdays.includes(start.getDay())) return false;
  const time = String(slotStart).slice(11, 16);
  return !pitch.operatingHours
    || (time >= pitch.operatingHours.open && time < pitch.operatingHours.close);
}

function getSlotPrice(state, pitch, slotStart) {
  const override = state.availability?.find(item => item.pitchId === pitch.id && item.slotStart === slotStart);
  return Number(override?.price) > 0 ? Number(override.price) : pitch.price;
}

function isRole(user, role, allowSuspended = false) {
  return Boolean(user && user.role === role && (user.status === 'active' || allowSuspended));
}

function nextRecordId(records, prefix) {
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const largest = records.reduce((result, record) => {
    const match = String(record.id).match(pattern);
    return match ? Math.max(result, Number(match[1])) : result;
  }, 0);
  return `${prefix}-${year}-${String(largest + 1).padStart(4, '0')}`;
}

function ensureBalance(state, userId, role) {
  let balance = state.balances.find(item => item.userId === userId);
  if (!balance) {
    balance = {
      id: `BAL-${userId}`,
      userId,
      role,
      amount: role === 'customer' ? DEFAULT_CUSTOMER_BALANCE : DEFAULT_MANAGER_BALANCE,
      updatedAt: new Date().toISOString(),
    };
    state.balances.push(balance);
  }
  return balance;
}

function paymentForBooking(state, bookingId) {
  return state.transactions.find(transaction => (
    transaction.bookingId === bookingId
    && transaction.type === 'payment'
    && transaction.status === 'completed'
  ));
}

function refundForBooking(state, bookingId) {
  return state.transactions.find(transaction => (
    transaction.bookingId === bookingId
    && transaction.type === 'refund'
    && transaction.status === 'completed'
  ));
}

export function refundBookingInState(state, booking, reason, metadata = {}) {
  if (!booking || booking.status !== 'Confirmed' || booking.paymentStatus !== 'Paid') return null;
  if (refundForBooking(state, booking.id)) return null;
  const payment = paymentForBooking(state, booking.id);
  if (!payment) return null;

  const now = new Date().toISOString();
  const customerBalance = ensureBalance(state, booking.customerId, 'customer');
  const managerBalance = ensureBalance(state, booking.managerId, 'manager');
  const refund = {
    id: nextRecordId(state.transactions, 'RF'),
    type: 'refund',
    status: 'completed',
    amount: booking.amount,
    bookingId: booking.id,
    customerId: booking.customerId,
    managerId: booking.managerId,
    pitchId: booking.pitchId,
    relatedTransactionId: payment.id,
    reason,
    initiatedBy: metadata.initiatedBy ?? null,
    createdAt: now,
  };
  customerBalance.amount += booking.amount;
  customerBalance.updatedAt = now;
  managerBalance.amount -= booking.amount;
  managerBalance.updatedAt = now;
  booking.status = 'Cancelled';
  booking.paymentStatus = 'Refunded';
  booking.cancelledAt = now;
  booking.cancelReason = reason;
  booking.cancelledBy = metadata.initiatedBy ?? null;
  booking.refundTransactionId = refund.id;
  state.transactions.push(refund);
  return refund;
}

function validateReschedule(state, user, draft) {
  if (!draft.rescheduleBookingId) return { ok: true, original: null };
  const original = state.bookings.find(booking => booking.id === draft.rescheduleBookingId);
  const eligible = original
    && original.customerId === user.id
    && original.status === 'Confirmed'
    && original.paymentStatus === 'Paid'
    && Number(original.rescheduleCount ?? 0) < 1
    && Date.parse(original.slotStart) - Date.now() >= 2 * 60 * 60 * 1000
    && !refundForBooking(state, original.id);
  return eligible
    ? { ok: true, original }
    : { ok: false, code: FINANCE_RESULT_CODES.RESCHEDULE_NOT_ELIGIBLE };
}

function slotIsOccupied(state, draft) {
  return state.bookings.some(booking => (
    booking.pitchId === draft.pitchId
    && booking.slotStart === draft.slotStart
    && ['Pending', 'Confirmed'].includes(booking.status)
  ));
}

function validatePaymentState(state, user, bookingDraftId) {
  if (!isRole(user, 'customer')) return { ok: false, code: FINANCE_RESULT_CODES.UNAUTHORIZED };
  const draft = state.bookingDrafts.find(item => item.id === bookingDraftId);
  if (!draft || draft.customerId !== user.id) return { ok: false, code: FINANCE_RESULT_CODES.INVALID_DRAFT };
  const existingBooking = state.bookings.find(booking => booking.sourceDraftId === draft.id || booking.id === draft.bookingId);
  if (existingBooking?.paymentStatus === 'Paid') {
    return { ok: false, code: FINANCE_RESULT_CODES.ALREADY_PAID, bookingId: existingBooking.id };
  }
  if (draft.status !== 'Pending' || Date.parse(draft.holdExpiresAt) <= Date.now()) {
    return { ok: false, code: FINANCE_RESULT_CODES.HOLD_EXPIRED, draft };
  }
  const pitch = state.pitches.find(item => item.id === draft.pitchId);
  if (!pitch || !isPitchSlotOperational(state, pitch, draft.slotStart)) return { ok: false, code: FINANCE_RESULT_CODES.PITCH_UNAVAILABLE, draft };
  if (slotIsOccupied(state, draft)) return { ok: false, code: FINANCE_RESULT_CODES.SLOT_UNAVAILABLE, draft };
  const termsChanged = getSlotPrice(state, pitch, draft.slotStart) !== draft.amount
    || JSON.stringify(pitch.services ?? []) !== JSON.stringify(draft.snapshot.services ?? []);
  if (termsChanged) return { ok: false, code: FINANCE_RESULT_CODES.TERMS_CHANGED, draft, pitch };
  const reschedule = validateReschedule(state, user, draft);
  if (!reschedule.ok) return { ...reschedule, draft, pitch };
  return { ok: true, draft, pitch, originalBooking: reschedule.original };
}

export async function prepareFinanceData() {
  await initializeState();
  const state = loadState();
  const missingBalances = state.users.some(user => (
    ['customer', 'manager'].includes(user.role)
    && !state.balances.some(balance => balance.userId === user.id)
  ));
  if (missingBalances) {
    updateState(current => {
      current.users.forEach(user => {
        if (['customer', 'manager'].includes(user.role)) ensureBalance(current, user.id, user.role);
      });
    });
  }
  return loadState();
}

export async function getCustomerBalance(user) {
  await prepareFinanceData();
  if (!isRole(user, 'customer', true)) return null;
  return clone(loadState().balances.find(balance => balance.userId === user.id) ?? null);
}

export async function getManagerBalance(user) {
  await prepareFinanceData();
  if (!isRole(user, 'manager')) return null;
  return clone(loadState().balances.find(balance => balance.userId === user.id) ?? null);
}

export async function getPaymentContext(user, bookingDraftId) {
  await prepareFinanceData();
  const state = loadState();
  const validation = validatePaymentState(state, user, bookingDraftId);
  const balance = isRole(user, 'customer')
    ? state.balances.find(item => item.userId === user.id) ?? null
    : null;
  const availableBalance = Number(balance?.amount ?? 0) + Number(validation.originalBooking?.amount ?? 0);
  return { ...clone(validation), balance: clone(balance), availableBalance };
}

export async function processSimulatedPayment(user, bookingDraftId) {
  await prepareFinanceData();
  let result;
  updateState(state => {
    const validation = validatePaymentState(state, user, bookingDraftId);
    if (!validation.ok) {
      const terminalDraftFailure = new Set([
        FINANCE_RESULT_CODES.HOLD_EXPIRED,
        FINANCE_RESULT_CODES.PITCH_UNAVAILABLE,
        FINANCE_RESULT_CODES.SLOT_UNAVAILABLE,
        FINANCE_RESULT_CODES.RESCHEDULE_NOT_ELIGIBLE,
      ]).has(validation.code);
      if (terminalDraftFailure && validation.draft?.status === 'Pending') {
        validation.draft.status = 'Cancelled';
        validation.draft.paymentStatus = 'Cancelled';
        validation.draft.cancelReason = validation.code === FINANCE_RESULT_CODES.HOLD_EXPIRED ? 'hold-expired' : 'revalidation-failed';
        validation.draft.cancelledAt = new Date().toISOString();
      }
      result = validation;
      return;
    }
    const { draft, pitch, originalBooking } = validation;
    const customerBalance = ensureBalance(state, user.id, 'customer');
    const availableBalance = customerBalance.amount + (originalBooking?.amount ?? 0);
    if (availableBalance < draft.amount) {
      result = { ok: false, code: FINANCE_RESULT_CODES.INSUFFICIENT_BALANCE, balance: customerBalance.amount };
      return;
    }
    let rescheduleRefund = null;
    if (originalBooking) {
      rescheduleRefund = refundBookingInState(
        state,
        originalBooking,
        `Đổi lịch sang khung giờ mới từ lượt ${originalBooking.id}.`,
        { initiatedBy: user.id },
      );
      if (!rescheduleRefund) {
        result = { ok: false, code: FINANCE_RESULT_CODES.RESCHEDULE_NOT_ELIGIBLE };
        return;
      }
    }
    const managerBalance = ensureBalance(state, draft.managerId, 'manager');
    const now = new Date().toISOString();
    const bookingId = nextRecordId(state.bookings, 'BK');
    const transactionId = nextRecordId(state.transactions, 'TX');
    const booking = {
      id: bookingId,
      customerId: draft.customerId,
      managerId: draft.managerId,
      pitchId: draft.pitchId,
      status: 'Confirmed',
      paymentStatus: 'Paid',
      amount: draft.amount,
      slotStart: draft.slotStart,
      slotEnd: draft.slotEnd,
      createdAt: draft.createdAt,
      confirmedAt: now,
      transactionId,
      sourceDraftId: draft.id,
      rescheduleCount: originalBooking ? Number(originalBooking.rescheduleCount ?? 0) + 1 : 0,
      rescheduledFromBookingId: draft.rescheduleBookingId ?? null,
      reviewId: null,
      snapshot: clone(draft.snapshot),
    };
    const transaction = {
      id: transactionId,
      type: 'payment',
      status: 'completed',
      amount: draft.amount,
      bookingId,
      bookingDraftId: draft.id,
      customerId: draft.customerId,
      managerId: draft.managerId,
      pitchId: draft.pitchId,
      createdAt: now,
    };
    customerBalance.amount -= draft.amount;
    customerBalance.updatedAt = now;
    managerBalance.amount += draft.amount;
    managerBalance.updatedAt = now;
    state.bookings.push(booking);
    state.transactions.push(transaction);
    if (originalBooking) originalBooking.rescheduledToBookingId = bookingId;
    draft.status = 'Confirmed';
    draft.paymentStatus = 'Paid';
    draft.bookingId = bookingId;
    draft.transactionId = transactionId;
    draft.paidAt = now;
    result = { ok: true, booking: clone(booking), transaction: clone(transaction), rescheduleRefund: clone(rescheduleRefund), balance: customerBalance.amount, pitchName: pitch.name };
  });
  return clone(result);
}

export async function listCustomerTransactions(user, filters = {}) {
  await prepareFinanceData();
  if (!isRole(user, 'customer', true)) return [];
  const state = loadState();
  const query = String(filters.query ?? '').trim().toLocaleLowerCase('vi');
  return state.transactions
    .filter(transaction => transaction.customerId === user.id)
    .filter(transaction => !filters.type || transaction.type === filters.type)
    .filter(transaction => !filters.status || transaction.status === filters.status)
    .filter(transaction => !query || [transaction.id, transaction.bookingId]
      .some(value => String(value).toLocaleLowerCase('vi').includes(query)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(transaction => ({
      ...clone(transaction),
      booking: clone(state.bookings.find(booking => booking.id === transaction.bookingId) ?? null),
      pitch: clone(state.pitches.find(pitch => pitch.id === transaction.pitchId) ?? null),
    }));
}

export async function listManagerTransactions(user, filters = {}) {
  await prepareFinanceData();
  if (!isRole(user, 'manager')) return [];
  const state = loadState();
  const ownedPitchIds = new Set(state.pitches.filter(pitch => pitch.ownerId === user.id).map(pitch => pitch.id));
  const pitchId = Number(filters.pitchId) || null;
  return state.transactions
    .filter(transaction => transaction.managerId === user.id && ownedPitchIds.has(transaction.pitchId))
    .filter(transaction => !pitchId || transaction.pitchId === pitchId)
    .filter(transaction => !filters.type || transaction.type === filters.type)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(transaction => ({
      ...clone(transaction),
      booking: clone(state.bookings.find(booking => booking.id === transaction.bookingId) ?? null),
      pitch: clone(state.pitches.find(pitch => pitch.id === transaction.pitchId) ?? null),
      customer: clone(state.users.find(account => account.id === transaction.customerId) ?? null),
    }));
}

export async function getManagerRevenueSummary(user, filters = {}) {
  const transactions = await listManagerTransactions(user, filters);
  const payments = transactions.filter(item => item.type === 'payment' && item.status === 'completed');
  const refunds = transactions.filter(item => item.type === 'refund' && item.status === 'completed');
  const balance = await getManagerBalance(user);
  return {
    grossRevenue: payments.reduce((sum, item) => sum + item.amount, 0),
    refunded: refunds.reduce((sum, item) => sum + item.amount, 0),
    netRevenue: payments.reduce((sum, item) => sum + item.amount, 0) - refunds.reduce((sum, item) => sum + item.amount, 0),
    successfulPayments: payments.length,
    currentBalance: balance?.amount ?? 0,
  };
}

export async function listAdminFinancialRecords(admin, filters = {}) {
  await prepareFinanceData();
  if (!isRole(admin, 'admin')) return [];
  const state = loadState();
  const query = String(filters.query ?? '').trim().toLocaleLowerCase('vi');
  const pitchId = Number(filters.pitchId) || null;
  return state.transactions
    .filter(transaction => !filters.type || transaction.type === filters.type)
    .filter(transaction => !filters.status || transaction.status === filters.status)
    .filter(transaction => !filters.bookingId || transaction.bookingId === filters.bookingId)
    .filter(transaction => !filters.transactionId || transaction.id === filters.transactionId)
    .filter(transaction => !pitchId || transaction.pitchId === pitchId)
    .filter(transaction => !query || [transaction.id, transaction.bookingId, transaction.customerId, transaction.managerId]
      .some(value => String(value).toLocaleLowerCase('vi').includes(query)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(transaction => ({
      ...clone(transaction),
      booking: clone(state.bookings.find(booking => booking.id === transaction.bookingId) ?? null),
      pitch: clone(state.pitches.find(pitch => pitch.id === transaction.pitchId) ?? null),
      customer: clone(state.users.find(account => account.id === transaction.customerId) ?? null),
      manager: clone(state.users.find(account => account.id === transaction.managerId) ?? null),
    }));
}

export async function getAdminFinanceSummary(admin) {
  const records = await listAdminFinancialRecords(admin);
  const payments = records.filter(item => item.type === 'payment' && item.status === 'completed');
  const refunds = records.filter(item => item.type === 'refund' && item.status === 'completed');
  return {
    paymentVolume: payments.reduce((sum, item) => sum + item.amount, 0),
    refundVolume: refunds.reduce((sum, item) => sum + item.amount, 0),
    netVolume: payments.reduce((sum, item) => sum + item.amount, 0) - refunds.reduce((sum, item) => sum + item.amount, 0),
    paymentCount: payments.length,
    refundCount: refunds.length,
  };
}

export async function getRefundEligibility(admin, bookingId) {
  await prepareFinanceData();
  if (!isRole(admin, 'admin')) return { eligible: false, code: FINANCE_RESULT_CODES.UNAUTHORIZED };
  const state = loadState();
  const booking = state.bookings.find(item => item.id === bookingId);
  if (!booking) return { eligible: false, code: FINANCE_RESULT_CODES.PAYMENT_NOT_FOUND };
  if (refundForBooking(state, booking.id) || booking.paymentStatus === 'Refunded') {
    return { eligible: false, code: FINANCE_RESULT_CODES.ALREADY_REFUNDED, booking: clone(booking) };
  }
  const payment = paymentForBooking(state, booking.id);
  if (!payment || booking.paymentStatus !== 'Paid' || booking.status !== 'Confirmed') {
    return { eligible: false, code: FINANCE_RESULT_CODES.REFUND_NOT_ELIGIBLE, booking: clone(booking) };
  }
  return { eligible: true, booking: clone(booking), payment: clone(payment) };
}

export async function processSimulatedRefund(admin, bookingId, reason) {
  await prepareFinanceData();
  const normalizedReason = String(reason ?? '').trim();
  if (normalizedReason.length < 8) return { ok: false, code: FINANCE_RESULT_CODES.REFUND_NOT_ELIGIBLE };
  let result;
  updateState(state => {
    if (!isRole(admin, 'admin')) {
      result = { ok: false, code: FINANCE_RESULT_CODES.UNAUTHORIZED };
      return;
    }
    const booking = state.bookings.find(item => item.id === bookingId);
    if (!booking) {
      result = { ok: false, code: FINANCE_RESULT_CODES.PAYMENT_NOT_FOUND };
      return;
    }
    if (refundForBooking(state, booking.id) || booking.paymentStatus === 'Refunded') {
      result = { ok: false, code: FINANCE_RESULT_CODES.ALREADY_REFUNDED, bookingId };
      return;
    }
    const payment = paymentForBooking(state, booking.id);
    if (!payment || booking.paymentStatus !== 'Paid' || booking.status !== 'Confirmed') {
      result = { ok: false, code: FINANCE_RESULT_CODES.REFUND_NOT_ELIGIBLE, bookingId };
      return;
    }
    const refund = refundBookingInState(state, booking, normalizedReason, { initiatedBy: admin.id });
    if (!refund) {
      result = { ok: false, code: FINANCE_RESULT_CODES.REFUND_NOT_ELIGIBLE, bookingId };
      return;
    }
    result = { ok: true, booking: clone(booking), transaction: clone(refund) };
  });
  if (result.ok) {
    await recordActivity({
      actorId: admin.id,
      actorName: admin.displayName,
      actionType: 'booking-refunded',
      entityType: 'booking',
      entityId: bookingId,
      reason: normalizedReason,
    });
  }
  return clone(result);
}

export async function cancelCustomerBooking(user, bookingId, reason) {
  await prepareFinanceData();
  const normalizedReason = String(reason ?? '').trim();
  if (normalizedReason.length < 8) return { ok: false, code: FINANCE_RESULT_CODES.CANCELLATION_NOT_ELIGIBLE };
  let result;
  updateState(state => {
    if (!isRole(user, 'customer', true)) {
      result = { ok: false, code: FINANCE_RESULT_CODES.UNAUTHORIZED };
      return;
    }
    const booking = state.bookings.find(item => item.id === bookingId && item.customerId === user.id);
    if (!booking) {
      result = { ok: false, code: FINANCE_RESULT_CODES.BOOKING_NOT_FOUND };
      return;
    }
    if (Date.parse(booking.slotStart) - Date.now() < 2 * 60 * 60 * 1000) {
      result = { ok: false, code: FINANCE_RESULT_CODES.CANCELLATION_NOT_ELIGIBLE };
      return;
    }
    const refund = refundBookingInState(state, booking, normalizedReason, { initiatedBy: user.id });
    result = refund
      ? { ok: true, booking: clone(booking), transaction: clone(refund) }
      : { ok: false, code: FINANCE_RESULT_CODES.CANCELLATION_NOT_ELIGIBLE };
  });
  return clone(result);
}

export async function cancelManagerBooking(user, bookingId, reason) {
  await prepareFinanceData();
  const normalizedReason = String(reason ?? '').trim();
  if (normalizedReason.length < 8) return { ok: false, code: FINANCE_RESULT_CODES.CANCELLATION_NOT_ELIGIBLE };
  let result;
  updateState(state => {
    if (!isRole(user, 'manager')) {
      result = { ok: false, code: FINANCE_RESULT_CODES.UNAUTHORIZED };
      return;
    }
    const ownedPitchIds = new Set(state.pitches.filter(pitch => pitch.ownerId === user.id).map(pitch => pitch.id));
    const booking = state.bookings.find(item => item.id === bookingId && item.managerId === user.id && ownedPitchIds.has(item.pitchId));
    if (!booking || booking.status !== 'Confirmed' || Date.parse(booking.slotStart) <= Date.now()) {
      result = { ok: false, code: FINANCE_RESULT_CODES.CANCELLATION_NOT_ELIGIBLE };
      return;
    }
    const refund = refundBookingInState(state, booking, normalizedReason, { initiatedBy: user.id });
    result = refund
      ? { ok: true, booking: clone(booking), transaction: clone(refund) }
      : { ok: false, code: FINANCE_RESULT_CODES.CANCELLATION_NOT_ELIGIBLE };
  });
  if (result.ok) {
    await recordActivity({
      actorId: user.id,
      actorName: user.displayName,
      actionType: 'manager-booking-cancelled',
      entityType: 'booking',
      entityId: bookingId,
      reason: normalizedReason,
    });
  }
  return clone(result);
}
