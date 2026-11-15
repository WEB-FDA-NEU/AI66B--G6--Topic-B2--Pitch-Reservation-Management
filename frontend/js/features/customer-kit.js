import { api } from '../services/api-client.js';
import { BOOKING_ADVANCE_DAYS } from '../core/config.js';
import { initShell, toast, showError } from '../core/ui.js';
import { el, todayLocal, addDays, appRole } from '../core/render.js';

export const $ = (s, root = document) => root.querySelector(s);

export const page = document.body.dataset.page || '';

export const params = new URLSearchParams(location.search);


export function validBookingDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    && value >= todayLocal() && value <= addDays(todayLocal(), BOOKING_ADVANCE_DAYS);
}


export function say(message) {
  const errEl = $('#error');
  if (errEl) showError(errEl, message || '');
  if (!message) return;
  const rect = errEl?.getClientRects().length ? errEl.getBoundingClientRect() : null;
  const header = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
  const bar = document.querySelector('.booking-bar:not([hidden])')?.getBoundingClientRect().height || 0;
  if (!rect || rect.bottom <= Math.max(0, header) || rect.top >= innerHeight - bar) toast(message);
}


export async function getCurrentUser() {
  try {
    return await api.auth.me();
  } catch {
    return null;
  }
}


export async function ensureAuthenticated() {
  const u = await getCurrentUser();
  if (!u) {
    const current = (location.pathname.split('/').pop() || 'index.html') + location.search;
    location.href = `login.html?returnTo=${encodeURIComponent(current)}`;
    return null;
  }
  return u;
}


export const CUSTOMER_ONLY_PAGES = new Set([
  'booking-schedule', 'booking-confirmation', 'payment', 'booking-result',
  'booking-history', 'payment-history', 'favorite-pitches'
]);


export function bootCustomerPage(renderPage) {
  (async () => {
    const user = await initShell();
    if (user && CUSTOMER_ONLY_PAGES.has(page) && appRole(user) !== 'customer') {
      location.replace('403.html?reason=customer-only');
      return;
    }
    await renderPage(user);
  })().catch(err => {
  if (['pitch-detail', 'booking-schedule', 'booking-confirmation', 'booking-result', 'booking-details'].includes(page)) {
    const main = document.querySelector('main');
    if (main) {
      main.replaceChildren(el('section', null, { class: 'container surface stack', role: 'alert' }, [
        el('h1', 'Không thể tải nội dung'),
        el('p', err.message || 'Không tìm thấy dữ liệu. Vui lòng thử lại.'),
        el('a', 'Quay lại tìm sân', { href: 'search.html', class: 'button' })
      ]));
      return;
    }
  }
  say(err.message || 'Không tải được dữ liệu. Vui lòng thử lại.');
}).finally(() => {
    document.documentElement.classList.remove('page-initializing');
    document.documentElement.classList.add('page-ready');
  });
}
