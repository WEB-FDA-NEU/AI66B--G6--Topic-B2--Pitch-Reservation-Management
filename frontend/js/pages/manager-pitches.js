import '../components/site-header.js';
import '../components/site-footer.js';
import { isLoggedIn, getUser } from '../auth.js';
import { MOCK_PITCHES, formatPitchPrice } from '../data/pitches.js';

const main = document.getElementById('main-content');
const getEl = id => document.getElementById(id);

function initPage() {
  // 1. Kiểm tra quyền truy cập (Guard)
  if (!isLoggedIn()) {
    sessionStorage.setItem('app_return_to', location.pathname + location.search);
    location.replace('login.html');
    return;
  }

  const user = getUser();
  if (user && user.role === 'customer') {
    location.replace('403.html'); // Khách hàng không được vào (giả lập lỗi 403 nếu có)
    return;
  }

  // 2. Lấy danh sách sân của riêng Chủ sân này
  // Trong hệ thống mock: user.id của Demo Manager là 1, nhưng ownerId trong pitches.js là 'O001'
  const ownerId = (user.role === 'manager') ? 'O001' : user.id;
  const myPitches = MOCK_PITCHES.filter(p => p.ownerId === ownerId);

  // 3. Render giao diện
  renderPitches(myPitches);

  if (main) main.hidden = false;
}

function renderPitches(pitches) {
  const container = getEl('pitch-list');
  const countEl = getEl('pitch-count');
  const template = getEl('tpl-manager-pitch');
  const emptyTemplate = getEl('tpl-empty-state');
  
  if (!container || !template || !emptyTemplate) return;

  if (countEl) countEl.textContent = `Bạn đang quản lý ${pitches.length} sân`;

  if (pitches.length === 0) {
    container.replaceChildren(emptyTemplate.content.cloneNode(true));
    return;
  }

  const cards = pitches.map(pitch => {
    const node = template.content.cloneNode(true);
    
    // Ảnh & Text
    const img = node.querySelector('.manager-card__img');
    img.src = pitch.image || 'img/placeholder.svg';
    img.alt = pitch.name;

    node.querySelector('.manager-card__title').textContent = pitch.name;
    node.querySelector('.manager-card__meta').textContent = pitch.location;
    node.querySelector('.detail-item.type').textContent = `Loại sân: ${pitch.typeLabel}`;
    node.querySelector('.detail-item.price').textContent = `Giá: ${formatPitchPrice(pitch.price)}`;

    // Trạng thái (Giả lập active cho tất cả, nếu có suspended thì đổi)
    const badge = node.querySelector('#badge-status');
    const isSuspended = pitch.name.includes('Đình chỉ'); // Logic mock tạm
    badge.textContent = isSuspended ? 'Tạm ngưng' : 'Hoạt động';
    badge.className = `badge ${isSuspended ? 'suspended' : 'active'}`;

    // Các nút Actions
    const btnEdit = node.querySelector('.btn-edit');
    const btnAvail = node.querySelector('.btn-availability');
    const btnBookings = node.querySelector('.btn-bookings');

    btnEdit.href = `edit-pitch.html?pitchId=${pitch.id}`;
    btnAvail.href = `pitch-availability.html?pitchId=${pitch.id}`;
    btnBookings.href = `booking-management.html?pitchId=${pitch.id}`;

    return node;
  });

  container.replaceChildren(...cards);
}

initPage();
