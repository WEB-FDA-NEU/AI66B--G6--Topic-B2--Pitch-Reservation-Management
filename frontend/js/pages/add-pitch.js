import '../components/site-header.js';
import '../components/site-footer.js';
import { ROLES, requireRole } from '../services/access-control.js';
import { createPitch, preparePitchCatalog } from '../services/pitch-service.js';

async function init() {
  await preparePitchCatalog();
  const user = requireRole([ROLES.MANAGER]);
  if (!user) return;
  const form = document.getElementById('pitch-form');
  const feedback = document.getElementById('form-feedback');
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      const values = Object.fromEntries(new FormData(form));
      const pitch = createPitch(user, values);
      location.assign(`edit-pitch.html?pitchId=${pitch.id}`);
    } catch (error) {
      feedback.textContent = error.message;
    }
  });
  document.getElementById('main-content').hidden = false;
}

init().catch(() => { location.replace('403.html'); });
