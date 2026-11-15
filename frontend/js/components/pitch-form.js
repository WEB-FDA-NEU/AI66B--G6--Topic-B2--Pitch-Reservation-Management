import { setFieldError } from '../core/ui.js';
import { el, formatVnd, COMMON_FACILITIES, hourSelect } from '../core/render.js';
import { createImageUpload } from './image-upload.js';

const PITCH_TYPES = [['5v5', 'Sân 5 người (5v5)'], ['7v7', 'Sân 7 người (7v7)'], ['11v11', 'Sân 11 người (11v11)']];
const field = (label, id, control, hint) => el('div', null, { class: 'field-group' }, [el('label', label, { for: id }), control, hint || null]);

export function createPitchForm({ pitch = null } = {}) {
  const nameInput = el('input', null, { id: 'pf-name', name: 'name', required: true, maxlength: '150', value: pitch?.name || '', placeholder: 'VD: Sân bóng Thành Phát - Sân A' });
  const typeSelect = el('select', null, { id: 'pf-type', name: 'type' }, PITCH_TYPES.map(([value, label]) => el('option', label, { value })));
  typeSelect.value = pitch?.type || '7v7';

  const priceInput = el('input', null, { id: 'pf-price', name: 'base_price_vnd', type: 'number', min: '50000', max: '20000000', step: '10000', required: true, value: String(pitch?.base_price_vnd ?? 300000) });
  const priceHint = el('div', `Khách sẽ thấy: ${formatVnd(priceInput.value)}/giờ`, { class: 'field-hint' });
  priceInput.addEventListener('input', () => { priceHint.textContent = `Khách sẽ thấy: ${formatVnd(priceInput.value || 0)}/giờ`; });

  const slotReadonly = el('input', null, { id: 'pf-slot-duration', value: '60 phút', disabled: true });
  const cityInput = el('input', null, { id: 'pf-city', name: 'city', maxlength: '100', value: pitch?.city || 'Hà Nội' });
  const districtInput = el('input', null, { id: 'pf-district', name: 'district', maxlength: '100', value: pitch?.district || '', placeholder: 'VD: Cầu Giấy' });
  const addressInput = el('input', null, { id: 'pf-address', name: 'address', required: true, maxlength: '300', value: pitch?.address || '', placeholder: 'Số nhà, đường, phường/xã...' });
  const openTimeInput = hourSelect({ id: 'pf-open', name: 'open_time', 'aria-describedby': 'pf-hours-help' }, pitch?.open_time || '06:00');
  const closeTimeInput = hourSelect({ id: 'pf-close', name: 'close_time', 'aria-describedby': 'pf-hours-help' }, pitch?.close_time || '22:00');
  const syncHours = el('input', null, { type: 'checkbox', id: 'pf-sync-hours' });

  const existingFacs = new Set((Array.isArray(pitch?.facilities) ? pitch.facilities : ['Đèn chiếu sáng', 'Bãi đỗ xe']).map(f => f === 'Bãi gửi xe' ? 'Bãi đỗ xe' : f));
  const facCheckboxes = COMMON_FACILITIES.map(fac => {
    const cb = el('input', null, { type: 'checkbox', value: fac });
    if (existingFacs.delete(fac)) cb.checked = true;
    return cb;
  });
  const facGrid = el('div', null, { class: 'grid-4' }, facCheckboxes.map(cb => el('label', null, { class: 'checkbox-label text-sm' }, [cb, el('span', cb.value)])));
  const customFacInput = el('input', null, { id: 'pf-custom-fac', placeholder: 'Nhập thêm tiện ích khác, phân tách bằng dấu phẩy...', value: [...existingFacs].join(', ') });
  const rulesInput = el('textarea', null, { id: 'pf-rules', name: 'rules', maxlength: '2000', placeholder: 'VD: Mang giày đinh TF, không hút thuốc trong sân...', value: pitch?.rules || '' });
  const photos = createImageUpload({ id: 'pf-images', images: pitch?.images || [] });

  const submitButton = el('button', pitch ? 'Lưu cập nhật sân' : 'Tạo sân bóng', { type: 'submit', class: 'button' });
  const form = el('form', null, { class: 'surface stack', novalidate: true }, [
    el('h2', pitch ? 'Thông tin sân' : 'Thông tin sân mới'),
    el('div', null, { class: 'grid-2' }, [field('Tên sân bóng *', 'pf-name', nameInput), field('Loại sân *', 'pf-type', typeSelect)]),
    el('div', null, { class: 'grid-2' }, [field('Giá cơ bản mỗi giờ (₫) *', 'pf-price', priceInput, priceHint), field('Thời lượng mỗi ca', 'pf-slot-duration', slotReadonly)]),
    el('div', null, { class: 'grid-3' }, [field('Tỉnh / Thành phố', 'pf-city', cityInput), field('Quận / Huyện', 'pf-district', districtInput), field('Địa chỉ chi tiết *', 'pf-address', addressInput)]),
    el('div', null, { class: 'grid-2' }, [field('Giờ mở cửa mặc định', 'pf-open', openTimeInput), field('Giờ đóng cửa mặc định', 'pf-close', closeTimeInput)]),
    el('p', 'Chọn giờ tròn từ 06:00 đến 22:00; giờ đóng cửa phải sau giờ mở cửa.', { id: 'pf-hours-help', class: 'field-hint' }),
    pitch ? el('label', null, { class: 'checkbox-label text-sm' }, [syncHours, el('span', 'Áp dụng giờ trên cho mọi ngày đang mở trong lịch tuần. Ngày đóng và giá riêng được giữ nguyên.')]) : null,
    el('div', null, { class: 'stack-sm' }, [el('p', 'Tiện ích tại sân', { class: 'font-bold' }), facGrid, el('label', 'Tiện ích khác', { for: 'pf-custom-fac' }), customFacInput]),
    field('Nội quy sân bóng', 'pf-rules', rulesInput),
    photos.element,
    el('div', null, { class: 'row-between' }, [el('a', 'Hủy', { href: 'manager-pitches.html', class: 'button secondary' }), submitButton])
  ]);

  const hours = () => ({ open_time: openTimeInput.value || '06:00', close_time: closeTimeInput.value || '22:00' });

  function validate() {
    const price = priceInput.value.trim() === '' ? NaN : Number(priceInput.value);
    const { open_time, close_time } = hours();
    if (!nameInput.value.trim()) setFieldError(nameInput, 'Vui lòng nhập tên sân bóng.');
    if (!addressInput.value.trim()) setFieldError(addressInput, 'Vui lòng nhập địa chỉ sân bóng.');
    if (!Number.isFinite(price) || price < 50000 || price > 20000000) setFieldError(priceInput, 'Giá mỗi giờ phải từ 50.000 ₫ đến 20.000.000 ₫.');
    if (!/^\d\d:00$/.test(open_time) || open_time < '06:00' || open_time > '22:00') setFieldError(openTimeInput, 'Giờ mở cửa phải là giờ tròn từ 06:00 đến 22:00.');
    if (!/^\d\d:00$/.test(close_time) || close_time < '06:00' || close_time > '22:00') setFieldError(closeTimeInput, 'Giờ đóng cửa phải là giờ tròn từ 06:00 đến 22:00.');
    else if (open_time >= close_time) setFieldError(closeTimeInput, 'Giờ đóng cửa phải sau giờ mở cửa.');
    return !form.querySelector('[aria-invalid="true"]');
  }

  function getPayload() {
    const facilities = [...new Set([
      ...facCheckboxes.filter(cb => cb.checked).map(cb => cb.value),
      ...customFacInput.value.split(',').map(s => s.trim()).filter(Boolean)
    ])];
    return {
      name: nameInput.value.trim(),
      type: typeSelect.value,
      base_price_vnd: Number(priceInput.value),
      city: cityInput.value.trim() || 'Hà Nội',
      district: districtInput.value.trim(),
      address: addressInput.value.trim(),
      ...hours(),
      facilities,
      rules: rulesInput.value.trim(),
      images: photos.getImages()
    };
  }

  return { form, submitButton, syncHours, nameInput, validate, getPayload };
}
