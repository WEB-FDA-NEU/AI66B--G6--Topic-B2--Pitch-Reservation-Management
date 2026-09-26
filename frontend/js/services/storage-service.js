const STORAGE_KEY = 'pitch-point:state:v1';
const USERS_URL = new URL('../../mock/users.json', import.meta.url);
let initializationPromise = null;

function isValidState(state) {
  return state
    && state.version === 1
    && Array.isArray(state.users)
    && (state.session === null || typeof state.session === 'object');
}

export function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const state = JSON.parse(stored);
    return isValidState(state) ? state : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  if (!isValidState(state)) throw new TypeError('Trạng thái Pitch Point không hợp lệ.');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

async function initializeFromSeed() {
  const response = await fetch(USERS_URL);
  if (!response.ok) throw new Error('Không tải được tài khoản dùng thử.');

  const users = await response.json();
  if (!Array.isArray(users)) throw new Error('Dữ liệu tài khoản dùng thử không hợp lệ.');

  return saveState({
    version: 1,
    users,
    session: null,
  });
}

export async function initializeState() {
  const existing = loadState();
  if (existing) return existing;

  if (!initializationPromise) {
    initializationPromise = initializeFromSeed().finally(() => {
      initializationPromise = null;
    });
  }

  return initializationPromise;
}

export function updateState(updater) {
  const current = loadState();
  if (!current) throw new Error('Trạng thái Pitch Point chưa được khởi tạo.');

  const draft = JSON.parse(JSON.stringify(current));
  const next = updater(draft) ?? draft;
  return saveState(next);
}

export function resetDemoState() {
  localStorage.removeItem(STORAGE_KEY);
}
