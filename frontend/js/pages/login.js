import '../components/site-header.js';
import '../components/site-footer.js';
import { login, ApiError } from '../api.js';
import { logout, saveSession, returnAfterLogin } from '../auth.js';
import { clearFieldErrors, setFieldError } from '../ui.js';

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
const DEMO_ACCOUNTS = {
  customer: { email: 'customer@pitchpoint.test', password: '123456' },
  manager: { email: 'manager@pitchpoint.test', password: '123456' },
  admin: { email: 'admin@pitchpoint.test', password: '123456' },
};

function setLoading(isLoading) {
  if (submitButton) submitButton.disabled = isLoading;
  if (submitLabel) submitLabel.textContent = isLoading ? 'Đang đăng nhập…' : originalSubmitLabel;
  if (spinner) spinner.hidden = !isLoading;
  form?.setAttribute('aria-busy', String(isLoading));
}

function getSafeReturnTo() {
  const value = new URLSearchParams(window.location.search).get('returnTo');
  if (!value) return null;

  try {
    const destination = new URL(value, window.location.href);
    if (destination.origin !== window.location.origin) return null;
    if (destination.pathname.endsWith('/login.html') || destination.pathname.endsWith('/register.html')) return null;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

function showAuthenticationError(message) {
  if (!errorMessage) return;
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

document.querySelectorAll('[data-demo-role]').forEach(button => {
  button.addEventListener('click', () => {
    const account = DEMO_ACCOUNTS[button.dataset.demoRole];
    if (!account || !identifier || !password) return;
    identifier.value = account.email;
    password.value = account.password;
    identifier.focus();
  });
});

document.getElementById('guest-login')?.addEventListener('click', () => {
  logout();
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
    const session = await login(identifier.value.trim(), password.value);
    saveSession(session);
    const returnTo = getSafeReturnTo();
    if (returnTo) sessionStorage.setItem('app_return_to', returnTo);
    if (statusMessage) {
      statusMessage.textContent = 'Đăng nhập thành công. Đang chuyển trang…';
      statusMessage.hidden = false;
    }
    window.setTimeout(returnAfterLogin, 180);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      setFieldError(password, error.detail || 'Email/tên đăng nhập hoặc mật khẩu không đúng.');
    } else {
      showAuthenticationError(error?.detail || 'Không thể đăng nhập lúc này. Vui lòng thử lại.');
    }
    setLoading(false);
  }
});
