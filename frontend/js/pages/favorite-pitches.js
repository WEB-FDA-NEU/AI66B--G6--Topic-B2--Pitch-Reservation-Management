import '../components/site-header.js';
import '../components/site-footer.js';
import { ROLES, requireRole } from '../services/access-control.js';
import { formatPitchPrice } from '../services/pitch-service.js';
import { listFavoritePitches, prepareFavorites, setFavorite } from '../services/favorite-service.js';

const main = document.getElementById('main-content');
const list = document.getElementById('favorite-list');
const template = document.getElementById('tpl-favorite');
const emptyTemplate = document.getElementById('tpl-empty-state');
const count = document.getElementById('favorite-count');
const feedback = document.getElementById('favorite-feedback');
let user;

function render() {
  const pitches = listFavoritePitches(user);
  count.textContent = `${pitches.length} sân đã lưu`;
  if (!pitches.length) {
    list.replaceChildren(emptyTemplate.content.cloneNode(true));
    return;
  }
  list.replaceChildren(...pitches.map(pitch => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.favorite-card');
    const image = node.querySelector('.card__img');
    const link = node.querySelector('a');
    const button = node.querySelector('.favorite-heart-button');
    card.dataset.unavailable = String(pitch.status !== 'active');
    image.src = pitch.image || 'img/placeholder.svg';
    image.alt = `Hình ảnh ${pitch.name}`;
    node.querySelector('.card__title').textContent = pitch.name;
    node.querySelector('.favorite-status').textContent = pitch.status === 'active' ? 'Đang mở' : 'Không khả dụng';
    node.querySelector('.card__meta').textContent = pitch.location;
    node.querySelector('.card__price').textContent = formatPitchPrice(pitch.price);
    link.href = `pitch-detail.html?pitchId=${encodeURIComponent(pitch.id)}`;
    button.setAttribute('aria-label', `Bỏ ${pitch.name} khỏi danh sách yêu thích`);
    button.addEventListener('click', () => {
      setFavorite(user, pitch.id, false);
      feedback.textContent = `Đã bỏ lưu ${pitch.name}.`;
      render();
    });
    return node;
  }));
}

async function init() {
  await prepareFavorites();
  user = requireRole([ROLES.CUSTOMER]);
  if (!user) return;
  main.hidden = false;
  render();
}

init().catch(() => { location.replace('403.html'); });
