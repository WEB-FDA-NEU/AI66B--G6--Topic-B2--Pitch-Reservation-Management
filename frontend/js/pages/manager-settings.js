import '../components/site-header.js';
import '../components/site-footer.js';
import { clearFieldErrors, setFieldError } from '../ui.js';

const form = document.querySelector('[data-settings-form]');
const submit = form?.querySelector('[type="submit"]');
const label = form?.querySelector('[data-submit-label]');
const spinner = form?.querySelector('.settings-spinner');
const status = form?.querySelector('[data-status]');
const error = form?.querySelector('[data-error]');
const originalLabel = label?.textContent ?? 'Lưu thay đổi';
const fields = { name: document.getElementById('manager-name'), email: document.getElementById('manager-email'), business: document.getElementById('business-name'), businessEmail: document.getElementById('business-email'), current: document.getElementById('manager-current-password'), next: document.getElementById('manager-new-password'), confirm: document.getElementById('manager-confirm-password'), consent: form?.querySelector('[name="confirm_password_change"]') };

function loading(value) { if (submit) submit.disabled = value; if (label) label.textContent = value ? 'Đang lưu…' : originalLabel; if (spinner) spinner.hidden = !value; form?.setAttribute('aria-busy', String(value)); }
function clearState() { clearFieldErrors(form); if (status) { status.hidden = true; status.textContent = ''; } if (error) { error.hidden = true; error.textContent = ''; } }
function validate() { let valid = true; if (fields.name.value.trim().length < 2) { setFieldError(fields.name, 'Tên cần có ít nhất 2 ký tự.'); valid = false; } if (!fields.email.validity.valid) { setFieldError(fields.email, 'Vui lòng nhập đúng định dạng email.'); valid = false; } if (!fields.business.value.trim()) { setFieldError(fields.business, 'Vui lòng nhập tên đơn vị.'); valid = false; } if (fields.businessEmail.value && !fields.businessEmail.validity.valid) { setFieldError(fields.businessEmail, 'Email đơn vị không hợp lệ.'); valid = false; } const changing = fields.current.value || fields.next.value || fields.confirm.value || fields.consent.checked; if (changing) { if (!fields.current.value) { setFieldError(fields.current, 'Vui lòng nhập mật khẩu hiện tại.'); valid = false; } if (fields.next.value.length < 8) { setFieldError(fields.next, 'Mật khẩu mới cần có ít nhất 8 ký tự.'); valid = false; } if (fields.next.value !== fields.confirm.value) { setFieldError(fields.confirm, 'Hai mật khẩu mới không khớp.'); valid = false; } if (!fields.consent.checked) { fields.consent.setAttribute('aria-invalid', 'true'); valid = false; } } return valid; }

form?.addEventListener('submit', event => { event.preventDefault(); clearState(); if (!validate()) return; loading(true); window.setTimeout(() => { loading(false); status.textContent = 'Đã lưu thay đổi quản lý.'; status.hidden = false; }, 280); });
form?.querySelector('[data-cancel]')?.addEventListener('click', () => { form.reset(); clearState(); });
