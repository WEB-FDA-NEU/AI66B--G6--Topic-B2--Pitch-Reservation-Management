import { api } from '../services/api-client.js';
import { renderBadge, renderStatCard, updateLiquidIndicator, animateTabPanel } from '../core/ui.js';
import { el, formatVnd, formatDateTime, PAYMENT_STATUS, createPager } from '../core/render.js';
import { $, ensureAuthenticated, params, bootCustomerPage } from '../features/customer-kit.js';

async function renderPaymentHistoryPage() {
  const main = $('#main');
  if (!main) return;
  main.className = 'container stack-lg';
  const u = await ensureAuthenticated();
  if (!u) return;

  const [walletsRes, paymentsRes, refundsRes] = await Promise.all([
    api.entities.Wallet.filter({ user_id: u.id }),
    api.entities.Payment.filter({ customer_id: u.id }, { sort: '-created_date' }),
    api.entities.Refund.filter({ customer_id: u.id }, { sort: '-created_date' })
  ]);

  const wallet = walletsRes.items[0] || { balance_vnd: 0 };
  const payments = paymentsRes.items || [];
  const refunds = refundsRes.items || [];
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount_vnd || 0), 0);
  const totalRefunded = refunds.reduce((s, r) => s + Number(r.amount_vnd || 0), 0);

  const statsGrid = el('div', null, { class: 'grid-3' }, [
    renderStatCard({
      label: 'Số dư ví hiện tại',
      value: formatVnd(wallet.balance_vnd),
      hint: 'Tự động cộng lại khi hoàn tiền hợp lệ',
      icon: 'Wallet',
      tone: 'primary'
    }),
    renderStatCard({
      label: 'Tổng thanh toán đang giữ hiệu lực',
      value: formatVnd(totalPaid),
      hint: `${payments.filter(p => p.status === 'paid').length} đơn còn hiệu lực, ${payments.length} lần thanh toán`,
      icon: 'ReceiptText',
      tone: 'info'
    }),
    renderStatCard({
      label: 'Đã hoàn tiền',
      value: formatVnd(totalRefunded),
      hint: `${refunds.length} giao dịch hoàn tiền`,
      icon: 'Wallet',
      tone: 'success'
    })
  ]);

  let activeTab = params.get('tab') === 'refunds' ? 'refunds' : 'payments';
  const tabsWrap = el('div', null, { class: 'tabs', role: 'tablist', 'aria-label': 'Loại giao dịch' });
  const resultsContainer = el('div', null, { id: 'results', class: 'stack', role: 'tabpanel' });

  const paymentTabDefs = [
    ['payments', `Thanh toán (${payments.length})`],
    ['refunds', `Hoàn tiền (${refunds.length})`]
  ];
  const paymentTabBtns = new Map();
  for (const [key, label] of paymentTabDefs) {
    const btn = el('button', label, {
      type: 'button',
      role: 'tab',
      'aria-controls': 'results',
      id: `payment-tab-${key}`,
      class: 'tab-btn'
    });
    btn.addEventListener('click', () => {
      if (activeTab === key) return;
      activeTab = key;
      const url = new URL(location.href);
      if (key === 'payments') url.searchParams.delete('tab');
      else url.searchParams.set('tab', key);
      history.replaceState(null, '', url);
      renderTabs();
      animateTabPanel(resultsContainer);
      btn.focus({ preventScroll: true });
    });
    paymentTabBtns.set(key, btn);
    tabsWrap.append(btn);
  }

  function renderTabs() {
    for (const [key] of paymentTabDefs) {
      const isSel = key === activeTab;
      const btn = paymentTabBtns.get(key);
      if (!btn) continue;
      btn.tabIndex = isSel ? 0 : -1;
      btn.classList.toggle('active', isSel);
      btn.setAttribute('aria-selected', String(isSel));
    }
    updateLiquidIndicator(tabsWrap, '.tab-btn[aria-selected="true"]');
    resultsContainer.setAttribute('aria-labelledby', `payment-tab-${activeTab}`);

    resultsContainer.replaceChildren();
    const list = activeTab === 'payments' ? payments : refunds;
    const pageRows = pager.slice(list, activeTab);
    if (!list.length) {
      resultsContainer.append(el('div', 'Chưa có giao dịch nào trong mục này.', { class: 'empty' }));
      return;
    }

    for (const item of pageRows) {
      resultsContainer.append(
        el('article', null, { class: 'surface row-between' }, [
          el('div', null, { class: 'stack-sm' }, [
            el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
              el('span', item.booking_code || 'Giao dịch', { class: 'text-xs font-bold muted' }),
              renderBadge(PAYMENT_STATUS[item.status] || { label: 'Đã hoàn tất', tone: 'info' })
            ]),
            el('strong', item.pitch_name || 'Đơn đặt sân'),
            el('div', formatDateTime(item.paid_at || item.created_date), { class: 'text-xs muted' })
          ]),
          el('div', null, { class: 'row' }, [
            el('strong', `${activeTab === 'refunds' ? '+' : '-'}${formatVnd(item.amount_vnd)}`, {
              style: `color:${activeTab === 'refunds' ? 'var(--success)' : 'var(--foreground)'}`
            }),
            item.booking_id
              ? el('a', 'Xem đơn', { href: `booking-details.html?id=${encodeURIComponent(item.booking_id)}`, class: 'button secondary sm' })
              : null
          ])
        ])
      );
    }
  }

  const pager = createPager({ pageSize: 10, noun: 'giao dịch', onChange: () => renderTabs(), scrollTarget: tabsWrap });
  renderTabs();
  main.replaceChildren(
    el('header', null, { class: 'page-header' }, [
      el('p', 'Ví Pitch Point', { class: 'eyebrow' }),
      el('h1', 'Lịch sử thanh toán & hoàn tiền')
    ]),
    statsGrid,
    tabsWrap,
    resultsContainer,
    pager.el,
    el('p', '', { id: 'error', role: 'alert' })
  );
}

bootCustomerPage(user => renderPaymentHistoryPage(user));
