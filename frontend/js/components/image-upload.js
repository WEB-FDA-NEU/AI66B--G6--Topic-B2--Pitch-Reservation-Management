import { api } from '../services/api-client.js';
import { el } from '../core/render.js';

export const PITCH_IMAGE_LIMIT = 3;
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 750;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

async function loadImage(file) {
  if (globalThis.createImageBitmap) return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function fileToCardImage(file) {
  if (!ACCEPTED.includes(file.type)) throw new Error('Chỉ nhận ảnh JPG, PNG hoặc WebP.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 10 MB.');
  let source;
  try {
    source = await loadImage(file);
  } catch {
    throw new Error('Không đọc được ảnh này. Vui lòng chọn ảnh khác.');
  }
  const sw = source.width, sh = source.height;
  const ratio = OUTPUT_WIDTH / OUTPUT_HEIGHT;
  let cw = sw, ch = Math.round(sw / ratio);
  if (ch > sh) { ch = sh; cw = Math.round(sh * ratio); }
  const draw = (scale) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cw * scale));
    canvas.height = Math.max(1, Math.round(ch * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, Math.round((sw - cw) / 2), Math.round((sh - ch) / 2), cw, ch, 0, 0, canvas.width, canvas.height);
    return canvas;
  };
  try {
    let scale = Math.min(1, OUTPUT_WIDTH / cw);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const canvas = draw(scale);
      for (const quality of [0.8, 0.7, 0.6]) {
        const url = canvas.toDataURL('image/jpeg', quality);
        if (dataUrlBytes(url) <= MAX_UPLOAD_BYTES) return url;
      }
      scale *= 0.8;
    }
  } finally {
    source.close?.();
  }
  throw new Error('Ảnh có quá nhiều chi tiết nên không nén được. Vui lòng chọn ảnh khác.');
}

const MAX_UPLOAD_BYTES = 450 * 1024;

function dataUrlBytes(url) {
  const base64 = url.slice(url.indexOf(',') + 1);
  return Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
}

export function createImageUpload({ id, images = [] }) {
  let current = images.filter(Boolean).slice(0, PITCH_IMAGE_LIMIT);
  const input = el('input', null, { id, type: 'file', accept: ACCEPTED.join(','), multiple: true, class: 'image-upload-input', 'aria-describedby': `${id}-help` });
  const status = el('p', '', { class: 'field-hint', role: 'status', 'aria-live': 'polite' });
  const list = el('ul', null, { class: 'image-upload-list', 'aria-label': 'Ảnh sân đã chọn' });

  function focusAfterRender(index) {
    const target = index >= 0 ? list.children[index]?.querySelector('button:last-child') : null;
    (target || input).focus();
  }

  function render() {
    list.replaceChildren(...current.map((src, index) => {
      const cover = index === 0;
      const remove = el('button', 'Xóa', { type: 'button', class: 'button secondary sm', 'aria-label': `Xóa ảnh ${index + 1}` });
      remove.addEventListener('click', () => {
        current.splice(index, 1);
        status.textContent = `Đã xóa ảnh ${index + 1}.`;
        render();
        focusAfterRender(Math.min(index, current.length - 1));
      });
      const makeCover = el('button', 'Đặt làm ảnh bìa', { type: 'button', class: 'button secondary sm', 'aria-label': `Đặt ảnh ${index + 1} làm ảnh bìa` });
      makeCover.addEventListener('click', () => {
        current.unshift(...current.splice(index, 1));
        status.textContent = `Ảnh ${index + 1} đã thành ảnh bìa.`;
        render();
        focusAfterRender(0);
      });
      return el('li', null, { class: 'image-upload-item' }, [
        el('img', null, { src, alt: cover ? 'Ảnh bìa của sân' : `Ảnh sân ${index + 1}`, class: 'image-upload-thumb' }),
        cover ? el('span', 'Ảnh bìa', { class: 'badge badge--success image-upload-cover' }) : null,
        el('div', null, { class: 'image-upload-actions' }, [cover ? null : makeCover, remove])
      ]);
    }));
    input.disabled = current.length >= PITCH_IMAGE_LIMIT;
  }

  input.addEventListener('change', async () => {
    const files = [...input.files];
    input.value = '';
    if (!files.length) return;
    status.textContent = 'Đang xử lý ảnh…';
    const errors = [];
    let added = 0;
    let skipped = 0;
    for (const file of files) {
      if (current.length >= PITCH_IMAGE_LIMIT) { skipped += 1; continue; }
      try {
        const image = await fileToCardImage(file);
        const { url } = await api.integrations.Core.UploadPublicFile({ image });
        current.push(url);
        added += 1;
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }
    render();
    const notes = [];
    if (added) notes.push(`Đã thêm ${added} ảnh.`);
    if (errors.length) notes.push(errors.join(' '));
    if (skipped > 0) notes.push(`Mỗi sân có tối đa ${PITCH_IMAGE_LIMIT} ảnh nên ${skipped} ảnh không được thêm.`);
    status.textContent = notes.join(' ');
  });

  render();
  const element = el('div', null, { class: 'field-group image-upload' }, [
    el('label', 'Ảnh sân', { for: id }),
    input,
    el('p', `Tối đa ${PITCH_IMAGE_LIMIT} ảnh JPG, PNG hoặc WebP. Ảnh đầu tiên là ảnh bìa.`, { id: `${id}-help`, class: 'field-hint' }),
    list,
    status
  ]);
  return { element, getImages: () => [...current] };
}
