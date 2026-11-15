import { api } from '../services/api-client.js';
import { toast, clearFieldErrors, setFieldError, mountDashboardShell, updateLiquidIndicator, replaceChildrenPreservingIndicator, createIcon } from '../core/ui.js';
import { el, formatDate, relativeTime, appRole, buildAvatar, bookingStatusText, ROLE_LABELS, reportsBackLink, staffBackLink } from '../core/render.js';
import { $, ensureAuthenticated, params, say, bootCustomerPage } from '../features/customer-kit.js';

const SUPPORT_NAME = 'Quản trị viên Pitch Point';
const MESSAGE_POLL_MS = 3000;
const touchScreen = matchMedia('(hover: none)');
const softFocus = (element, options) => { if (element && !touchScreen.matches) element.focus(options); };
const isSupport = c => c?.kind === 'support';
const ROLE_VIEW = {
  customer: {
    conversationFilters: u => [{ customer_id: u.id }],
    listLabel: c => (isSupport(c) ? SUPPORT_NAME : c.manager_name || 'Chủ sân'),
    canSend: () => true,
    canWarnCustomer: false,
    canMessageAdmin: true,
    dashboardShell: false
  },
  manager: {
    conversationFilters: u => [{ manager_id: u.id }, { kind: 'support', customer_id: u.id }],
    listLabel: c => (isSupport(c) ? SUPPORT_NAME : c.customer_name || 'Khách hàng'),
    canSend: () => true,
    canWarnCustomer: true,
    canMessageAdmin: true,
    dashboardShell: true
  },
  admin: {
    conversationFilters: () => [{}],
    listLabel: c => (isSupport(c) ? c.customer_name || 'Người dùng' : `${c.customer_name || 'Khách'} ↔ ${c.manager_name || 'Chủ sân'}`),
    canSend: c => isSupport(c),
    canWarnCustomer: false,
    canMessageAdmin: false,
    dashboardShell: true
  }
};

async function loadConversations(view, u) {
  const groups = await Promise.all(view.conversationFilters(u).map(f => api.entities.Conversation.filter(f, { sort: '-last_message_at', limit: 500 })));
  const byId = new Map();
  for (const c of groups.flatMap(g => g.items || [])) byId.set(c.id, c);
  return [...byId.values()].sort((a, b) => String(b.last_message_at || b.created_date).localeCompare(String(a.last_message_at || a.created_date)));
}

async function renderMessagesPage() {
  const main = $('#main');
  if (!main) return;
  main.className = 'container stack-lg';
  const u = await ensureAuthenticated();
  if (!u) return;
  const role = appRole(u);
  const view = ROLE_VIEW[role] || ROLE_VIEW.customer;

  const [initialConvs, initialUpdates] = await Promise.all([loadConversations(view, u), api.updates().catch(() => null)]);
  let convs = initialConvs;
  let updatesCursor = initialUpdates?.server_time || null;
  const userRoles = new Map();
  if (role === 'admin') {
    const users = (await api.entities.User.filter({}, { limit: 5000 })).items || [];
    for (const x of users) userRoles.set(x.id, x.app_role);
  }
  let selectedId = params.get('conversationId') || null;
  let draft = null;
  const draftPitchId = params.get('pitchId');
  const draftBookingId = params.get('bookingId');
  const draftUserId = role === 'admin' ? params.get('userId') : null;
  const draftToAdmin = role !== 'admin' && params.get('to') === 'admin';
  if (draftUserId || draftToAdmin) {
    const targetId = draftUserId || u.id;
    const existing = convs.find(c => isSupport(c) && c.customer_id === targetId);
    if (existing) selectedId = existing.id;
    else {
      let target = draftToAdmin ? u : null;
      if (draftUserId) { try { target = await api.entities.User.get(draftUserId); } catch { target = null; } }
      if (target && target.app_role !== 'admin') {
        draft = { id: '__draft__', kind: 'support', customer_id: target.id, customer_name: target.full_name || target.email, manager_name: SUPPORT_NAME, pitch_id: '' };
        userRoles.set(target.id, target.app_role);
        selectedId = draft.id;
      }
    }
  } else if (draftBookingId || (draftPitchId && role === 'customer')) {
    try {
      const booking = draftBookingId ? await api.entities.Booking.get(draftBookingId) : null;
      const pitch = await api.entities.Pitch.get(booking?.pitch_id || draftPitchId);
      const customerId = booking?.customer_id || u.id;
      if ((role === 'customer' && customerId === u.id) || (role === 'manager' && booking?.manager_id === u.id && pitch.manager_id === u.id)) {
        const existing = convs.find(c => c.customer_id === customerId && c.manager_id === pitch.manager_id && c.pitch_id === pitch.id);
        if (existing) selectedId = existing.id;
        else {
          draft = { id: '__draft__', customer_id: customerId, customer_name: booking?.customer_name || u.full_name, manager_id: pitch.manager_id, manager_name: pitch.manager_name, pitch_id: pitch.id, pitch_name: pitch.name };
          selectedId = draft.id;
        }
      }
    } catch { }
  }

  const hasInitialThread = Boolean(params.get('conversationId') || draftBookingId || (draftPitchId && role === 'customer') || draft || draftToAdmin || draftUserId);
  let mobileView = hasInitialThread ? 'thread' : 'list';

  const layout = el('div', null, { class: 'messages-layout', 'data-mobile-view': mobileView });
  const leftCol = el('section', null, { class: 'surface stack-sm messages-list-pane' }, [
    el('div', null, { class: 'row-between' }, [
      el('h2', 'Hội thoại', { utility: 'u-font-size-1p1rem u-margin-0' }),
      el('span', `${convs.length} cuộc trò chuyện`, { class: 'text-xs muted', 'data-conversation-count': '' })
    ]),
    view.canMessageAdmin
      ? el('a', 'Nhắn quản trị viên', { href: 'messages.html?to=admin', class: 'button secondary sm', id: 'message-admin' })
      : el('a', 'Nhắn tin cho người dùng', { href: 'admin-users.html', class: 'button secondary sm' }),
    el('div', null, { id: 'conversations' })
  ]);
  const convListEl = leftCol.querySelector('#conversations');

  function selectAdminThread() {
    const existing = convs.find(c => isSupport(c) && c.customer_id === u.id);
    if (existing) {
      selectedId = existing.id;
      return `messages.html?conversationId=${encodeURIComponent(existing.id)}`;
    }
    draft = { id: '__draft__', kind: 'support', customer_id: u.id, customer_name: u.full_name || u.email, manager_name: SUPPORT_NAME, pitch_id: '' };
    selectedId = draft.id;
    return 'messages.html?to=admin';
  }

  leftCol.querySelector('#message-admin')?.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const enteringMobileThread = mobileView === 'list' && matchMedia('(max-width: 1023px)').matches;
    const url = selectAdminThread();
    mobileView = 'thread';
    if (enteringMobileThread) history.pushState({ ...history.state, pitchPointThread: true }, '', url);
    else history.replaceState(history.state, '', url);
    renderThread().then(() => {
      if (mobileView === 'thread' && matchMedia('(max-width: 1023px)').matches) softFocus(rightCol, { preventScroll: true });
      softFocus(rightCol.querySelector('#message-body'), { preventScroll: true });
    }).catch(error => say(error.message || 'Không tải được hội thoại.'));
  });

  const rightCol = el('section', null, { id: 'thread', class: 'surface stack messages-thread-pane', tabindex: '-1', 'aria-label': 'Nội dung hội thoại' });
  const warnDialog = el('dialog', null, { 'aria-label': 'Cảnh cáo khách hàng' });
  let threadRenderVersion = 0;

  let liveThread = null;

  // Avatar của người bên kia trong hội thoại.
  function counterpartAvatar(conv, size = 'sm') {
    if (role === 'admin') {
      if (isSupport(conv)) return buildAvatar({ id: conv.customer_id, name: conv.customer_name }, { size, role: userRoles.get(conv.customer_id) || 'customer' });
      return buildAvatar({ id: conv.customer_id, name: conv.customer_name }, { size, role: 'customer' });
    }
    if (isSupport(conv)) return buildAvatar({ id: 'support', name: SUPPORT_NAME }, { size, role: 'admin' });
    return role === 'customer'
      ? buildAvatar({ id: conv.manager_id, name: conv.manager_name }, { size, role: 'manager' })
      : buildAvatar({ id: conv.customer_id, name: conv.customer_name }, { size, role: 'customer' });
  }

  // Admin: tab "Hỗ trợ" và "Khách ↔ chủ sân" (chỉ xem).
  let adminTab = null;
  const adminTabs = role === 'admin' ? el('div', null, { class: 'conv-tabs', role: 'tablist', 'aria-label': 'Nhóm hội thoại' }) : null;
  if (adminTabs) leftCol.insertBefore(adminTabs, convListEl);

  function counterpartLink(conv, name) {
    const href = role === 'customer' && !isSupport(conv) && conv.manager_id
      ? `pitch-owner-profile.html?id=${encodeURIComponent(conv.manager_id)}`
      : role === 'admin' && isSupport(conv)
        ? `admin-users.html?q=${encodeURIComponent(conv.customer_name || '')}`
        : null;
    return href ? el('a', name, { href, class: 'thread-person-link', title: role === 'customer' ? 'Xem chủ sân' : 'Xem tài khoản' }) : document.createTextNode(name);
  }

  function buildBubble(m) {
    const isMine = m.sender_id === u.id;
    return el('div', null, { class: `message-bubble ${isMine ? 'message-bubble--mine' : ''}`.trim(), 'data-message-id': m.id }, [
      el('div', null, { class: 'message-meta text-xs muted', utility: 'u-margin-bottom-0p2rem' }, [el('span', m.sender_name || 'Người dùng', { class: 'font-bold' }), el('span', relativeTime(m.created_date))]),
      el('div', m.body || '', { class: 'text-sm' })
    ]);
  }

  async function markConversationNotificationsRead(conversationId) {
    try {
      const { items } = await api.entities.Notification.filter({ recipient_id: u.id, read: false }, { limit: 200 });
      const mine = (items || []).filter(n => String(n.link || '').includes(`conversationId=${conversationId}`));
      if (!mine.length) return;
      await Promise.all(mine.map(n => api.entities.Notification.update(n.id, { read: true })));
      window.dispatchEvent(new Event('pitch-point:notifications-changed'));
    } catch { }
  }

  function leaveThreadOnMobile() {
    const lastId = selectedId;
    selectedId = null;
    liveThread = null;
    window.__pitchPointActiveConversation = null;
    renderConversationList();
    softFocus(convListEl.querySelector(`.conv-item[href$="${encodeURIComponent(lastId || '')}"]`) || convListEl.querySelector('.conv-item'), { preventScroll: true });
  }

  function renderConversationList() {
    leftCol.querySelector('[data-conversation-count]').textContent = `${convs.length} cuộc trò chuyện`;
    replaceChildrenPreservingIndicator(convListEl);
    let shown = convs;
    if (adminTabs) {
      const support = convs.filter(isSupport);
      const watch = convs.filter(c => !isSupport(c));
      const current = convs.find(c => c.id === selectedId) || (draft?.id === selectedId ? draft : null);
      if (current) adminTab = isSupport(current) ? 'support' : 'watch';
      if (!adminTab) adminTab = support.length || !watch.length ? 'support' : 'watch';
      const tab = (key, label, list, hint) => {
        const b = el('button', null, { type: 'button', role: 'tab', class: `conv-tab${adminTab === key ? ' is-active' : ''}`, 'aria-selected': String(adminTab === key), title: hint }, [
          el('span', `${label} (${list.length})`, { class: 'conv-tab-label' })
        ]);
        b.addEventListener('click', () => { if (adminTab !== key) { adminTab = key; renderConversationList(); } });
        return b;
      };
      adminTabs.replaceChildren(
        tab('support', 'Hỗ trợ', support, 'Bạn trả lời được'),
        tab('watch', 'Khách ↔ chủ sân', watch, 'Chỉ xem')
      );
      shown = adminTab === 'support' ? support : watch;
      if (!shown.length) convListEl.append(el('p', adminTab === 'support' ? 'Chưa có ai nhắn quản trị viên.' : 'Chưa có hội thoại giữa khách và chủ sân.', { class: 'text-sm muted' }));
    } else if (!convs.length) {
      convListEl.append(el('p', 'Chưa có cuộc trò chuyện nào.', { class: 'text-sm muted' }));
    }
    for (const c of shown) {
      const counterpart = view.listLabel(c);
      const btn = el('a', null, {
        href: `messages.html?conversationId=${encodeURIComponent(c.id)}`,
        class: `conv-item ${c.id === selectedId ? 'active' : ''}`.trim()
      }, [
        el('div', null, { class: 'conv-item-row' }, [
          counterpartAvatar(c, 'md'),
          el('div', null, { class: 'conv-item-body' }, [
            el('div', null, { class: 'row-between', utility: 'u-gap-0p35rem' }, [
              el('strong', counterpart, { class: 'text-sm conv-item-title' }),
              el('span', relativeTime(c.last_message_at || c.created_date), { class: 'text-xs muted' })
            ]),
            el('div', isSupport(c) ? (role === 'admin' ? `Hỗ trợ ${(ROLE_LABELS[userRoles.get(c.customer_id)] || 'người dùng').toLocaleLowerCase('vi')}` : 'Hỗ trợ từ quản trị viên') : c.pitch_name || 'Sân bóng', { class: 'text-xs font-bold', utility: 'u-color-brand-text' }),
            el('div', c.last_message || 'Bắt đầu cuộc trò chuyện...', { class: 'text-xs muted conv-item-preview' })
          ])
        ])
      ]);
      btn.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        const enteringMobileThread = mobileView === 'list' && matchMedia('(max-width: 1023px)').matches;
        selectedId = c.id;
        mobileView = 'thread';
        const url = `messages.html?conversationId=${encodeURIComponent(c.id)}`;
        if (enteringMobileThread) history.pushState({ ...history.state, pitchPointThread: true }, '', url);
        else history.replaceState(history.state, '', url);
        renderThread().then(() => {
          if (selectedId === c.id && mobileView === 'thread' && matchMedia('(max-width: 1023px)').matches) softFocus(rightCol, { preventScroll: true });
        }).catch(error => say(error.message || 'Không tải được hội thoại.'));
      });
      convListEl.append(btn);
    }
    updateLiquidIndicator(convListEl, '.conv-item.active');
  }

  async function renderThread() {
    const renderVersion = ++threadRenderVersion;
    liveThread = null;
    window.__pitchPointActiveConversation = null;
    renderConversationList();

    const activeConv = convs.find(c => c.id === selectedId) || (draft?.id === selectedId ? draft : null);
    if (!activeConv) {
      rightCol.inert = false;
      layout.dataset.mobileView = mobileView;
      rightCol.replaceChildren();
      rightCol.append(el('div', convs.length
        ? 'Chọn một cuộc trò chuyện bên trái để xem tin nhắn.'
        : role === 'customer'
          ? 'Để bắt đầu, mở trang chi tiết sân hoặc chi tiết đơn của bạn và bấm "Nhắn chủ sân", hoặc bấm "Nhắn quản trị viên" nếu cần hỗ trợ.'
          : role === 'manager'
            ? 'Khi khách hàng nhắn tin cho sân của bạn, cuộc trò chuyện sẽ hiện ở đây. Bạn cũng có thể nhắn khách từ trang chi tiết đơn, hoặc bấm "Nhắn quản trị viên" nếu cần hỗ trợ.'
            : 'Chưa có cuộc trò chuyện nào. Để nhắn một người dùng, mở trang Quản lý người dùng và bấm "Nhắn tin".', { class: 'empty' }));
      return;
    }

    rightCol.inert = true;
    let msgsRes, relatedBookingsRes;
    try {
      [msgsRes, relatedBookingsRes] = await Promise.all([
      activeConv === draft ? Promise.resolve({ items: [] }) : api.entities.Message.filter({ conversation_id: activeConv.id }, { sort: 'created_date', limit: 1000 }),
      isSupport(activeConv) ? Promise.resolve({ items: [] }) : api.entities.Booking.filter({
        customer_id: activeConv.customer_id,
        pitch_id: activeConv.pitch_id,
        status: { $in: ['confirmed', 'completed'] }
      }, { sort: '-created_date', limit: 5 })
      ]);
    } catch (error) {
      if (renderVersion !== threadRenderVersion) return;
      rightCol.inert = false;
      layout.dataset.mobileView = mobileView;
      rightCol.replaceChildren(el('p', 'Không tải được hội thoại. Vui lòng chọn lại để thử lại.', { class: 'alert alert--danger', role: 'alert' }));
      throw error;
    }

    if (renderVersion !== threadRenderVersion) return;
    rightCol.inert = false;
    layout.dataset.mobileView = mobileView;
    rightCol.replaceChildren();

    const counterpartName = view.listLabel(activeConv).replace(/ ↔ .*/, '');
    const threadSubtitle = isSupport(activeConv)
      ? (role === 'admin' ? `Hỗ trợ ${(ROLE_LABELS[userRoles.get(activeConv.customer_id)] || 'người dùng').toLocaleLowerCase('vi')}` : 'Hỗ trợ từ quản trị viên')
      : `Sân: ${activeConv.pitch_name || '—'}`;

    const headActions = el('div', null, { class: 'row thread-header-actions' });
    if (view.canWarnCustomer && activeConv !== draft && !isSupport(activeConv)) {
      const warnBtn = el('button', 'Cảnh cáo khách', { type: 'button', class: 'button danger-outline sm' });
      warnBtn.addEventListener('click', () => {
        const reasonIn = el('textarea', null, { id: 'warn-reason', required: true, maxlength: '500', placeholder: 'Nhập lý do cảnh cáo khách hàng (tối đa 500 ký tự)...' });
        const warningError = el('p', '', { role: 'alert', class: 'field-error' });
        const f = el('form', null, { class: 'stack', novalidate: true }, [
          el('h2', `Cảnh cáo khách: ${activeConv.customer_name || 'Khách hàng'}`),
          el('p', 'Cảnh cáo sẽ được gửi vào thông báo và mục Cài đặt tài khoản của khách hàng.', { class: 'text-sm muted' }),
          el('div', null, { class: 'field-group' }, [el('label', 'Lý do cảnh cáo khách hàng', { for: 'warn-reason' }), reasonIn]),
          warningError,
          el('div', null, { class: 'row-between' }, [
            el('button', 'Đóng', { type: 'button', class: 'button secondary' }),
            el('button', 'Gửi cảnh cáo', { type: 'submit', class: 'button danger' })
          ])
        ]);
        f.querySelector('button[type="button"]').addEventListener('click', () => warnDialog.close());
        f.addEventListener('submit', async (e) => {
          e.preventDefault();
          const r = await api.functions.invoke('warnCustomer', {
            conversation_id: activeConv.id,
            reason: reasonIn.value
          });
          if (r.data?.error) {
            warningError.textContent = r.data.error;
            reasonIn.focus();
            return;
          }
          warnDialog.close();
          toast('Đã gửi cảnh cáo tới khách hàng.');
        });
        warnDialog.replaceChildren(f);
        warnDialog.showModal();
      });
      headActions.append(warnBtn);
    }

    const mobileBackBtn = el('button', null, {
      type: 'button',
      class: 'icon-btn messages-back-btn',
      'aria-label': 'Quay lại danh sách hội thoại',
      title: 'Danh sách hội thoại'
    }, [createIcon('ChevronLeft', 20)]);
    mobileBackBtn.addEventListener('click', () => {
      if (history.state?.pitchPointThread) { history.back(); return; }
      mobileView = 'list';
      layout.dataset.mobileView = 'list';
      history.replaceState(history.state, '', 'messages.html');
      leaveThreadOnMobile();
    });

    for (const a of headActions.querySelectorAll('.button')) a.classList.add('sm');
    const threadHeader = el('div', null, { class: 'thread-header' }, [
      el('div', null, { class: 'thread-header-who' }, [
        mobileBackBtn,
        counterpartAvatar(activeConv, 'md'),
        el('div', null, { class: 'thread-header-name' }, [
          el('h2', null, { utility: 'u-margin-0 u-font-size-1p05rem' }, [counterpartLink(activeConv, counterpartName)]),
          activeConv.pitch_id && !isSupport(activeConv)
            ? el('a', activeConv.pitch_name || 'Sân bóng', { href: `pitch-detail.html?id=${encodeURIComponent(activeConv.pitch_id)}`, class: 'text-xs thread-pitch-link', title: 'Xem trang sân' })
            : el('div', threadSubtitle, { class: 'text-xs muted' })
        ])
      ]),
      headActions
    ]);
    rightCol.append(threadHeader);

    const relatedBookings = relatedBookingsRes.items.filter(b => ['confirmed', 'completed'].includes(b.status));
    if (relatedBookings.length) {
      const relBox = el('div', null, { class: 'card card--compact card--subtle stack-sm' }, [
        el('div', 'Đơn đặt sân liên quan:', { class: 'text-xs font-bold muted' })
      ]);
      const relRow = el('div', null, { class: 'row' });
      for (const b of relatedBookings.slice(0, 3)) {
        relRow.append(
          el('a', null, {
            href: `booking-details.html?id=${encodeURIComponent(b.id)}`,
            class: 'related-booking-link'
          }, [
            el('strong', b.code),
            el('span', formatDate(b.local_date)),
            el('span', bookingStatusText(b) || b.status)
          ])
        );
      }
      relBox.append(relRow);
      rightCol.append(relBox);
    }

    const msgBox = el('div', null, { id: 'messages', class: 'message-thread' });
    if (!msgsRes.items.length) {
      msgBox.append(el('p', 'Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!', { class: 'text-sm muted', utility: 'u-text-align-center u-margin-auto' }));
    } else {
      for (const m of msgsRes.items) msgBox.append(buildBubble(m));
    }
    rightCol.append(msgBox);
    msgBox.scrollTop = msgBox.scrollHeight;
    if (activeConv !== draft) {
      liveThread = { conversationId: activeConv.id, msgBox, ids: new Set(msgsRes.items.map(m => m.id)) };
      window.__pitchPointActiveConversation = activeConv.id;
      markConversationNotificationsRead(activeConv.id);
    }

    if (!view.canSend(activeConv)) {
      rightCol.append(el('div', 'Bạn chỉ xem được hội thoại giữa khách và chủ sân. Muốn nhắn riêng, dùng nút "Nhắn tin" ở Quản lý người dùng.', { class: 'alert alert--info text-sm' }));
    } else {
      const bodyInput = el('textarea', null, {
        id: 'message-body',
        name: 'body',
        maxlength: '2000',
        required: true,
        placeholder: 'Nhập tin nhắn của bạn (tối đa 2000 ký tự)...',
        utility: 'u-min-height-4rem'
      });
      const form = el('form', null, { id: 'message-form', class: 'stack-sm', novalidate: true }, [
        el('label', 'Nội dung tin nhắn', { for: 'message-body', class: 'text-xs font-bold' }),
        bodyInput,
        el('div', null, { class: 'row-between' }, [
          el('span', isSupport(activeConv)
            ? (role === 'admin' ? 'Người dùng sẽ nhận được thông báo khi bạn gửi tin nhắn.' : 'Quản trị viên sẽ nhận được thông báo khi bạn gửi tin nhắn.')
            : role === 'manager' ? 'Khách hàng sẽ nhận được thông báo khi bạn gửi tin nhắn.' : 'Chủ sân sẽ nhận được thông báo khi bạn gửi tin nhắn.', { class: 'text-xs muted' }),
          el('button', 'Gửi tin nhắn', { type: 'submit', class: 'button sm' })
        ])
      ]);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors(form);
        const text = bodyInput.value.trim();
        if (!text) {
          setFieldError(bodyInput, 'Vui lòng nhập nội dung tin nhắn.');
          bodyInput.focus();
          return;
        }
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = true;
        try {
          const supportDraft = activeConv === draft && isSupport(draft);
          const r = await api.functions.invoke(activeConv === draft ? 'startMessage' : 'sendMessage', supportDraft
            ? { ...(role === 'admin' ? { user_id: draft.customer_id } : { to_admin: true }), body: text }
            : {
              conversation_id: activeConv === draft ? undefined : activeConv.id,
              pitch_id: activeConv.pitch_id,
              booking_id: draftBookingId || undefined,
              body: text
            });
          if (r.data?.error) throw new Error(r.data.error);
          if (activeConv === draft) {
            selectedId = r.data.conversation_id;
            draft = null;
            history.replaceState(null, '', `messages.html?conversationId=${encodeURIComponent(selectedId)}`);
          }
          convs = await loadConversations(view, u);
          await renderThread();
          rightCol.querySelector('#message-body')?.focus();
        } catch (err) {
          setFieldError(bodyInput, err.message || 'Không gửi được tin nhắn. Vui lòng thử lại.');
        } finally {
          submit.disabled = false;
        }
      });
      rightCol.append(form);
    }
  }

  window.addEventListener('popstate', () => {
    const url = new URL(location.href);
    let id = url.searchParams.get('conversationId');
    if (!id && url.searchParams.get('to') === 'admin' && view.canMessageAdmin) {
      selectAdminThread();
      id = selectedId;
    }
    if (!id) {
      ++threadRenderVersion;
      liveThread = null;
      window.__pitchPointActiveConversation = null;
      rightCol.inert = false;
      mobileView = 'list';
      layout.dataset.mobileView = 'list';
      leaveThreadOnMobile();
      return;
    }
    selectedId = id;
    mobileView = 'thread';
    renderThread().then(() => {
      if (selectedId === id && mobileView === 'thread' && matchMedia('(max-width: 1023px)').matches) softFocus(rightCol, { preventScroll: true });
    }).catch(error => say(error.message || 'Không tải được hội thoại.'));
  });

  const convSignature = list => list.map(c => `${c.id}:${c.last_message_at || ''}`).join(',');
  let polling = false;

  async function pollUpdates() {
    if (polling || document.visibilityState !== 'visible' || !layout.isConnected) return;
    polling = true;
    try {
      const live = liveThread;
      const res = await api.updates({ since: updatesCursor || '', conversations: 1, conversation_id: live?.conversationId || '' });
      const first = !updatesCursor;
      updatesCursor = res.server_time;
      if (first) return;
      if (res.conversations?.length) {
        const byId = new Map(convs.map(c => [c.id, c]));
        for (const c of res.conversations) byId.set(c.id, c);
        const merged = [...byId.values()].sort((a, b) => String(b.last_message_at || b.created_date).localeCompare(String(a.last_message_at || a.created_date)));
        if (convSignature(merged) !== convSignature(convs)) {
          convs = merged;
          renderConversationList();
        }
      }
      if (!live || liveThread !== live) return;
      const added = (res.messages || []).filter(m => !live.ids.has(m.id));
      if (!added.length) return;
      const box = live.msgBox;
      const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      box.querySelector(':scope > p.muted')?.remove();
      for (const m of added) {
        live.ids.add(m.id);
        box.append(buildBubble(m));
      }
      if (nearBottom || added.some(m => m.sender_id === u.id)) box.scrollTop = box.scrollHeight;
      if (added.some(m => m.sender_id !== u.id)) markConversationNotificationsRead(live.conversationId);
    } catch { } finally {
      polling = false;
    }
  }

  const pollTimer = setInterval(pollUpdates, MESSAGE_POLL_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pollUpdates(); });
  window.addEventListener('pagehide', () => clearInterval(pollTimer));

  layout.append(leftCol, rightCol);
  main.replaceChildren(
    el('header', null, { class: 'page-header' }, [
      reportsBackLink() || (() => {
        // Vào thẳng một hội thoại từ trang khác: thêm nút quay lại.
        if (!['conversationId', 'bookingId', 'userId', 'pitchId'].some(k => params.has(k))) return null;
        const link = staffBackLink(u, 'messages.html', null);
        return link ? el('a', link.label, { href: link.href, class: 'text-sm font-bold text-link page-back-link' }) : null;
      })(),
      el('p', 'Trao đổi trực tiếp', { class: 'eyebrow' }),
      el('h1', 'Tin nhắn')
    ]),
    layout,
    el('p', '', { id: 'error', role: 'alert' }),
    warnDialog
  );
  if (view.dashboardShell) {
    const contentNodes = [...main.childNodes];
    mountDashboardShell({
      mainEl: main,
      navEl: null,
      contentNodes,
      role
    });
  }
    await renderThread();
}

bootCustomerPage(user => renderMessagesPage(user));
