import '../components/site-header.js';
import '../components/site-footer.js';
import { ROLES, requireRole } from '../services/access-control.js';
import { getPitchAvailability, prepareAvailability, updatePitchAvailability } from '../services/availability-service.js';

async function init() {
  await prepareAvailability();
  const user = requireRole([ROLES.MANAGER]);
  if (!user) return;
  const pitchId = new URLSearchParams(location.search).get('pitchId');
  let availability;
  try { availability = getPitchAvailability(user, pitchId); }
  catch { location.replace('403.html'); return; }
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
  document.getElementById('main-content').hidden = false;
}

init().catch(() => { location.replace('403.html'); });
