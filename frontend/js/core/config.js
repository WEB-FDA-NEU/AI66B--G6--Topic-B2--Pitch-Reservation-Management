export const API_BASE = '/api';
export const API_BASE_URL = API_BASE;
export const PAGE_SIZE = 10;

export let BOOKING_ADVANCE_DAYS = 7;
export let HOLD_MINUTES = 10;
export let HOLD_DURATION_MS = HOLD_MINUTES * 60 * 1000;
export let CANCELLATION_NOTICE_HOURS = 2;
export let CANCELLATION_NOTICE_MS = CANCELLATION_NOTICE_HOURS * 60 * 60 * 1000;
export let INITIAL_BALANCE_VND = 2000000;
export let PASSWORD_MIN_LENGTH = 6;

export function applyRules(s = {}) {
  const int = (v, d) => (Number.isInteger(v) && v >= 0 ? v : d);
  BOOKING_ADVANCE_DAYS = int(s.booking_advance_days, BOOKING_ADVANCE_DAYS);
  HOLD_MINUTES = int(s.hold_minutes, HOLD_MINUTES);
  HOLD_DURATION_MS = HOLD_MINUTES * 60 * 1000;
  CANCELLATION_NOTICE_HOURS = int(s.cancellation_notice_hours, CANCELLATION_NOTICE_HOURS);
  CANCELLATION_NOTICE_MS = CANCELLATION_NOTICE_HOURS * 60 * 60 * 1000;
  INITIAL_BALANCE_VND = int(s.initial_balance_vnd, INITIAL_BALANCE_VND);
  PASSWORD_MIN_LENGTH = int(s.password_min_length, PASSWORD_MIN_LENGTH);
}

export const holdText = () => `${HOLD_MINUTES} phút`;
export const noticeText = () => `${CANCELLATION_NOTICE_HOURS} giờ`;
export const bookingDaysText = () => `${BOOKING_ADVANCE_DAYS + 1} ngày`;
