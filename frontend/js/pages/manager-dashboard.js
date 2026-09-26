import '../components/site-header.js';
import '../components/site-footer.js';
import { ROLES, requireRole } from '../services/access-control.js';
import { preparePitchCatalog, listManagerPitches } from '../services/pitch-service.js';
import { prepareBookingData, listManagerBookings } from '../services/booking-service.js';

async function init() {
  await Promise.all([preparePitchCatalog(), prepareBookingData()]);
  const user = requireRole([ROLES.MANAGER]);
  if (!user) return;
  const pitches = listManagerPitches(user);
  const bookings = pitches.flatMap(pitch => listManagerBookings(user, pitch.id));
  document.getElementById('manager-greeting').textContent = `Xin chào, ${user.displayName}`;
  document.getElementById('active-pitches').textContent = pitches.filter(pitch => pitch.status === 'active').length;
  document.getElementById('inactive-pitches').textContent = pitches.filter(pitch => pitch.status !== 'active').length;
  document.getElementById('upcoming-bookings').textContent = bookings.filter(booking => booking.status === 'Confirmed' && Date.parse(booking.slotStart) > Date.now()).length;
  const firstPitch = pitches[0];
  if (firstPitch) document.getElementById('manager-bookings-link').href = `manager-bookings.html?pitchId=${firstPitch.id}`;
  document.getElementById('main-content').hidden = false;
}

init().catch(() => { location.replace('403.html'); });
