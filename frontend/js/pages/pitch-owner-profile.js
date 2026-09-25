import { MOCK_OWNERS } from '../data/owners.js';
import { MOCK_PITCHES, formatPitchPrice } from '../data/pitches.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const ownerIdParam = new URLSearchParams(location.search).get('ownerId');
const main = document.getElementById('main-content');
const getEl = id => document.getElementById(id);

function loadOwnerProfile() {
  if (!ownerIdParam) { location.href = '404.html'; return; }
  const owner = MOCK_OWNERS.find(o => o.id === ownerIdParam);
  if (!owner) { location.href = '404.html'; return; }

  document.title = 'Hồ sơ ' + owner.name + ' — Pitch Point';
  getEl('owner-name').textContent = owner.name;
  getEl('owner-rating').textContent = '★ ' + owner.rating.toFixed(1);
  getEl('owner-description').textContent = owner.description;
  getEl('owner-manager').textContent = owner.managerName;
  getEl('owner-joined').textContent = owner.joinDate;
  
  if (owner.verified) {
    getEl('owner-verified').textContent = 'Đã xác thực';
    getEl('owner-verified').className = 'badge badge--success';
  } else {
    getEl('owner-verified').textContent = 'Chưa xác thực';
    getEl('owner-verified').className = 'badge badge--neutral';
  }

  const contactBtn = getEl('btn-contact-manager');
  contactBtn.href = 'user-messages.html?managerId=' + owner.managerId;

  const ownerPitches = MOCK_PITCHES.filter(p => p.ownerId === owner.id);
  getEl('pitch-count').textContent = ownerPitches.length + ' sân bóng';
  renderPitches(ownerPitches);
  main.hidden = false;
}

function renderPitches(pitches) {
  const container = getEl('owner-pitches');
  const template = getEl('tpl-card');
  const emptyTemplate = getEl('tpl-empty-state');
  if (pitches.length === 0) {
    container.replaceChildren(emptyTemplate.content.cloneNode(true));
    return;
  }
  const cards = pitches.map(pitch => {
    const node = template.content.cloneNode(true);
    const link = node.querySelector('.card__link');
    const image = node.querySelector('.card__img');
    const favoriteButton = node.querySelector('.card__favorite');
    const rating = node.querySelector('.card__rating');
    link.href = 'pitch-detail.html?pitchId=' + pitch.id;
    link.setAttribute('aria-label', 'Xem chi tiết ' + pitch.name);
    image.src = pitch.image || 'img/placeholder.svg';
    image.alt = 'Hình ảnh minh họa ' + pitch.name;
    node.querySelector('.card__title').textContent = pitch.name;
    node.querySelector('.card__meta').textContent = pitch.location;
    node.querySelector('.card__type').textContent = pitch.typeLabel;
    node.querySelector('.card__price').textContent = formatPitchPrice(pitch.price);
    rating.textContent = '★ ' + pitch.rating.toFixed(1);
    rating.setAttribute('aria-label', pitch.rating.toFixed(1) + ' trên 5 sao');
    node.querySelector('.card__badge').textContent = pitch.badge;
    favoriteButton.setAttribute('aria-label', 'Thêm ' + pitch.name + ' vào danh sách yêu thích');
    return node;
  });
  container.replaceChildren(...cards);
}
loadOwnerProfile();
