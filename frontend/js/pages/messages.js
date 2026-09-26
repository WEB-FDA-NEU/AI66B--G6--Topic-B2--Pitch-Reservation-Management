import '../components/site-header.js';
import '../components/site-footer.js';

const currentUserId = 'customer-001';
const conversations = [
  { conversationId: 'C001', participantName: 'Sân Bách Khoa', participantRole: 'Quản lý sân', latestMessage: 'Anh/chị có thể xác nhận giờ đá giúp em không?', latestMessageAt: '10:42', unreadCount: 2, context: ['Sân Bách Khoa', 'BK-240926-18', '26/09 · 18:00–19:30'], messages: [{ senderId: 'manager-001', content: 'Chào bạn, sân đã sẵn sàng cho khung giờ 18:00.', sentAt: '10:30' }, { senderId: currentUserId, content: 'Anh/chị có thể xác nhận giờ đá giúp em không?', sentAt: '10:42' }] },
  { conversationId: 'C002', participantName: 'Sân Tây Hồ Arena', participantRole: 'Quản lý sân', latestMessage: 'Bạn có thể xem hướng dẫn đến sân trong phần chi tiết.', latestMessageAt: 'Hôm qua', unreadCount: 0, context: ['Tây Hồ Arena', 'TH-240925-20', '25/09 · 20:00–21:30'], messages: [{ senderId: 'manager-002', content: 'Bạn có thể xem hướng dẫn đến sân trong phần chi tiết.', sentAt: 'Hôm qua' }] },
  { conversationId: 'C003', participantName: 'Sân Long Biên', participantRole: 'Quản lý sân', latestMessage: 'Cảm ơn bạn đã liên hệ.', latestMessageAt: 'Thứ 2', unreadCount: 0, context: ['Sân Long Biên', 'LB-240923-16', '23/09 · 16:00–17:30'], messages: [{ senderId: currentUserId, content: 'Mình muốn hỏi về khu vực gửi xe.', sentAt: 'Thứ 2' }, { senderId: 'manager-003', content: 'Cảm ơn bạn đã liên hệ.', sentAt: 'Thứ 2' }] },
];

const root = document.querySelector('[data-messages-app]');
const list = root?.querySelector('[data-list]');
const empty = root?.querySelector('[data-empty]');
const view = root?.querySelector('[data-view]');
let selectedId = new URLSearchParams(location.search).get('conversationId');

const initials = name => name.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase();
const showText = (element, value) => { element.textContent = value; };

function renderList() {
  const query = root.querySelector('[data-search]').value.trim().toLowerCase();
  const visible = conversations.filter(item => `${item.participantName} ${item.latestMessage} ${item.context.join(' ')}`.toLowerCase().includes(query));
  showText(root.querySelector('[data-count]'), String(visible.length));
  list.replaceChildren();
  if (!visible.length) { const state = document.createElement('p'); state.className = 'messages-state'; showText(state, 'Không có cuộc trò chuyện phù hợp.'); list.append(state); return; }
  visible.forEach(item => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `conversation-item${item.conversationId === selectedId ? ' is-active' : ''}`;
    const avatar = document.createElement('span'); avatar.className = 'avatar'; avatar.setAttribute('aria-hidden', 'true'); showText(avatar, initials(item.participantName));
    const body = document.createElement('span'); body.className = 'conversation-item__body';
    const top = document.createElement('span'); top.className = 'conversation-item__top'; const name = document.createElement('span'); name.className = 'conversation-item__name'; showText(name, item.participantName); const time = document.createElement('time'); time.className = 'conversation-item__time'; showText(time, item.latestMessageAt); top.append(name, time);
    const bottom = document.createElement('span'); bottom.className = 'conversation-item__bottom'; const preview = document.createElement('span'); preview.className = 'conversation-item__preview'; showText(preview, item.latestMessage); bottom.append(preview); body.append(top, bottom); button.append(avatar, body);
    if (item.unreadCount) { const unread = document.createElement('span'); unread.className = 'conversation-item__unread'; showText(unread, item.unreadCount > 9 ? '9+' : String(item.unreadCount)); unread.setAttribute('aria-label', `${item.unreadCount} tin chưa đọc`); button.append(unread); }
    button.addEventListener('click', () => selectConversation(item.conversationId)); list.append(button);
  });
}

function renderMessages(item) {
  const history = root.querySelector('[data-history]'); history.replaceChildren();
  item.messages.forEach(message => { const article = document.createElement('article'); article.className = `message${message.senderId === currentUserId ? ' is-outgoing' : ''}`; const content = document.createElement('p'); content.className = 'message__content'; showText(content, message.content); const time = document.createElement('time'); time.className = 'message__time'; showText(time, message.sentAt); article.append(content, time); history.append(article); });
  history.scrollTop = history.scrollHeight;
}

function showEmpty() { root.classList.remove('has-selection'); empty.hidden = false; view.hidden = true; root.querySelector('[data-error]').hidden = true; renderList(); }
function selectConversation(id) { const item = conversations.find(value => value.conversationId === id); if (!item) { showEmpty(); return; } selectedId = id; item.unreadCount = 0; root.classList.add('has-selection'); empty.hidden = true; view.hidden = false; root.querySelector('[data-error]').hidden = true; showText(root.querySelector('[data-avatar]'), initials(item.participantName)); showText(root.querySelector('[data-name]'), item.participantName); showText(root.querySelector('[data-role]'), item.participantRole); const context = root.querySelector('[data-context]'); context.replaceChildren(...item.context.map(value => { const chip = document.createElement('span'); chip.className = 'context-chip'; showText(chip, value); return chip; })); renderMessages(item); renderList(); }
function load() { list.replaceChildren(); const state = document.createElement('p'); state.className = 'messages-state'; showText(state, 'Đang tải cuộc trò chuyện…'); list.append(state); window.setTimeout(() => { renderList(); if (conversations.some(item => item.conversationId === selectedId)) selectConversation(selectedId); else showEmpty(); }, 120); }

root?.querySelector('[data-search]')?.addEventListener('input', renderList);
root?.querySelector('[data-back]')?.addEventListener('click', showEmpty);
root?.querySelector('[data-retry]')?.addEventListener('click', load);
root?.querySelector('[data-composer]')?.addEventListener('submit', event => { event.preventDefault(); const textarea = event.currentTarget.querySelector('textarea'); const content = textarea.value.trim(); if (!content || !selectedId) return; const item = conversations.find(value => value.conversationId === selectedId); if (!item) return; item.messages.push({ senderId: currentUserId, content, sentAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }); item.latestMessage = content; item.latestMessageAt = 'Vừa xong'; textarea.value = ''; renderMessages(item); renderList(); });
load();
