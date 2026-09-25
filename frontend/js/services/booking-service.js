// ============================================================
//  Booking Service — Quản lý phiên giữ chỗ (draft) và đặt sân
//  đã hoàn tất qua localStorage.
//  - Giữ chỗ (hold) sống sót khi reload / đóng tab.
//  - holdExpiresAt được lưu tại thời điểm tạo draft, không thể
//    bị kéo dài bằng cách chỉnh URL.
//  - Dọn dẹp tự động các draft đã hết hạn.
// ============================================================

const DRAFTS_KEY  = 'pp_booking_drafts';
const COMPLETED_KEY = 'pp_completed_bookings';

export const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 phút

/* ---- Helpers đọc/ghi localStorage ---- */
function readStore(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); }
  catch { return {}; }
}
function writeStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* ---- Draft (phiên giữ chỗ tạm thời) ---- */

/** Tạo draft mới, trả về object chứa id + holdExpiresAt đã lưu. */
export function createDraft(pitchId, slotId, amount) {
  cleanExpiredDrafts();
  const id = `BD-${pitchId}-${Date.now()}`;
  const draft = {
    id,
    pitchId: Number(pitchId),
    slotId,               // dạng "YYYY-MM-DDTHH:mm"
    amount: Number(amount),
    holdExpiresAt: Date.now() + HOLD_DURATION_MS,
    createdAt: Date.now(),
  };
  const store = readStore(DRAFTS_KEY);
  store[id] = draft;
  writeStore(DRAFTS_KEY, store);
  return draft;
}

/** Lấy draft theo ID, trả null nếu không tìm thấy. */
export function getDraft(draftId) {
  if (!draftId) return null;
  return readStore(DRAFTS_KEY)[draftId] ?? null;
}

/** Xoá draft (khi huỷ giữ chỗ hoặc đã thanh toán). */
export function removeDraft(draftId) {
  const store = readStore(DRAFTS_KEY);
  delete store[draftId];
  writeStore(DRAFTS_KEY, store);
}

/** Kiểm tra draft còn hiệu lực giữ chỗ hay không. */
export function isHoldValid(draft) {
  return draft != null && Date.now() < draft.holdExpiresAt;
}

/** Tìm draft đang còn hiệu lực cho một sân cụ thể. */
export function getDraftForPitch(pitchId) {
  const id = Number(pitchId);
  return Object.values(readStore(DRAFTS_KEY))
    .find(d => d.pitchId === id && isHoldValid(d)) ?? null;
}

/** Dọn dẹp các draft đã hết hạn. */
export function cleanExpiredDrafts() {
  const store = readStore(DRAFTS_KEY);
  const now = Date.now();
  let changed = false;
  for (const [key, draft] of Object.entries(store)) {
    if (now >= draft.holdExpiresAt) { delete store[key]; changed = true; }
  }
  if (changed) writeStore(DRAFTS_KEY, store);
}

/* ---- Completed Bookings (đã thanh toán mô phỏng) ---- */

/** Hoàn tất draft → tạo booking đã thanh toán, trả về booking record. */
export function completeDraft(draftId) {
  const draft = getDraft(draftId);
  if (!draft) return null;

  const bookingId     = `BK-${Date.now()}`;
  const transactionId = `TXN-${Date.now()}`;
  const booking = {
    id: bookingId,
    draftId: draft.id,
    pitchId: draft.pitchId,
    slotId: draft.slotId,
    amount: draft.amount,
    status: 'confirmed',
    paymentStatus: 'paid',
    transactionId,
    createdAt: new Date().toISOString(),
  };

  const store = readStore(COMPLETED_KEY);
  store[bookingId] = booking;
  writeStore(COMPLETED_KEY, store);
  removeDraft(draftId);
  return booking;
}

/** Lấy booking đã hoàn tất theo ID. */
export function getCompletedBooking(bookingId) {
  if (!bookingId) return null;
  return readStore(COMPLETED_KEY)[bookingId] ?? null;
}
