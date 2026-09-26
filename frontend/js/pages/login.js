import '../components/site-header.js';
import '../components/site-footer.js';
import {
  AuthError,
  getDemoCredentials,
  getRoleLandingPage,
  login,
  logout,
} from '../services/auth-service.js';
import { clearFieldErrors, setFieldError } from '../ui.js';

const APPROVED_RETURN_TARGETS = new Set([
  'index.html',
  'search.html',
  'pitch-detail.html',
]);
const AVAILABLE_ROLE_LANDINGS = new Set(['index.html']);

const form = document.getElementById('login-form');
const identifier = document.getElementById('login-identifier');
const password = document.getElementById('login-password');
const passwordToggle = document.getElementById('password-toggle');
const submitButton = form?.querySelector('[type="submit"]');
const submitLabel = form?.querySelector('[data-submit-label]');
const spinner = form?.querySelector('.login-form__spinner');
const errorMessage = document.getElementById('login-error');
const statusMessage = document.getElementById('login-status');
const originalSubmitLabel = submitLabel?.textContent ?? 'Đăng nhập';
const demoAccounts = new Map();

function setLoading(isLoading) {
  if (submitButton) submitButton.disabled = isLoading;
  if (submitLabel) submitLabel.textContent = isLoading ? 'Đang đăng nhập…' : originalSubmitLabel;
  if (spinner) spinner.hidden = !isLoading;
  form?.setAttribute('aria-busy', String(isLoading));
}

function showAuthenticationError(message) {
  if (!errorMessage) return;
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function getSafeReturnTo() {
  const value = new URLSearchParams(location.search).get('returnTo');
  if (!value || value.includes('\\') || value.includes('..') || value.startsWith('//')) return null;

  try {
    const destination = new URL(value, location.href);
    const filename = destination.pathname.split('/').pop();
    if (destination.origin !== location.origin || !APPROVED_RETURN_TARGETS.has(filename)) return null;
    return `${filename}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

function getPostLoginDestination(user) {
  const returnTo = getSafeReturnTo();
  if (returnTo) return returnTo;

  const roleLanding = getRoleLandingPage(user.role);
  return AVAILABLE_ROLE_LANDINGS.has(roleLanding) ? roleLanding : 'index.html';
}

async function initializeDemoAccounts() {
  try {
    const credentials = await getDemoCredentials();
    credentials.forEach(account => demoAccounts.set(account.role, account));
  } catch {
    document.querySelectorAll('[data-demo-role]').forEach(button => {
      button.disabled = true;
    });
    showAuthenticationError('Không tải được tài khoản dùng thử. Vui lòng tải lại trang.');
  }
}

document.querySelectorAll('[data-demo-role]').forEach(button => {
  button.addEventListener('click', () => {
    const account = demoAccounts.get(button.dataset.demoRole);
    if (!account || !identifier || !password) return;
    identifier.value = account.email;
    password.value = account.password;
    password.focus();
  });
});

document.getElementById('guest-login')?.addEventListener('click', () => {
  logout();
  location.replace('index.html');
});

passwordToggle?.addEventListener('click', () => {
  if (!password) return;
  const reveal = password.type === 'password';
  password.type = reveal ? 'text' : 'password';
  passwordToggle.textContent = reveal ? 'Ẩn' : 'Hiện';
  passwordToggle.setAttribute('aria-pressed', String(reveal));
});

form?.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(form);
  if (errorMessage) {
    errorMessage.textContent = '';
    errorMessage.hidden = true;
  }
  if (statusMessage) {
    statusMessage.textContent = '';
    statusMessage.hidden = true;
  }

  let isValid = true;
  if (!identifier?.value.trim()) {
    if (identifier) setFieldError(identifier, 'Vui lòng nhập email.');
    isValid = false;
  } else if (identifier.validity.typeMismatch) {
    setFieldError(identifier, 'Vui lòng nhập đúng định dạng email.');
    isValid = false;
  }
  if (!password?.value) {
    if (password) setFieldError(password, 'Vui lòng nhập mật khẩu.');
    isValid = false;
  } else if (password.value.length < 6) {
    setFieldError(password, 'Mật khẩu cần có ít nhất 6 ký tự.');
    isValid = false;
  }
  if (!isValid) return;

  setLoading(true);
  try {
    const user = await login(identifier.value, password.value);
    if (statusMessage) {
      statusMessage.textContent = 'Đăng nhập thành công. Đang chuyển trang…';
      statusMessage.hidden = false;
    }
    const destination = getPostLoginDestination(user);
    window.setTimeout(() => location.assign(destination), 180);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'INVALID_CREDENTIALS') {
      setFieldError(password, error.message);
    } else {
      showAuthenticationError(error.message || 'Không thể đăng nhập lúc này. Vui lòng thử lại.');
    }
    setLoading(false);
  }
});

initializeDemoAccounts();
