// Nhớ vị trí danh sách: rời trang rồi quay lại thì về đúng trang phân trang và đúng thẻ vừa xem.
// Lưu trong sessionStorage theo từng URL (tối đa 12 bản, hết hạn sau 30 phút).
const KEY = 'pitch-point:list-memory';
const MAX_AGE_MS = 30 * 60 * 1000;
const fileOf = (url) => url.pathname.split('/').pop() || 'index.html';
const here = () => fileOf(location) + location.search;
const NAV_AREA = 'nav, header, aside, .dashboard-sidebar, .site-footer, footer, dialog';

let pageGetter = null;
let pendingPage = null;
let restoreState = null;
let lastSavedAt = 0;

function readAll() {
  try { const all = JSON.parse(sessionStorage.getItem(KEY) || '{}'); return all && typeof all === 'object' && !Array.isArray(all) ? all : {}; } catch { return {}; }
}

function cameBack(state) {
  if (!state || state.url !== here() || Date.now() - state.at > MAX_AGE_MS) return false;
  const nav = performance.getEntriesByType?.('navigation')?.[0];
  if (nav?.type === 'back_forward') return true;
  if (!state.target) return false;
  try {
    const ref = new URL(document.referrer);
    return ref.origin === location.origin && fileOf(ref) === state.target;
  } catch { return false; }
}

/** Thẻ chứa một liên kết trong danh sách. */
const boxOf = (link) => link.closest('[data-memory-id]') || link.closest('article, .card, .conv-item, li, tr') || link;

const listLinks = () => [...document.querySelectorAll('main a[href]')].filter(a => !a.closest(NAV_AREA));

/** Mốc vị trí: data-memory-id của thẻ, id của thẻ, hoặc địa chỉ liên kết kèm thứ tự. */
function anchorOf(link) {
  if (!link || link.closest(NAV_AREA)) return { anchor: null, boxId: null, href: null, hrefIndex: 0, offset: 0 };
  const box = boxOf(link);
  const href = link.getAttribute('href');
  return {
    anchor: box.dataset?.memoryId || null,
    boxId: box.id || null,
    href,
    hrefIndex: listLinks().filter(a => a.getAttribute('href') === href).indexOf(link),
    offset: Math.round(box.getBoundingClientRect().top)
  };
}

function findAnchor(state) {
  if (state.anchor) return document.querySelector(`[data-memory-id="${CSS.escape(state.anchor)}"]`);
  if (state.boxId) { const box = document.getElementById(state.boxId); if (box) return box; }
  if (state.href) {
    const same = listLinks().filter(a => a.getAttribute('href') === state.href);
    const link = same[Math.max(0, state.hrefIndex || 0)] || null;
    if (link) return boxOf(link);
  }
  return null;
}

function save(state) {
  const all = readAll();
  delete all[state.url];
  all[state.url] = state;
  const keys = Object.keys(all);
  for (const key of keys.slice(0, Math.max(0, keys.length - 12))) delete all[key];
  try { sessionStorage.setItem(KEY, JSON.stringify(all)); } catch { }
  lastSavedAt = Date.now();
}

// Khi trang tải lại (không còn trong back-forward cache): ẩn nội dung, cuộn tức thì tới mốc rồi mới hiện.
const jump = (top) => scrollTo({ top, left: 0, behavior: 'instant' });
const saved = readAll()[here()];
if (cameBack(saved)) {
  restoreState = saved;
  pendingPage = saved.page > 1 ? saved.page : null;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // list-restored: tắt hiệu ứng xuất hiện để nội dung không xê dịch sau khi đã đặt vị trí.
  document.documentElement.classList.add('list-restoring', 'list-restored');
}
let revealed = false;
function reveal() {
  if (revealed) return;
  revealed = true;
  document.documentElement.classList.remove('list-restoring');
}

// Bấm liên kết sang trang khác: lưu mốc là thẻ chứa liên kết.
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  const link = event.target.closest?.('main a[href]');
  if (!link) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || fileOf(url) === fileOf(location)) return;
  // Liên kết menu: chỉ khôi phục khi lùi lịch sử, vào lại từ menu thì mở từ đầu.
  const fromMenu = Boolean(link.closest(NAV_AREA));
  save({ url: here(), target: fromMenu ? null : fileOf(url), at: Date.now(), y: Math.round(scrollY), page: pageGetter ? pageGetter() : 1, ...anchorOf(link) });
}, true);

// Rời trang theo cách khác (điều hướng bằng JS): lưu thẻ đang ở đầu màn hình.
addEventListener('pagehide', () => {
  if (Date.now() - lastSavedAt < 2000 || revealed === false && restoreState) return;
  const top = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
  let first = null;
  for (const a of document.querySelectorAll('main a[href]')) {
    if (a.closest(NAV_AREA)) continue;
    const r = boxOf(a).getBoundingClientRect();
    if (r.height && r.bottom > top + 8) { first = a; break; }
  }
  save({ url: here(), target: null, at: Date.now(), y: Math.round(scrollY), page: pageGetter ? pageGetter() : 1, ...anchorOf(first) });
});

// Nút "← Quay lại" trỏ về đúng trang vừa đến thì lùi lịch sử, tránh vòng lặp giữa hai trang.
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest?.('a[href]');
  if (!link || !link.textContent.trim().startsWith('←') || history.length < 2) return;
  try {
    const ref = new URL(document.referrer);
    const to = new URL(link.href, location.href);
    if (ref.origin !== location.origin || fileOf(ref) + ref.search !== fileOf(to) + to.search) return;
  } catch { return; }
  event.preventDefault();
  history.back();
});

/** Bộ phân trang đăng ký để được nhớ số trang; trả về trang cần mở lại hoặc null. */
export function registerListPage(getter) {
  pageGetter = getter;
  const page = pendingPage;
  pendingPage = null;
  return page;
}

// Chờ font tiêu đề (--font-display) tải xong, tối đa 1 giây.
function fontsSettled() {
  const f = document.fonts;
  if (!f?.load) return Promise.resolve();
  const loads = ['600', '700', '800'].map(w => f.load(`${w} 1rem "Plus Jakarta Sans"`).catch(() => null));
  return Promise.race([Promise.all(loads).then(() => f.ready), new Promise(r => setTimeout(r, 1000))]);
}

function applyRestore(state) {
  const hasAnchor = Boolean(state.anchor || state.boxId || state.href);
  let target = null;
  let userMoved = false;
  const stop = () => { userMoved = true; reveal(); };
  setTimeout(reveal, 2500);
  ['wheel', 'touchstart', 'keydown'].forEach(type => addEventListener(type, stop, { once: true, passive: true }));
  const place = () => {
    if (userMoved) return true;
    target = findAnchor(state);
    if (target) { jump(target.getBoundingClientRect().top + scrollY - state.offset); return true; }
    return false;
  };
  // Hiện trang khi bố cục đứng yên ~250 ms (tối đa 1,5 giây), sau đó vẫn chỉnh lại nếu lệch.
  const settle = () => {
    const started = performance.now();
    let lastKey = '';
    let stableSince = 0;
    const watch = () => {
      if (revealed || userMoved) return;
      place();
      const key = `${document.documentElement.scrollHeight}:${Math.round(scrollY)}:${target ? Math.round(target.getBoundingClientRect().top) : ''}`;
      const now = performance.now();
      if (key !== lastKey) { lastKey = key; stableSince = now; }
      if (now - stableSince >= 250 || now - started >= 1500) { reveal(); return; }
      requestAnimationFrame(watch);
    };
    fontsSettled().then(() => requestAnimationFrame(watch));
    [1800, 2400].forEach(ms => setTimeout(place, ms));
  };
  if (!hasAnchor) {
    const root = document.documentElement;
    const toY = () => { if (!userMoved) jump(state.y); };
    const whenReady = () => {
      fontsSettled().then(() => { toY(); reveal(); });
      [600, 1200].forEach(ms => setTimeout(toY, ms));
    };
    if (!root.classList.contains('page-initializing')) { setTimeout(whenReady, 300); return; }
    const ready = new MutationObserver(() => { if (!root.classList.contains('page-initializing')) { ready.disconnect(); whenReady(); } });
    ready.observe(root, { attributes: true, attributeFilter: ['class'] });
    return;
  }
  if (place()) { settle(); return; }
  const observer = new MutationObserver(() => { if (place()) { observer.disconnect(); settle(); } });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => {
    observer.disconnect();
    if (!target && !userMoved && document.documentElement.scrollHeight > state.y) jump(state.y);
    reveal();
  }, 2500);
}

if (restoreState) {
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => applyRestore(restoreState), { once: true });
  else applyRestore(restoreState);
}
