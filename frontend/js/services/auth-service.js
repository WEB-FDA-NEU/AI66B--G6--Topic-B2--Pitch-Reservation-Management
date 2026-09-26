import { initializeState, loadState, updateState } from './storage-service.js';

export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLocaleLowerCase('vi');
}

function createCustomerId(users) {
  const largestId = users.reduce((largest, user) => {
    if (!/^U\d+$/.test(user.id)) return largest;
    return Math.max(largest, Number(user.id.slice(1)));
  }, 0);
  return `U${String(largestId + 1).padStart(3, '0')}`;
}

export async function login(email, password) {
  await initializeState();
  const normalizedEmail = normalizeEmail(email);
  const state = loadState();
  const user = state.users.find(account => (
    normalizeEmail(account.email) === normalizedEmail
    && account.password === password
  ));

  if (!user) {
    throw new AuthError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
  }

  if (user.status !== 'active') {
    throw new AuthError('ACCOUNT_RESTRICTED', 'Tài khoản này không thể đăng nhập.');
  }

  updateState(current => {
    current.session = {
      userId: user.id,
      role: user.role,
      signedInAt: new Date().toISOString(),
    };
  });

  return { ...user, password: undefined };
}

export async function registerCustomer(input) {
  await initializeState();
  const state = loadState();
  const email = normalizeEmail(input.email);

  if (state.users.some(user => normalizeEmail(user.email) === email)) {
    throw new AuthError('EMAIL_EXISTS', 'Email này đã được đăng ký.');
  }

  const user = {
    id: createCustomerId(state.users),
    email,
    password: input.password,
    displayName: input.displayName.trim(),
    phone: input.phone.trim(),
    role: 'customer',
    status: 'active',
    isDemo: false,
  };

  updateState(current => {
    current.users.push(user);
  });

  return { ...user, password: undefined };
}

export function logout() {
  const state = loadState();
  if (!state) return;
  updateState(current => {
    current.session = null;
  });
}

export function getSession() {
  return loadState()?.session ?? null;
}

export function getCurrentUser() {
  const state = loadState();
  if (!state?.session) return null;
  return state.users.find(user => user.id === state.session.userId) ?? null;
}

export async function getDemoCredentials() {
  const state = await initializeState();
  return state.users
    .filter(user => user.isDemo)
    .map(({ email, password, role }) => ({ email, password, role }));
}

export function getRoleLandingPage(role) {
  const destinations = {
    customer: 'index.html',
    manager: 'manager-dashboard.html',
    admin: 'admin-dashboard.html',
  };
  return destinations[role] ?? 'index.html';
}
