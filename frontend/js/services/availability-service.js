import { initializeState, loadState, updateState } from './storage-service.js';

function requireManagedPitch(user, pitchId) {
  if (!user || user.role !== 'manager' || user.status !== 'active') {
    throw new Error('Tài khoản không được phép quản lý lịch sân.');
  }
  const id = Number(pitchId);
  const pitch = loadState()?.pitches.find(item => item.id === id && item.ownerId === user.id);
  if (!pitch) throw new Error('Bạn không có quyền quản lý sân này.');
  if (!['active', 'deactivated'].includes(pitch.status)) {
    throw new Error('Sân bị đình chỉ không thể thay đổi lịch hoạt động.');
  }
  return pitch;
}

function normalizeSlotStart(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const slotStart = `${date}T${time}:00+07:00`;
  return Number.isFinite(Date.parse(slotStart)) ? slotStart : null;
}

function hasProtectedSlot(state, pitchId, slotStart) {
  return state.bookings.some(booking => (
    booking.pitchId === pitchId && booking.slotStart === slotStart && booking.status === 'Confirmed'
  )) || state.bookingDrafts.some(draft => (
    draft.pitchId === pitchId
    && draft.slotStart === slotStart
    && draft.status === 'Pending'
    && Date.parse(draft.holdExpiresAt) > Date.now()
  ));
}

export async function prepareAvailability() {
  return initializeState();
}

export function getPitchAvailability(user, pitchId) {
  const pitch = requireManagedPitch(user, pitchId);
  const overrides = loadState()?.availability.filter(item => item.pitchId === pitch.id) ?? [];
  return {
    pitch: structuredClone(pitch),
    openWeekdays: [...pitch.openWeekdays],
    operatingHours: structuredClone(pitch.operatingHours),
    overrides: structuredClone(overrides),
  };
}

export function updatePitchAvailability(user, pitchId, input) {
  const pitch = requireManagedPitch(user, pitchId);
  const open = String(input.open ?? '');
  const close = String(input.close ?? '');
  const weekdays = [...new Set(input.openWeekdays.map(Number))].filter(day => day >= 0 && day <= 6);
  if (!/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close) || open >= close) {
    throw new Error('Giờ mở cửa phải sớm hơn giờ đóng cửa.');
  }
  if (!weekdays.length) throw new Error('Cần chọn ít nhất một ngày hoạt động.');

  updateState(state => {
    const conflictingHold = state.bookingDrafts.some(draft => {
      if (draft.pitchId !== pitch.id || draft.status !== 'Pending' || Date.parse(draft.holdExpiresAt) <= Date.now()) return false;
      const slot = new Date(draft.slotStart);
      const time = String(draft.slotStart).slice(11, 16);
      return !weekdays.includes(slot.getDay()) || time < open || time >= close;
    });
    if (conflictingHold) throw new Error('Không thể thu hẹp lịch khi đang có lượt giữ chỗ bị ảnh hưởng.');
    const target = state.pitches.find(item => item.id === pitch.id);
    target.openWeekdays = weekdays;
    target.operatingHours = { open, close, label: `${open} – ${close}` };
    target.updatedAt = new Date().toISOString();
  });
  return getPitchAvailability(user, pitch.id);
}

export function saveAvailabilityOverride(user, pitchId, input) {
  const pitch = requireManagedPitch(user, pitchId);
  const date = String(input.date ?? '');
  const time = String(input.time ?? '');
  const slotStart = normalizeSlotStart(date, time);
  const status = String(input.status ?? '');
  const price = input.price === '' || input.price == null ? null : Number(input.price);
  if (!slotStart || Date.parse(slotStart) <= Date.now()) throw new Error('Khung giờ điều chỉnh phải nằm trong tương lai.');
  if (!['available', 'unavailable'].includes(status)) throw new Error('Trạng thái khung giờ không hợp lệ.');
  if (price !== null && (!Number.isFinite(price) || price < 10000)) throw new Error('Giá riêng phải từ 10.000 VND.');

  updateState(state => {
    if (hasProtectedSlot(state, pitch.id, slotStart)) {
      throw new Error('Không thể thay đổi khung giờ đang được giữ hoặc đã xác nhận.');
    }
    const existing = state.availability.find(item => item.pitchId === pitch.id && item.slotStart === slotStart);
    const values = {
      id: existing?.id ?? `AV-${pitch.id}-${date}-${time.replace(':', '')}`,
      pitchId: pitch.id,
      slotStart,
      status,
      price,
      updatedAt: new Date().toISOString(),
    };
    if (existing) Object.assign(existing, values);
    else state.availability.push(values);
  });
  return getPitchAvailability(user, pitch.id);
}

export function removeAvailabilityOverride(user, pitchId, overrideId) {
  const pitch = requireManagedPitch(user, pitchId);
  updateState(state => {
    const index = state.availability.findIndex(item => item.id === overrideId && item.pitchId === pitch.id);
    if (index < 0) throw new Error('Không tìm thấy điều chỉnh khung giờ.');
    if (hasProtectedSlot(state, pitch.id, state.availability[index].slotStart)) {
      throw new Error('Không thể xoá điều chỉnh của khung giờ đang được giữ hoặc đã xác nhận.');
    }
    state.availability.splice(index, 1);
  });
  return getPitchAvailability(user, pitch.id);
}
