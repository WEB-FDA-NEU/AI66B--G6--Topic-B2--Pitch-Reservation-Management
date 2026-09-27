let generatedErrorId = 0;
const validationCycles = new WeakSet();

function fieldName(control) {
  const groupLabel = control.type === 'radio'
    ? control.closest('.field')?.querySelector('.field__label')?.textContent
    : null;
  const label = (groupLabel ?? control.labels?.[0]?.textContent)?.replace('*', '').trim();
  return label ? `“${label}”` : '';
}

function validationMessage(control) {
  const name = fieldName(control);
  const { validity } = control;
  const namedField = name ? ` ${name}` : '';
  if (validity.valueMissing && control.type === 'checkbox') return `Vui lòng xác nhận${namedField}.`;
  if (validity.valueMissing && (control.type === 'radio' || control instanceof HTMLSelectElement)) return `Vui lòng chọn${namedField}.`;
  if (validity.valueMissing) return `Vui lòng nhập${namedField}.`;
  if (validity.typeMismatch) return `Giá trị${namedField} chưa đúng định dạng.`;
  if (validity.tooShort) return `${name || 'Nội dung'} cần ít nhất ${control.minLength} ký tự.`;
  if (validity.tooLong) return `${name || 'Nội dung'} không được vượt quá ${control.maxLength} ký tự.`;
  if (validity.patternMismatch) return `Giá trị${namedField} chưa đúng định dạng yêu cầu.`;
  if (validity.rangeUnderflow) return `${name || 'Giá trị'} phải từ ${control.min} trở lên.`;
  if (validity.rangeOverflow) return `${name || 'Giá trị'} không được lớn hơn ${control.max}.`;
  if (validity.stepMismatch) return `Vui lòng chọn một giá trị hợp lệ cho${namedField}.`;
  return `Vui lòng kiểm tra lại${namedField}.`;
}

function describedError(control) {
  const describedIds = String(control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  return describedIds
    .map(id => document.getElementById(id))
    .find(element => element?.classList.contains('field__error') || element?.id.endsWith('-error')) ?? null;
}

function ensureErrorElement(control) {
  const existing = describedError(control) ?? control.closest('.field')?.querySelector('.field__error');
  if (existing) return existing;

  const error = document.createElement('p');
  error.className = 'field__error';
  error.id = `${control.id || `field-${++generatedErrorId}`}-validation-error`;
  error.dataset.generatedValidationError = '';
  const container = control.closest('.field') ?? control.parentElement;
  container?.append(error);

  const describedBy = String(control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  control.setAttribute('aria-describedby', [...new Set([...describedBy, error.id])].join(' '));
  return error;
}

function showError(control) {
  const error = ensureErrorElement(control);
  if (!error) return;
  error.textContent = validationMessage(control);
  error.hidden = false;
  control.setAttribute('aria-invalid', 'true');
}

function clearError(control) {
  if (control.getAttribute('aria-invalid') !== 'true') return;
  const error = describedError(control) ?? control.closest('.field')?.querySelector('.field__error');
  if (error) error.textContent = '';
  control.removeAttribute('aria-invalid');
}

document.addEventListener('invalid', event => {
  const control = event.target;
  if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
  event.preventDefault();

  const form = control.form;
  if (form && validationCycles.has(form)) return;
  if (form) validationCycles.add(form);
  showError(control);

  queueMicrotask(() => {
    if (form) validationCycles.delete(form);
    control.focus({ preventScroll: true });
    control.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}, true);

document.addEventListener('input', event => {
  const control = event.target;
  if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
    clearError(control);
  }
}, true);

document.addEventListener('reset', event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  form.querySelectorAll('[aria-invalid="true"]').forEach(clearError);
}, true);
