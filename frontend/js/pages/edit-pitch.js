import '../components/site-header.js';
import '../components/site-footer.js';
import { ROLES, requireRole } from '../services/access-control.js';
import { getManagedPitch, preparePitchCatalog, setPitchActive, updatePitch } from '../services/pitch-service.js';

const form = document.getElementById('pitch-form');
const feedback = document.getElementById('form-feedback');
const statusButton = document.getElementById('status-button');
let user;
let pitch;

function fillForm() {
  for (const name of ['name', 'type', 'location', 'district', 'price', 'surface', 'description']) form.elements[name].value = pitch[name] ?? '';
  form.elements.services.value = pitch.services.join(', ');
  document.getElementById('pitch-status').textContent = pitch.status === 'active' ? 'Đang nhận lịch mới' : pitch.status === 'deactivated' ? 'Đang tạm ngừng nhận lịch' : 'Sân bị đình chỉ bởi quản trị viên';
  statusButton.hidden = !['active', 'deactivated'].includes(pitch.status);
  statusButton.textContent = pitch.status === 'active' ? 'Tạm ngừng sân' : 'Mở lại sân';
  [...form.elements].forEach(control => { if (control.name) control.disabled = !['active', 'deactivated'].includes(pitch.status); });
}

async function init() {
  await preparePitchCatalog();
  user = requireRole([ROLES.MANAGER]);
  if (!user) return;
  pitch = getManagedPitch(user, new URLSearchParams(location.search).get('pitchId'));
  if (!pitch) { location.replace('403.html'); return; }
  fillForm();
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    try { pitch = updatePitch(user, pitch.id, Object.fromEntries(new FormData(form))); feedback.textContent = 'Đã lưu thông tin sân.'; fillForm(); }
    catch (error) { feedback.textContent = error.message; }
  });
  statusButton.addEventListener('click', () => {
    try { pitch = setPitchActive(user, pitch.id, pitch.status !== 'active'); feedback.textContent = pitch.status === 'active' ? 'Sân đã mở lại.' : 'Sân đã tạm ngừng nhận lịch mới.'; fillForm(); }
    catch (error) { feedback.textContent = error.message; }
  });
  document.getElementById('main-content').hidden = false;
}

init().catch(() => { location.replace('403.html'); });
