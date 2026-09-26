import '../components/site-header.js';
import '../components/site-footer.js';
import { ROLES, requireRole } from '../services/access-control.js';
import { formatPitchPrice, listManagerPitches, preparePitchCatalog } from '../services/pitch-service.js';

const statusLabels = { active: 'Đang mở', deactivated: 'Tạm ngừng', suspended: 'Đình chỉ', 'permanently-suspended': 'Đình chỉ vĩnh viễn' };

async function init() {
  await preparePitchCatalog();
  const user = requireRole([ROLES.MANAGER]);
  if (!user) return;
  const pitches = listManagerPitches(user);
  const template = document.getElementById('tpl-manager-pitch');
  const nodes = pitches.map(pitch => {
    const node = template.content.cloneNode(true);
    const image = node.querySelector('img');
    image.src = pitch.image || 'img/placeholder.svg'; image.alt = `Hình ảnh ${pitch.name}`;
    node.querySelector('h2').textContent = pitch.name;
    node.querySelector('.manager-pitch-title span').textContent = statusLabels[pitch.status] ?? pitch.status;
    node.querySelector('.manager-pitch-meta').textContent = `${pitch.typeLabel} · ${pitch.location}`;
    node.querySelector('.manager-pitch-price').textContent = formatPitchPrice(pitch.price);
    node.querySelector('[data-link="edit"]').href = `edit-pitch.html?pitchId=${pitch.id}`;
    node.querySelector('[data-link="availability"]').href = `pitch-availability.html?pitchId=${pitch.id}`;
    node.querySelector('[data-link="bookings"]').href = `manager-bookings.html?pitchId=${pitch.id}`;
    return node;
  });
  document.getElementById('pitch-count').textContent = `${pitches.length} sân`;
  document.getElementById('pitch-list').replaceChildren(...nodes);
  document.getElementById('main-content').hidden = false;
}

init().catch(() => { location.replace('403.html'); });
