import { api } from '../services/api-client.js';
import { initShell, toast, mountDashboardShell } from '../core/ui.js';
import { el, appRole, reportsBackLink, staffBackLink } from '../core/render.js';

export const page = document.body.dataset.page || '';

export const params = new URLSearchParams(location.search);

export const mainEl = document.querySelector('#main, main');

export const content = document.querySelector('#content');

export const statusEl = document.querySelector('#status');

export const navEl = document.querySelector('#management-nav');

export const dialog = document.querySelector('#action-dialog');

if (dialog) dialog.setAttribute('aria-label', 'Thao tác quản lý');


export let currentUser = null;

export function vietnamMonth(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}(?:-\d{2})?$/.test(String(value))) return String(value).slice(0, 7);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(date);
  return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}`;
}


export function setStatus(message, isError = false) {
  if (!statusEl) { if (message && isError) toast(message); return; }
  statusEl.textContent = message || '';
  if (message) {
    statusEl.style.background = isError ? 'var(--danger-bg)' : 'var(--info-bg)';
    statusEl.style.borderColor = isError ? 'var(--danger-border)' : 'var(--info-border)';
    statusEl.style.color = isError ? 'var(--danger)' : 'var(--info)';
  }
}


export async function fetchRows(entity, query = {}, sort = '-created_date', limit = 5000) {
  const res = await api.entities[entity].filter(query, { sort, limit });
  return res.items || [];
}


export function openActionDialog({ title, description, label = 'Nội dung hoặc lý do', required = true, hideReason = false, placeholder = '', initialValue = '', extraFields = null, danger = false, confirmLabel = 'Xác nhận', onConfirm }) {
  if (!dialog) return;
  const trigger = document.activeElement;
  dialog.setAttribute('aria-label', title);
  dialog.querySelector('[data-dialog-title]').textContent = title;
  dialog.querySelector('[data-dialog-description]').textContent = description;

  const reasonEl = dialog.querySelector('#action-reason');
  const labelEl = dialog.querySelector('label[for="action-reason"]');
  reasonEl.hidden = hideReason;
  if (labelEl) labelEl.hidden = hideReason;
  if (labelEl) labelEl.textContent = label;
  reasonEl.value = initialValue;
  reasonEl.placeholder = placeholder;

  const oldExtra = dialog.querySelector('[data-extra-container]');
  if (oldExtra) oldExtra.remove();
  if (extraFields) {
    const wrap = el('div', null, { 'data-extra-container': 'true', class: 'stack-sm' }, [extraFields]);
    reasonEl.parentElement.insertBefore(wrap, labelEl);
  }

  const errP = dialog.querySelector('[data-dialog-error]');
  errP.textContent = '';
  errP.className = 'field-error';

  const closeBtn = dialog.querySelector('[data-close]');
  const confirmBtn = dialog.querySelector('[data-confirm]');
  // Đóng bên trái, xác nhận bên phải.
  closeBtn.parentElement.className = 'dialog-actions';
  closeBtn.className = 'button secondary';
  confirmBtn.className = danger ? 'button danger' : 'button';
  confirmBtn.textContent = confirmLabel;

  closeBtn.onclick = () => dialog.close();
  confirmBtn.onclick = async () => {
    const val = reasonEl.value.trim();
    if (required && !val) {
      const what = label.replace(/\s*\([^)]*\)\s*$/, '').trim();
      errP.textContent = what ? `Vui lòng nhập ${what.charAt(0).toLocaleLowerCase('vi')}${what.slice(1)}.` : 'Vui lòng nhập đầy đủ nội dung bắt buộc.';
      reasonEl.focus();
      return;
    }
    try {
      confirmBtn.disabled = true;
      await onConfirm(val);
      dialog.close();
      if (!trigger?.isConnected) {
        const heading = mainEl?.querySelector('h1');
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      }
    } catch (e) {
      errP.textContent = e.message || 'Không thể thực hiện thao tác.';
    } finally {
      confirmBtn.disabled = false;
    }
  };
  dialog.showModal();
}


export function setupDashboardShell(role) {
  if (!mainEl || !navEl || !content) return;
  const header = mainEl.querySelector('.page-header');
  let back = reportsBackLink();
  // Mở kèm bộ lọc từ trang quản trị khác: thêm nút quay lại trang đó.
  if (!back && role === 'admin' && ['userId', 'managerId', 'pitchId'].some(k => params.has(k))) {
    const link = staffBackLink(currentUser, `${page}.html`, null);
    if (link) back = el('a', link.label, { href: link.href, class: 'text-sm font-bold text-link page-back-link' });
  }
  if (header && back) header.prepend(back);
  mountDashboardShell({
    mainEl,
    navEl,
    contentNodes: [header, statusEl, content],
    role
  });
}


export function compactVnd(value) {
  const n = Number(value || 0);
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`;
  if (n >= 1e3) return `${Math.round(n / 1e3).toLocaleString('vi-VN')}k`;
  return String(n);
}

export function buildVisualBarChartWithTable({ title, subtitle, rows, labelHeader, valueHeader, formatValue = (v) => String(v), formatBarValue = compactVnd, tableSummary = 'Xem bảng số liệu', unitNoun = 'mục' }) {
  const section = el('section', null, { class: 'surface stack' });
  section.append(
    el('div', null, { class: 'row-between' }, [
      el('div', null, {}, [
        el('h2', title),
        subtitle ? el('p', subtitle, { class: 'text-sm muted' }) : null
      ])
    ])
  );

  const rawMax = Math.max(0, ...rows.map(r => Math.max(0, Number(r.value || 0))));
  const maxVal = Math.max(1, rawMax);
  const chartBox = el('div', null, { class: 'chart-bars', role: 'group', 'aria-label': title });
  rows.forEach((r, idx) => {
    const numVal = Math.max(0, Number(r.value || 0));
    const pct = Math.max(0, Math.round((numVal / maxVal) * 100));
    const isPeak = rawMax > 0 && numVal === rawMax;
    const col = el('div', null, {
      class: `chart-bar-col ${isPeak ? 'chart-bar-col--peak' : ''}`.trim(),
      style: `--bar-index:${idx}`,
      tabindex: '0',
      role: 'img',
      'aria-label': `${r.label}: ${formatValue(r.value)}`,
      title: `${r.label}: ${formatValue(r.value)}`
    }, [
      el('span', formatValue(r.value), { class: 'chart-bar-tooltip' }),
      el('div', null, { class: 'chart-bar-track' }, [
        el('div', null, { class: 'chart-bar-fill', style: `height:${pct}%;--bar-delay:${idx * 55}ms` }, [
          numVal > 0 ? el('span', formatBarValue(numVal), { class: 'chart-bar-value', 'aria-hidden': 'true' }) : null
        ])
      ]),
      el('span', r.shortLabel || r.label, { class: 'chart-bar-label' })
    ]);
    chartBox.append(col);
  });
  section.append(chartBox);
  if (rawMax === 0) section.append(el('p', 'Chưa có đơn hợp lệ nào trong khoảng thời gian này.', { class: 'text-sm muted' }));
  else section.append(el('p', 'Đơn vị: k = nghìn đồng, tr = triệu đồng.', { class: 'text-xs muted' }));

  // Bảng số liệu: mỗi mục một dòng kèm vạch tỉ lệ.
  const list = el('ol', null, { class: 'chart-data-list', 'aria-label': `${labelHeader} — ${valueHeader}` });
  for (const r of rows) {
    const numVal = Math.max(0, Number(r.value || 0));
    const pct = rawMax > 0 ? Math.round((numVal / rawMax) * 100) : 0;
    list.append(el('li', null, { class: `chart-data-row${rawMax > 0 && numVal === rawMax ? ' is-peak' : ''}${numVal === 0 ? ' is-zero' : ''}` }, [
      el('div', null, { class: 'chart-data-main' }, [
        el('span', r.label, { class: 'chart-data-label' }),
        r.note !== undefined ? el('span', r.note, { class: 'chart-data-note' }) : null
      ]),
      el('span', formatValue(r.value), { class: 'chart-data-value' }),
      el('span', null, { class: 'chart-data-meter', 'aria-hidden': 'true' }, [el('span', null, { style: `width:${pct}%` })])
    ]));
  }
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  const listWrap = el('div', null, { class: 'chart-data-wrap' }, [
    el('div', null, { class: 'chart-data-head' }, [el('span', labelHeader), el('span', valueHeader)]),
    list,
    el('div', null, { class: 'chart-data-total' }, [el('span', `Tổng ${rows.length} ${unitNoun}`), el('strong', formatValue(total))])
  ]);
  section.append(el('details', null, { class: 'chart-table-details' }, [
    el('summary', tableSummary, { class: 'text-sm font-bold' }),
    listWrap
  ]));
  return section;
}


export let renderCurrentPage = async () => {};

export async function render() {
  content.replaceChildren();
  setStatus('');
  await renderCurrentPage();
}

async function initManagement() {
  await initShell();
  try {
    currentUser = await api.auth.me();
  } catch {
    const next = (location.pathname.split('/').pop() || 'index.html') + location.search;
    location.replace(`login.html?returnTo=${encodeURIComponent(next)}`);
    return;
  }

  const role = appRole(currentUser);
  const isAdminPage = page.startsWith('admin-');

  if (isAdminPage && role !== 'admin') {
    location.replace('403.html');
    return;
  }
  if (page === 'manager-dashboard' && role !== 'manager') {
    location.replace('403.html');
    return;
  }
  if (!isAdminPage && page !== 'manager-dashboard') {
    // Trang của chủ sân chỉ dành cho chủ sân.
    if (role !== 'manager') {
      location.replace('403.html');
      return;
    }
  }

  setupDashboardShell(role === 'admin' ? 'admin' : 'manager');
  await render();
}


export function bootManagement(renderPage) {
  renderCurrentPage = renderPage;
  initManagement().catch(err => setStatus(err.message || 'Không tải được dữ liệu.', true)).finally(() => {
    document.documentElement.classList.remove('page-initializing');
    document.documentElement.classList.add('page-ready');
  });
}
