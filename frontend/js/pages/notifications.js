import { api } from '../services/api-client.js';
import { translateLink } from '../core/links.js';
import { toast } from '../core/ui.js';
import { el, relativeTime, createPager } from '../core/render.js';
import { $, ensureAuthenticated, bootCustomerPage } from '../features/customer-kit.js';

async function renderNotificationsPage() {
  const main = $('#main');
  if (!main) return;
  main.className = 'container container--narrow stack-lg';
  const u = await ensureAuthenticated();
  if (!u) return;

  const headerRow = el('header', null, { class: 'page-header row-between' });
  const resultsContainer = el('div', null, { id: 'results', class: 'stack' });
  const pager = createPager({ pageSize: 10, noun: 'thông báo', onChange: () => loadNotifications(), scrollTarget: headerRow });

  async function loadNotifications() {
    const res = await api.entities.Notification.filter({ recipient_id: u.id }, { sort: '-created_date' });
    const items = res.items || [];
    const unread = items.filter(n => !n.read);

    const markAllBtn = el('button', `Đánh dấu tất cả đã đọc (${unread.length})`, {
      type: 'button',
      class: 'button secondary sm',
      disabled: unread.length === 0
    });
    markAllBtn.addEventListener('click', async () => {
      for (const n of unread) {
        await api.entities.Notification.update(n.id, { read: true });
      }
      toast('Đã đánh dấu đọc toàn bộ thông báo.');
      await loadNotifications();
      const heading = headerRow.querySelector('h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });

    headerRow.replaceChildren(
      el('div', null, {}, [
        el('p', 'Cập nhật hệ thống & đơn đặt sân', { class: 'eyebrow' }),
        el('h1', 'Thông báo của bạn')
      ]),
      markAllBtn
    );

    const pageRows = pager.slice(items);
    resultsContainer.replaceChildren();
    if (!items.length) {
      resultsContainer.append(el('div', 'Bạn chưa có thông báo nào.', { class: 'empty' }));
      return;
    }

    for (const n of pageRows) {
      const dest = translateLink(n.link || 'notifications.html');
      const markReadBtn = !n.read
        ? el('button', 'Đánh dấu đã đọc', { type: 'button', class: 'button ghost sm' })
        : null;
      if (markReadBtn) {
        markReadBtn.addEventListener('click', async () => {
          await api.entities.Notification.update(n.id, { read: true });
          await loadNotifications();
        });
      }

      const openBtn = el('a', 'Xem chi tiết', { href: dest, class: 'button secondary sm' });
      openBtn.addEventListener('click', async () => {
        if (!n.read) {
          try { await api.entities.Notification.update(n.id, { read: true }); } catch { }
        }
      });

      const card = el('article', null, {
        id: `n-${n.id}`,
        class: 'surface row-between',
        style: n.read ? '' : 'border-left:4px solid var(--primary)'
      }, [
        el('div', null, { class: 'stack-sm' }, [
          el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
            !n.read ? el('span', 'Mới', { class: 'badge badge--success' }) : el('span', 'Đã đọc', { class: 'badge badge--muted' }),
            el('span', relativeTime(n.created_date), { class: 'text-xs muted' })
          ]),
          el('h2', n.title || 'Thông báo', { utility: 'u-font-size-1p05rem' }),
          el('p', n.body || '', { class: 'text-sm muted' })
        ]),
        el('div', null, { class: 'row' }, [markReadBtn, openBtn])
      ]);
      resultsContainer.append(card);
    }
  }

  window.addEventListener('pitch-point:notification-arrived', () => { loadNotifications().catch(() => { }); });
  main.replaceChildren(headerRow, resultsContainer, pager.el, el('p', '', { id: 'error', role: 'alert' }));
  await loadNotifications();

  const focusFromHash = () => {
    const id = decodeURIComponent(location.hash.replace(/^#n-/, ''));
    if (!location.hash.startsWith('#n-') || !id) return;
    const card = document.getElementById(`n-${id}`);
    if (!card) return;
    resultsContainer.querySelectorAll('.notif-card--focus').forEach(c => c.classList.remove('notif-card--focus'));
    card.classList.add('notif-card--focus');
    card.tabIndex = -1;
    card.scrollIntoView({ block: 'center' });
    card.focus({ preventScroll: true });
  };
  const root = document.documentElement;
  const whenShown = () => (root.classList.contains('page-initializing') ? requestAnimationFrame(whenShown) : focusFromHash());
  whenShown();
  window.addEventListener('hashchange', focusFromHash);
}

bootCustomerPage(user => renderNotificationsPage(user));
