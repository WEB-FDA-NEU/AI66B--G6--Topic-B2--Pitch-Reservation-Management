import { initializeState, loadState, updateState } from './storage-service.js';

export async function getSettings(user) {
  await initializeState();
  const account = loadState()?.users.find(item => item.id === user?.id);
  if (!account) return null;
  return structuredClone({
    displayName: account.displayName,
    phone: account.phone ?? '',
    preferences: account.preferences ?? {},
  });
}

export async function updateSettings(user, input) {
  await initializeState();
  const displayName = String(input.displayName ?? '').trim();
  const phone = String(input.phone ?? '').trim();
  if (displayName.length < 2) throw new Error('Tên hiển thị cần có ít nhất 2 ký tự.');
  if (phone && !/^0\d{9}$/.test(phone)) throw new Error('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.');
  let updated;
  updateState(state => {
    const account = state.users.find(item => item.id === user.id && item.role === user.role);
    if (!account) throw new Error('Không tìm thấy tài khoản hiện tại.');
    account.displayName = displayName;
    account.phone = phone;
    account.preferences = {
      compactCards: Boolean(input.compactCards),
      roleUpdates: Boolean(input.roleUpdates),
    };
    account.updatedAt = new Date().toISOString();
    updated = account;
  });
  return structuredClone(updated);
}
