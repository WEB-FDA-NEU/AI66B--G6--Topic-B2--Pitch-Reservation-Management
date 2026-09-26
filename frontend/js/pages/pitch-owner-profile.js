import '../components/site-header.js';
import '../components/site-footer.js';
import { formatPitchPrice, getOwnerProfile, preparePitchCatalog } from '../services/pitch-service.js';

const statusLabels = { active: 'Đang hoạt động', deactivated: 'Tạm ngừng', suspended: 'Đình chỉ', 'permanently-suspended': 'Đình chỉ vĩnh viễn' };
const state = document.getElementById('page-state');
const content = document.getElementById('profile-content');
const list = document.getElementById('owner-pitches');
const template = document.getElementById('tpl-owner-pitch');

function renderPitch(pitch) {
  const node = template.content.cloneNode(true);
  const card = node.querySelector('.owner-pitch-card');
  const link = node.querySelector('.card__link');
  const image = node.querySelector('.card__img');
  card.dataset.unavailable = String(pitch.status !== 'active');
  link.href = `pitch-detail.html?pitchId=${encodeURIComponent(pitch.id)}`;
  image.src = pitch.image || 'img/placeholder.svg';
  image.alt = `Hình ảnh ${pitch.name}`;
  node.querySelector('.card__title').textContent = pitch.name;
  node.querySelector('.owner-pitch-status').textContent = statusLabels[pitch.status] ?? pitch.status;
  node.querySelector('.card__meta').textContent = pitch.location;
  node.querySelector('.card__type').textContent = pitch.typeLabel;
  node.querySelector('.card__price').textContent = formatPitchPrice(pitch.price);
  return node;
}

async function init() {
  await preparePitchCatalog();
  const ownerId = new URLSearchParams(location.search).get('ownerId');
  const owner = getOwnerProfile(ownerId);
  if (!owner) {
    state.textContent = 'Không tìm thấy hồ sơ chủ sân phù hợp.';
    return;
  }
  document.title = `${owner.name} — Pitch Point`;
  document.getElementById('owner-name').textContent = owner.name;
  document.getElementById('owner-description').textContent = owner.description;
  document.getElementById('owner-rating').textContent = `★ ${owner.rating.toFixed(1)}`;
  document.getElementById('owner-count').textContent = String(owner.pitchCount);
  document.getElementById('owner-status').textContent = owner.status === 'active' ? 'Đã xác thực' : 'Tạm hạn chế';
  list.replaceChildren(...owner.pitches.map(renderPitch));
  state.hidden = true;
  content.hidden = false;
}

init().catch(() => { state.textContent = 'Không thể tải hồ sơ chủ sân lúc này.'; });
