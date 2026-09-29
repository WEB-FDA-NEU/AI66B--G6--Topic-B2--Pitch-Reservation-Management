import '../components/site-header.js';
import '../components/site-footer.js';

const notifications = [
  { notificationId:'N001', category:'booking', label:'Đặt sân', title:'Đặt sân đã được xác nhận', description:'Sân Bách Khoa · 26/09, 18:00–19:30 đã sẵn sàng cho bạn.', timestamp:'10 phút trước', unread:true, href:'search.html' },
  { notificationId:'N002', category:'message', label:'Tin nhắn', title:'Bạn có tin nhắn mới', description:'Quản lý sân Bách Khoa vừa gửi tin nhắn cho bạn.', timestamp:'1 giờ trước', unread:true, href:'messages.html?conversationId=C001' },
  { notificationId:'N003', category:'payment', label:'Thanh toán', title:'Thanh toán mô phỏng đã hoàn tất', description:'Giao dịch cho booking BK-240926-18 đã được ghi nhận.', timestamp:'Hôm qua', unread:false },
  { notificationId:'N004', category:'account', label:'Tài khoản', title:'Hãy cập nhật thông tin liên hệ', description:'Kiểm tra email và số điện thoại để dễ nhận hỗ trợ.', timestamp:'2 ngày trước', unread:true, href:'account-settings.html' },
  { notificationId:'N005', category:'pitch-status', label:'Trạng thái sân', title:'Sân yêu thích đã cập nhật thông tin', description:'Sân Tây Hồ Arena vừa cập nhật giờ hoạt động.', timestamp:'3 ngày trước', unread:false, href:'search.html' },
];

const root = document.querySelector('.notifications-page');
const list = root?.querySelector('[data-list]');
const error = root?.querySelector('[data-error]');
let activeFilter = 'all';
const notificationId = new URLSearchParams(location.search).get('notificationId');

function render() {
  const visible = notifications.filter(item => activeFilter === 'all' || item.unread);
  list.replaceChildren();
  if (!visible.length) { const state = document.createElement('p'); state.className = 'notifications-state'; state.textContent = activeFilter === 'unread' ? 'Bạn đã đọc tất cả thông báo.' : 'Chưa có thông báo nào.'; list.append(state); return; }
  visible.forEach(item => {
    const article = document.createElement('article'); article.className = `notification-item${item.unread ? ' is-unread' : ''}`; article.dataset.notificationId = item.notificationId;
    const icon = document.createElement('span'); icon.className = 'notification-icon'; icon.setAttribute('aria-hidden','true'); icon.textContent = item.category === 'message' ? '✉' : item.category === 'account' ? '●' : '✓';
    const body = document.createElement('div'); const title = document.createElement('h3'); title.className = 'notification-item__title'; title.textContent = item.title; const description = document.createElement('p'); description.className = 'notification-item__description'; description.textContent = item.description; const meta = document.createElement('div'); meta.className = 'notification-item__meta'; const category = document.createElement('span'); category.className = 'notification-item__category'; category.textContent = item.label; const time = document.createElement('time'); time.textContent = item.timestamp; meta.append(category,time); if (item.href) { const link = document.createElement('a'); link.className = 'notification-item__link'; link.href = item.href; link.textContent = 'Xem liên quan'; meta.append(link); } body.append(title,description,meta);
    const actions = document.createElement('div'); actions.className = 'notification-item__actions'; if (item.unread) { const dot = document.createElement('span'); dot.className = 'notification-item__unread'; dot.setAttribute('aria-label','Chưa đọc'); const button = document.createElement('button'); button.className = 'notification-item__read'; button.type = 'button'; button.textContent = 'Đánh dấu đã đọc'; button.addEventListener('click', () => { item.unread = false; render(); }); actions.append(dot,button); } else { const read = document.createElement('span'); read.className = 'field__hint'; read.textContent = 'Đã đọc'; actions.append(read); } article.append(icon,body,actions); list.append(article);
    if (item.notificationId === notificationId) article.tabIndex = -1;
  });
}
function setFilter(filter) { activeFilter = filter; root.querySelectorAll('[data-filter]').forEach(button => { const active = button.dataset.filter === filter; button.classList.toggle('is-active',active); button.setAttribute('aria-pressed',String(active)); }); render(); }
function load() { list.replaceChildren(); const state = document.createElement('p'); state.className = 'notifications-state'; state.textContent = 'Đang tải thông báo…'; list.append(state); window.setTimeout(() => { error.hidden = true; render(); }, 120); }
root?.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
root?.querySelector('[data-mark-all]')?.addEventListener('click', () => { notifications.forEach(item => { item.unread = false; }); render(); });
root?.querySelector('[data-retry]')?.addEventListener('click', load);
load();
