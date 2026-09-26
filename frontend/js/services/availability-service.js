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
    const target = state.pitches.find(item => item.id === pitch.id);
    target.openWeekdays = weekdays;
    target.operatingHours = { open, close, label: `${open} – ${close}` };
    target.updatedAt = new Date().toISOString();
  });
  return getPitchAvailability(user, pitch.id);
}
