import { api } from '../services/api-client.js';
import { toast, clearFieldErrors, setFieldError } from '../core/ui.js';
import { el, formatDateTime, formatVnd, infoLines } from '../core/render.js';
import { content, bootManagement } from '../features/management-kit.js';

const GROUPS = [
  ['booking', 'Quy tắc đặt sân', 'Áp dụng cho mọi sân. Đơn đã tạo giữ nguyên quy tắc lúc tạo đơn.'],
  ['account', 'Tài khoản mới', 'Ví tiền là tiền thử nghiệm, không phải tiền thật.'],
  ['security', 'Bảo mật', 'Áp dụng cho mật khẩu mới và lần đăng nhập tiếp theo.']
];

function showValue(s, value) {
  return s.unit === '₫' ? formatVnd(value) : `${value} ${s.unit}`;
}

async function renderAdminSettings() {
  const list = await api.settings.adminList();
  const inputs = new Map();

  const form = el('form', null, { id: 'settings-form', class: 'stack-lg', novalidate: true });
  for (const [group, title, note] of GROUPS) {
    const rows = list.filter(s => s.group === group);
    if (!rows.length) continue;
    const grid = el('div', null, { class: 'grid-2' });
    for (const s of rows) {
      const id = `setting-${s.key}`;
      const input = el('input', null, {
        id, name: s.key, type: 'number', inputmode: 'numeric', required: true,
        min: String(s.min), max: String(s.max), step: s.unit === '₫' ? '10000' : '1', value: String(s.value)
      });
      inputs.set(s.key, { input, s });
      grid.append(el('div', null, { class: 'field-group' }, [
        el('label', `${s.label} (${s.unit})`, { for: id }),
        input,
        infoLines([`Từ ${showValue(s, s.min)} đến ${showValue(s, s.max)}, mặc định ${showValue(s, s.default)}`, s.updated_by_name ? `Sửa lần cuối bởi ${s.updated_by_name}, ${formatDateTime(s.updated_date)}` : null], 'text-xs muted')
      ]));
    }
    form.append(el('section', null, { class: 'surface stack' }, [
      el('h2', title),
      el('p', note, { class: 'text-sm muted' }),
      grid
    ]));
  }

  const status = el('p', '', { role: 'status', class: 'text-sm' });
  const saveBtn = el('button', 'Lưu cài đặt', { type: 'submit', class: 'button' });
  form.append(el('div', null, { class: 'row-between' }, [
    el('a', 'Xem nhật ký thay đổi', { href: 'admin-activity-log.html', class: 'button secondary sm' }),
    saveBtn
  ]), status);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saveBtn.disabled) return;
    clearFieldErrors(form);
    status.textContent = '';
    const values = {};
    for (const [key, { input, s }] of inputs) {
      const n = Number(input.value);
      if (input.value.trim() === '' || !Number.isInteger(n) || n < s.min || n > s.max) {
        setFieldError(input, `Chọn số nguyên từ ${showValue(s, s.min)} đến ${showValue(s, s.max)}.`);
        continue;
      }
      if (n !== s.value) values[key] = n;
    }
    const invalid = form.querySelector('[aria-invalid="true"]');
    if (invalid) { invalid.focus(); return; }
    if (!Object.keys(values).length) { status.textContent = 'Không có thay đổi nào để lưu.'; return; }
    saveBtn.disabled = true;
    try {
      const res = await api.functions.invoke('adminAction', { action: 'save_settings', settings: values });
      if (res.data?.error) throw new Error(res.data.error);
      api.settings.forgetRules();
      toast(`Đã lưu ${res.data.changed} cài đặt.`);
      await renderAdminSettings();
    } catch (err) {
      status.textContent = err.message || 'Không lưu được cài đặt.';
      status.className = 'field-error';
    } finally {
      saveBtn.disabled = false;
    }
  });

  content.replaceChildren(form);
}

bootManagement(renderAdminSettings);
