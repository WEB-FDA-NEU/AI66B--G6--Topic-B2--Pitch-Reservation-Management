import { initializeState, loadState, updateState } from './storage-service.js';

function requireCustomer(user) {
  if (!user || user.role !== 'customer' || user.status !== 'active') {
    throw new Error('Tài khoản không được phép quản lý danh sách yêu thích.');
  }
}

function normalizePitchId(value) {
  const pitchId = Number(value);
  return Number.isInteger(pitchId) && pitchId > 0 ? pitchId : null;
}

export async function prepareFavorites() {
  return initializeState();
}

export function listFavoritePitches(user) {
  requireCustomer(user);
  const state = loadState();
  const record = state?.favorites.find(item => item.customerId === user.id);
  const ids = new Set(record?.pitchIds ?? []);
  return (state?.pitches ?? []).filter(pitch => ids.has(pitch.id));
}

export function isFavorite(user, pitchId) {
  requireCustomer(user);
  const id = normalizePitchId(pitchId);
  return Boolean(loadState()?.favorites.find(item => item.customerId === user.id)?.pitchIds.includes(id));
}

export function setFavorite(user, pitchId, favorite) {
  requireCustomer(user);
  const id = normalizePitchId(pitchId);
  const pitchExists = loadState()?.pitches.some(pitch => pitch.id === id);
  if (!id || !pitchExists) throw new Error('Sân bóng không hợp lệ.');

  updateState(state => {
    let record = state.favorites.find(item => item.customerId === user.id);
    if (!record) {
      record = { customerId: user.id, pitchIds: [] };
      state.favorites.push(record);
    }
    const ids = new Set(record.pitchIds);
    if (favorite) ids.add(id);
    else ids.delete(id);
    record.pitchIds = [...ids];
  });
  return favorite;
}
