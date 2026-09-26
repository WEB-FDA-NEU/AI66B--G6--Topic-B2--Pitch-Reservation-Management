const STORAGE_KEY = 'pitch-point:state:v1';
const USERS_URL = new URL('../../mock/users.json', import.meta.url);
const ADMIN_URL = new URL('../../mock/admin.json', import.meta.url);
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

async function loadSeedData() {
  const [usersResponse, adminResponse] = await Promise.all([
    fetch(USERS_URL),
    fetch(ADMIN_URL),
  ]);
  if (!usersResponse.ok || !adminResponse.ok) throw new Error('Không tải được dữ liệu mô phỏng.');
  const [demoUsers, adminSeed] = await Promise.all([usersResponse.json(), adminResponse.json()]);
  if (!Array.isArray(demoUsers) || !Array.isArray(adminSeed.users)) {
    throw new Error('Dữ liệu mô phỏng không hợp lệ.');
  }
  return { demoUsers, adminSeed };
}

function mergeUsers(currentUsers, seededUsers) {
  const existingEmails = new Set(currentUsers.map(user => String(user.email).toLocaleLowerCase('vi')));
  return [
    ...currentUsers,
    ...seededUsers.filter(user => !existingEmails.has(String(user.email).toLocaleLowerCase('vi'))),
  ];
}

async function initializeFromSeed(existing = null) {
  const { demoUsers, adminSeed } = await loadSeedData();
  const baseUsers = existing?.users ?? demoUsers;
  return saveState({
    ...adminSeed,
    ...existing,
    version: 1,
    users: mergeUsers(baseUsers, adminSeed.users),
    session: existing?.session ?? null,
    reports: existing?.reports ?? adminSeed.reports,
    contents: existing?.contents ?? adminSeed.contents,
    activities: existing?.activities ?? adminSeed.activities,
    settings: existing?.settings ?? adminSeed.settings,
  });
}

export async function initializeState() {
  const existing = loadState();
  const hasAdminCollections = existing
    && Array.isArray(existing.reports)
    && Array.isArray(existing.contents)
    && Array.isArray(existing.activities)
    && existing.settings?.admin;
  if (hasAdminCollections) return existing;

  if (!initializationPromise) {
    initializationPromise = initializeFromSeed(existing).finally(() => {
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
