import '../components/site-header.js';
import '../components/site-footer.js';
import { ROLES, requireRole } from '../services/access-control.js';
import {
  getPitchAvailability,
  prepareAvailability,
  removeAvailabilityOverride,
  saveAvailabilityOverride,
  updatePitchAvailability,
} from '../services/availability-service.js';
import { formatVND } from '../render.js';

function renderOverrides(availability, user) {
  const list = document.getElementById('override-list');
  const template = document.getElementById('tpl-override');
  const empty = document.getElementById('override-empty');
  const overrides = [...availability.overrides].sort((a, b) => Date.parse(a.slotStart) - Date.parse(b.slotStart));
  empty.hidden = overrides.length > 0;
  list.replaceChildren(...overrides.map(override => {
    const node = template.content.cloneNode(true);
    node.querySelector('.override-item__time').textContent = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(override.slotStart));
    node.querySelector('.override-item__status').textContent = override.status === 'available' ? 'Mở riêng' : 'Đã đóng';
    node.querySelector('.override-item__price').textContent = override.price ? `Giá riêng: ${formatVND(override.price)}` : 'Dùng giá mặc định';
    node.querySelector('button').addEventListener('click', () => {
      const feedback = document.getElementById('override-feedback');
      try {
        availability = removeAvailabilityOverride(user, availability.pitch.id, override.id);
        feedback.textContent = 'Đã xoá điều chỉnh khung giờ.';
        renderOverrides(availability, user);
      } catch (error) { feedback.textContent = error.message; }
    });
    return node;
  }));
}

async function init() {
  await prepareAvailability();
  const user = requireRole([ROLES.MANAGER]);
  if (!user) return;
  const pitchId = new URLSearchParams(location.search).get('pitchId');
  if (!pitchId) { location.replace('404.html'); return; }
  let availability;
  try { availability = getPitchAvailability(user, pitchId); }
  catch { location.replace('404.html'); return; }
  document.getElementById('pitch-name').textContent = availability.pitch.name;
  document.getElementById('open-time').value = availability.operatingHours.open;
  document.getElementById('close-time').value = availability.operatingHours.close;
  document.querySelectorAll('#weekday-grid input').forEach(input => { input.checked = availability.openWeekdays.includes(Number(input.value)); });
  const form = document.getElementById('availability-form');
  const feedback = document.getElementById('form-feedback');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const openWeekdays = [...document.querySelectorAll('#weekday-grid input:checked')].map(input => Number(input.value));
    try {
      availability = updatePitchAvailability(user, pitchId, { open: form.elements.open.value, close: form.elements.close.value, openWeekdays });
      feedback.textContent = 'Đã lưu lịch hoạt động của sân.';
    } catch (error) { feedback.textContent = error.message; }
  });
  const overrideForm = document.getElementById('override-form');
  const overrideFeedback = document.getElementById('override-feedback');
  const dateInput = overrideForm.elements.date;
  const today = new Date();
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 30);
  const toDateValue = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  dateInput.min = toDateValue(today);
  dateInput.max = toDateValue(limit);
  overrideForm.addEventListener('submit', event => {
    event.preventDefault();
    try {
      availability = saveAvailabilityOverride(user, pitchId, Object.fromEntries(new FormData(overrideForm)));
      overrideFeedback.textContent = 'Đã lưu điều chỉnh khung giờ.';
      overrideForm.reset();
      renderOverrides(availability, user);
    } catch (error) { overrideFeedback.textContent = error.message; }
  });
  renderOverrides(availability, user);
  document.getElementById('main-content').hidden = false;
}

init().catch(() => { location.replace('404.html'); });
