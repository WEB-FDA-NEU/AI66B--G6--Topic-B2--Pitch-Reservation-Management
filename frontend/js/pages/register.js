import '../components/site-header.js';
import '../components/site-footer.js';
import { AuthError, registerCustomer } from '../services/auth-service.js';
import { clearFieldErrors, setFieldError } from '../ui.js';

const form = document.getElementById('register-form');
const displayName = document.getElementById('display-name');
const email = document.getElementById('register-email');
const phone = document.getElementById('register-phone');
const password = document.getElementById('register-password');
const confirmPassword = document.getElementById('register-confirm');
const terms = document.getElementById('register-terms');
const submitButton = form?.querySelector('[type="submit"]');
const submitLabel = form?.querySelector('[data-submit-label]');
const spinner = form?.querySelector('.register-form__spinner');
const errorMessage = document.getElementById('register-error');
const statusMessage = document.getElementById('register-status');
const originalSubmitLabel = submitLabel?.textContent ?? 'Đăng ký';

function setLoading(isLoading) {
  if (submitButton) submitButton.disabled = isLoading;
  if (submitLabel) submitLabel.textContent = isLoading ? 'Đang tạo tài khoản…' : originalSubmitLabel;
  if (spinner) spinner.hidden = !isLoading;
  form?.setAttribute('aria-busy', String(isLoading));
}

function showFieldError(input, message) {
  if (input) setFieldError(input, message);
}

document.querySelectorAll('[data-password-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.textContent = reveal ? 'Ẩn' : 'Hiện';
    button.setAttribute('aria-pressed', String(reveal));
  });
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
  if (!displayName?.value.trim() || displayName.value.trim().length < 2) {
    showFieldError(displayName, 'Tên khách hàng cần có ít nhất 2 ký tự.');
    isValid = false;
  }
  if (!email?.value.trim()) {
    showFieldError(email, 'Vui lòng nhập email.');
    isValid = false;
  } else if (email.validity.typeMismatch) {
    showFieldError(email, 'Vui lòng nhập đúng định dạng email.');
    isValid = false;
  }
  if (!password?.value) {
    showFieldError(password, 'Vui lòng nhập mật khẩu.');
    isValid = false;
  } else if (password.value.length < 8) {
    showFieldError(password, 'Mật khẩu cần có ít nhất 8 ký tự.');
    isValid = false;
  }
  if (!confirmPassword?.value) {
    showFieldError(confirmPassword, 'Vui lòng nhập lại mật khẩu.');
    isValid = false;
  } else if (password?.value !== confirmPassword.value) {
    showFieldError(confirmPassword, 'Hai mật khẩu không khớp.');
    isValid = false;
  }
  if (!terms?.checked) {
    const termsError = document.getElementById('terms-error');
    if (termsError) termsError.textContent = 'Bạn cần đồng ý với điều khoản và chính sách.';
    terms?.setAttribute('aria-invalid', 'true');
    isValid = false;
  }
  if (!isValid) return;

  setLoading(true);
  try {
    await registerCustomer({
      displayName: displayName.value.trim(),
      email: email.value.trim(),
      password: password.value,
      phone: phone?.value.trim() ?? '',
    });
    if (statusMessage) {
      statusMessage.textContent = 'Tạo tài khoản thành công. Đang chuyển tới trang đăng nhập…';
      statusMessage.hidden = false;
    }
    window.setTimeout(() => location.assign('login.html'), 180);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'EMAIL_EXISTS') {
      showFieldError(email, error.message);
    } else if (errorMessage) {
      errorMessage.textContent = error.message || 'Không thể tạo tài khoản lúc này. Vui lòng thử lại.';
      errorMessage.hidden = false;
    }
    setLoading(false);
  }
});
