import '../components/site-header.js';
import '../components/site-footer.js';

const form = document.querySelector('[data-settings-form]');
const submit = form?.querySelector('[type="submit"]');
const label = form?.querySelector('[data-submit-label]');
const spinner = form?.querySelector('.settings-spinner');
const status = form?.querySelector('[data-status]');
const error = form?.querySelector('[data-error]');
const originalLabel = label?.textContent ?? 'Lưu cài đặt';

function loading(value) { if (submit) submit.disabled = value; if (label) label.textContent = value ? 'Đang lưu…' : originalLabel; if (spinner) spinner.hidden = !value; form?.setAttribute('aria-busy', String(value)); }
function clearState() { if (status) { status.hidden = true; status.textContent = ''; } if (error) { error.hidden = true; error.textContent = ''; } }
form?.addEventListener('submit', event => { event.preventDefault(); clearState(); loading(true); window.setTimeout(() => { loading(false); status.textContent = 'Đã lưu cài đặt chung.'; status.hidden = false; }, 280); });
form?.querySelector('[data-reset]')?.addEventListener('click', () => { form.reset(); clearState(); status.textContent = 'Đã khôi phục lựa chọn ban đầu.'; status.hidden = false; });
