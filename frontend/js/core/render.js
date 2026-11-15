import { CANCELLATION_NOTICE_MS } from './config.js';
import { registerListPage } from './list-memory.js';
import { avatarSvg } from './avatar.js';

export function cloneTemplate(id) {
  const template = document.getElementById(id);
  if (!(template instanceof HTMLTemplateElement)) throw new Error(`Missing template: ${id}`);
  return template.content.cloneNode(true);
}

export function setText(root, selector, value) {
  const target = root.querySelector(selector);
  if (target) target.textContent = value ?? '';
}

export function el(tag, text = null, attrs = {}, children = []) {
  const node = document.createElement(tag);
  if (text !== null && text !== undefined) node.textContent = String(text);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'utility') continue;
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  if (attrs.utility) node.classList.add(...String(attrs.utility).split(/\s+/).filter(Boolean));
  for (const child of children) {
    if (child) node.append(child);
  }
  return node;
}

export function buildDirectionsLink(b, size = '') {
  const query = encodeURIComponent(`${b.pitch_name || ''} ${b.pitch_address || ''}`.trim());
  return el('a', 'Xem đường đi Google Maps ↗', {
    href: `https://www.google.com/maps/search/?api=1&query=${query}`,
    target: '_blank',
    rel: 'noopener noreferrer',
    class: size === 'link' ? 'text-link text-sm font-bold directions-link' : `button secondary ${size}`.trim()
  });
}

const BACK_LABELS = {
  'manager-dashboard.html': 'Tổng quan',
  'manager-bookings.html': 'Đơn đặt sân',
  'manager-pitches.html': 'Sân của tôi',
  'manager-revenue.html': 'Doanh thu',
  'pitch-availability.html': 'Lịch & giá',
  'edit-pitch.html': 'Sửa sân',
  'messages.html': 'Tin nhắn',
  'notifications.html': 'Thông báo',
  'booking-details.html': 'chi tiết đơn',
  'pitch-detail.html': 'trang sân',
  'admin-dashboard.html': 'Tổng quan',
  'admin-finance.html': 'Đơn & hoàn tiền',
  'admin-pitch-moderation.html': 'Quản lý sân',
  'admin-pitch-managers.html': 'Quản lý chủ sân',
  'admin-reports.html': 'Báo cáo',
  'admin-users.html': 'Quản lý người dùng',
  'admin-activity-log.html': 'Nhật ký hoạt động',
  'booking-history.html': 'lịch sử đặt sân',
  'favorite-pitches.html': 'sân yêu thích',
  'search.html': 'tìm sân',
  'index.html': 'trang chủ'
};

export function staffBackLink(user, page, fallback, exclude = []) {
  const role = appRole(user);
  if (!['customer', 'manager', 'admin'].includes(role)) return fallback;
  const key = `pitch-point:back:${role}:${page}`;
  let target = null;
  try {
    const ref = new URL(document.referrer);
    const file = ref.pathname.split('/').pop();
    if (ref.origin === location.origin && file !== page && BACK_LABELS[file] && !exclude.includes(file)) target = file + ref.search;
  } catch { }
  try {
    if (target) sessionStorage.setItem(key, target);
    else target = sessionStorage.getItem(key);
  } catch { }
  const file = target?.split('?')[0];
  if (!file || !BACK_LABELS[file] || exclude.includes(file)) return fallback;
  return { href: target, label: `← Quay lại ${BACK_LABELS[file]}` };
}

// Giữ số trang khi danh sách được vẽ lại sau một thao tác.
const livePages = new Map();

export function createPager({ pageSize = 20, noun = 'mục', onChange, scrollTarget = null }) {
  let page = 1;
  let lastKey = null;
  let restorePage = registerListPage(() => page) || livePages.get(noun) || null;
  const wrap = el('div', null, { class: 'row-between list-pager' });
  const go = (next) => {
    page = next;
    onChange();
    const target = typeof scrollTarget === 'function' ? scrollTarget() : scrollTarget;
    target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  return {
    el: wrap,
    reset() { page = 1; },
    slice(items, key = '') {
      if (key !== lastKey) { page = restorePage || 1; restorePage = null; lastKey = key; }
      const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
      if (page > totalPages) page = totalPages;
      livePages.set(noun, page);
      const rows = items.slice((page - 1) * pageSize, page * pageSize);
      wrap.replaceChildren(
        el('span', `Hiển thị ${rows.length} / ${items.length} ${noun} (Trang ${page}/${totalPages})`, { class: 'text-sm muted' }),
        el('div', null, { class: 'row' }, [
          el('button', '← Trang trước', { type: 'button', class: 'button secondary sm', disabled: page <= 1, onclick() { go(page - 1); } }),
          el('button', 'Trang sau →', { type: 'button', class: 'button secondary sm', disabled: page >= totalPages, onclick() { go(page + 1); } })
        ])
      );
      return rows;
    }
  };
}

const REPORTS_URL_KEY = 'pitch-point:admin-reports-url';

export function rememberReportsUrl() {
  try { sessionStorage.setItem(REPORTS_URL_KEY, location.pathname.split('/').pop() + location.search); } catch { }
}

export function withReportsReturn(href) {
  const url = new URL(href, location.href);
  url.searchParams.set('from', 'reports');
  return url.pathname.split('/').pop() + url.search + url.hash;
}

export function reportsBackLink() {
  if (new URLSearchParams(location.search).get('from') !== 'reports') return null;
  let href = 'admin-reports.html';
  try { href = sessionStorage.getItem(REPORTS_URL_KEY) || href; } catch { }
  return el('a', '← Quay lại Báo cáo', { href, class: 'text-sm font-bold text-link page-back-link' });
}

const vndFormatter = new Intl.NumberFormat('vi-VN');

// Thời điểm thao tác gần nhất trên đơn (hủy, kết thúc, thanh toán hoặc tạo).
export function bookingActivityTime(b) {
  const t = (v) => (v ? Date.parse(v) || 0 : 0);
  const fallback = t(b.updated_date) || t(b.created_date);
  if (b.status === 'cancelled') return t(b.cancelled_at) || fallback;
  if (b.status === 'completed') return t(b.ends_at) || fallback;
  if (b.status === 'confirmed') return t(b.paid_at) || fallback;
  return t(b.created_date) || fallback;
}

export function sortByRecentActivity(rows) {
  return [...rows].sort((a, b) => bookingActivityTime(b) - bookingActivityTime(a) || String(b.code || '').localeCompare(String(a.code || '')));
}

// ---- Sắp xếp danh sách đơn
export const BOOKING_SORTS = [
  ['recent', 'Vừa thao tác gần đây'],
  ['date-desc', 'Ngày đá: mới nhất trước'],
  ['date-asc', 'Ngày đá: sớm nhất trước']
];

export function bookingStartTime(b) {
  return Date.parse(b.starts_at) || Date.parse(`${b.local_date}T${b.start_time || '00:00'}:00+07:00`) || 0;
}

export function sortBookings(rows, mode) {
  if (mode === 'recent') return sortByRecentActivity(rows);
  const dir = mode === 'date-asc' ? 1 : -1;
  return [...rows].sort((a, b) => dir * (bookingStartTime(a) - bookingStartTime(b)) || String(a.code || '').localeCompare(String(b.code || '')));
}

// Lựa chọn lưu trong URL (?sort=); chưa chọn thì dùng mặc định của trang.
export function readBookingSort() {
  const value = new URLSearchParams(location.search).get('sort');
  return BOOKING_SORTS.some(([key]) => key === value) ? value : null;
}

export function buildBookingSortField({ id, value, onChange }) {
  const select = el('select', null, { id }, BOOKING_SORTS.map(([key, label]) => el('option', label, { value: key })));
  select.value = value;
  select.addEventListener('change', () => {
    const url = new URL(location.href);
    url.searchParams.set('sort', select.value);
    history.replaceState(null, '', url);
    onChange(select.value);
  });
  const field = el('div', null, { class: 'field-group booking-sort-field' }, [el('label', 'Sắp xếp', { for: id }), select]);
  return { field, select };
}

export function formatVnd(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '0 ₫';
  return `${vndFormatter.format(Math.round(num))} ₫`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function dateLabel(localDate) {
  if (!localDate) return '';
  const date = new Date(`${localDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return localDate;
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });
}

export function relativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  if (diffSec > -45 && diffSec < 120) return 'vừa xong';
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  return rtf.format(Math.round(diffSec / 86400), 'day');
}

export function todayLocal() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

export function nowLocalTime() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().slice(11, 16);
}

export function hourSelect(attrs = {}, value = '06:00', { from = 6, to = 22 } = {}) {
  const hours = Array.from({ length: to - from + 1 }, (_, i) => `${String(from + i).padStart(2, '0')}:00`);
  if (value && !hours.includes(value)) hours.unshift(value);
  const select = el('select', null, attrs, hours.map(h => el('option', h, { value: h })));
  select.value = value || hours[0];
  return select;
}

export const quoteNote = text => `“${String(text || '').trim().replace(/[.!?…。]+$/u, '')}”`;

export function fullAddress(p = {}) {
  const parts = [];
  const city = String(p.city || '').trim();
  let address = String(p.address || '').trim();
  if (city && address.toLocaleLowerCase('vi').endsWith(`, ${city}`.toLocaleLowerCase('vi'))) address = address.slice(0, -(city.length + 2)).trim();
  for (const part of [address, p.district, city]) {
    const value = String(part || '').trim();
    if (value && !parts.join(', ').toLocaleLowerCase('vi').includes(value.toLocaleLowerCase('vi'))) parts.push(value);
  }
  return parts.join(', ');
}

export function addDays(localDate, days) {
  const date = new Date(`${localDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function initials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'PP';
}

export function normalizeText(text = '') {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function appRole(user) {
  if (!user) return 'guest';
  if (user.app_role) return user.app_role;
  if (user.role === 'admin') return 'admin';
  return 'customer';
}

/** Danh sách "nhãn – giá trị", mỗi mục một dòng; bỏ qua mục rỗng. rows: [[nhãn, giá trị, { strong }]] */
export function infoList(rows, { className = '' } = {}) {
  return el('dl', null, { class: `info-list ${className}`.trim() }, rows
    .filter(r => r && r[1] !== null && r[1] !== undefined && r[1] !== '')
    .map(([label, value, opts = {}]) => el('div', null, {}, [
      el('dt', label),
      value instanceof Node ? el('dd', null, { class: opts.strong ? 'font-bold' : opts.className || null }, [value])
        : el('dd', value, { class: opts.strong ? 'font-bold' : opts.className || null })
    ])));
}

/** Ô "Đang lọc theo" kèm nút bỏ lọc. */
export function buildFilterChip(text, clearLabel, onClear) {
  const btn = el('button', clearLabel, { type: 'button', class: 'button secondary sm filter-chip-clear' });
  btn.addEventListener('click', onClear);
  return el('div', null, { class: 'filter-chip-row' }, [
    el('span', null, { class: 'filter-chip', title: text }, [el('span', 'Đang lọc theo', { class: 'filter-chip-label' }), el('strong', text)]),
    btn
  ]);
}

/** Các dòng thông tin ngắn, mỗi dòng một phần tử. */
export function infoLines(lines, className = 'text-sm muted') {
  return el('div', null, { class: `info-lines ${className}`.trim() }, lines
    .filter(Boolean)
    .map(line => (line instanceof Node ? line : el('div', line))));
}

/** Avatar theo vai trò; size: 'sm' | 'md' | 'lg' | 'xl'. */
export function buildAvatar(who = {}, { size = 'sm', role = null } = {}) {
  const r = role || who.roleHint || (who.app_role || who.role ? appRole(who) : 'customer');
  const seed = who.seed || who.id || who.email || who.full_name || who.name || '';
  const node = el('span', null, {
    class: `avatar-circle avatar-art avatar-art--${size}`,
    role: 'img',
    'aria-label': `Ảnh đại diện ${who.full_name || who.name || ''}`.trim()
  });
  node.innerHTML = avatarSvg(['customer', 'manager', 'admin'].includes(r) ? r : 'customer', seed);
  return node;
}

export function roleLanding(role) {
  if (role === 'admin') return 'admin-dashboard.html';
  if (role === 'manager') return 'manager-dashboard.html';
  return 'index.html';
}

export function safeReturnTo(raw, fallback = 'index.html') {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (/^[a-z0-9_-]+\.html(\?[^#]*)?(#.*)?$/i.test(trimmed)) {
    if (/^(login|register|forgot-password|reset-password)\.html/i.test(trimmed)) return fallback;
    return trimmed;
  }
  return fallback;
}

export function bookingCanCancel(booking, nowMs = Date.now()) {
  if (!booking || booking.status !== 'confirmed') return false;
  const startsAt = Date.parse(booking.starts_at);
  return Number.isFinite(startsAt) && startsAt - nowMs >= CANCELLATION_NOTICE_MS;
}

export function bookingCanReschedule(booking, nowMs = Date.now()) {
  return bookingCanCancel(booking, nowMs) && booking.payment_status === 'paid' && !booking.reschedule_from_id && !(Number(booking.reschedule_count || 0) >= 1);
}

export const BOOKING_STATUS = {
  pending: { label: 'Đang giữ chỗ', tone: 'warning' },
  confirmed: { label: 'Đã xác nhận', tone: 'success' },
  completed: { label: 'Đã hoàn thành', tone: 'info' },
  cancelled: { label: 'Đã hủy', tone: 'danger' }
};

export const CANCEL_TYPE_LABEL = {
  hold_expired: 'Hết hạn giữ chỗ',
  hold_released: 'Khách hủy giữ chỗ',
  customer: 'Khách hủy đơn',
  manager: 'Chủ sân hủy đơn',
  admin: 'Quản trị viên hủy đơn',
  account_suspended: 'Hủy do tài khoản bị tạm khóa',
  manager_suspended: 'Hủy do chủ sân tạm ngưng',
  pitch_paused: 'Hủy do sân tạm dừng nhận đơn',
  pitch_suspended: 'Hủy do sân tạm ngưng hoạt động',
  rescheduled: 'Đã đổi lịch'
};
export const isHoldCancel = b => b?.status === 'cancelled' && ['hold_expired', 'hold_released', 'account_suspended', 'manager_suspended', 'pitch_paused'].includes(b.cancel_type);
export const bookingStatusText = b => b?.status === 'cancelled' && CANCEL_TYPE_LABEL[b.cancel_type] ? CANCEL_TYPE_LABEL[b.cancel_type] : BOOKING_STATUS[b?.status]?.label || '';
export const bookingBadge = b => BOOKING_STATUS[b?.status] && { ...BOOKING_STATUS[b.status], label: bookingStatusText(b), ...(b.cancel_type === 'rescheduled' ? { tone: 'muted' } : {}) };

export const PAYMENT_STATUS = {
  pending: { label: 'Chờ thanh toán', tone: 'warning' },
  paid: { label: 'Đã thanh toán', tone: 'success' },
  refunded: { label: 'Đã hoàn tiền', tone: 'info' },
  failed: { label: 'Thanh toán lỗi', tone: 'danger' },
  cancelled: { label: 'Đã hủy', tone: 'muted' }
};

export const paymentBadgeShown = b => !!b && !['pending', 'paid', 'cancelled'].includes(b.payment_status);
export const paymentBadge = b => (paymentBadgeShown(b) ? PAYMENT_STATUS[b.payment_status] : null);

export const PITCH_STATUS = {
  active: { label: 'Đang hoạt động', tone: 'success' },
  paused: { label: 'Tạm dừng nhận đơn', tone: 'warning' },
  suspended: { label: 'Bị tạm ngưng', tone: 'danger' },
  banned: { label: 'Ngưng vĩnh viễn', tone: 'danger' }
};

export const pitchAcceptsBookings = pitch => pitch?.status === 'active' && !pitch?.manager_suspended;

export function pitchClosedNotice(pitch) {
  if (!pitch || pitchAcceptsBookings(pitch)) return null;
  if (pitch.status === 'paused') return {
    tone: 'warning',
    title: 'Sân đang tạm dừng nhận đơn mới',
    body: `${pitch.pause_reason ? `Lời nhắn từ chủ sân: ${quoteNote(pitch.pause_reason)}. ` : ''}Bạn chưa thể đặt sân này lúc này. Các đơn đã xác nhận trước đó vẫn giữ nguyên. Hãy lưu sân để quay lại khi sân mở cửa, hoặc tìm sân khác còn trống.`
  };
  if (pitch.status === 'banned') return {
    tone: 'danger',
    title: 'Sân đã ngừng hoạt động',
    body: 'Sân này không còn nhận đặt sân trên Pitch Point. Mời bạn tìm sân khác còn trống gần bạn.'
  };
  if (pitch.status === 'active' && pitch.manager_suspended) return {
    tone: 'warning',
    title: 'Sân đang tạm ngưng nhận đơn mới',
    body: 'Bạn chưa thể đặt sân này lúc này. Các đơn đã xác nhận trước đó vẫn giữ nguyên. Hãy lưu sân để quay lại sau, hoặc tìm sân khác còn trống.'
  };
  return {
    tone: 'danger',
    title: 'Sân đang tạm ngưng hoạt động',
    body: 'Sân tạm thời chưa nhận đơn mới. Nếu bạn có đơn tại sân này, đơn đã được hủy và hoàn tiền đầy đủ vào ví. Mời bạn tìm sân khác còn trống.'
  };
}

export const ACCOUNT_STATUS = {
  active: { label: 'Hoạt động', tone: 'success' },
  suspended: { label: 'Tạm khóa', tone: 'danger' }
};

export const REPORT_STATUS = {
  open: { label: 'Mới tiếp nhận', tone: 'warning' },
  reviewing: { label: 'Đang xem xét', tone: 'info' },
  resolved: { label: 'Đã xử lý', tone: 'success' },
  dismissed: { label: 'Bác bỏ', tone: 'muted' }
};

export const PITCH_TYPE_LABEL = {
  '5v5': 'Sân 5 người',
  '7v7': 'Sân 7 người',
  '11v11': 'Sân 11 người'
};

export const SLOT_STATE = {
  available: { label: 'Còn trống', tone: 'success' },
  booked: { label: 'Đã có người đặt', tone: 'warning' },
  blocked: { label: 'Chủ sân khóa', tone: 'danger' },
  past: { label: 'Đã qua', tone: 'muted' },
  closed: { label: 'Ngoài thời gian đặt', tone: 'muted' }
};

export const ACTION_LABELS = {
  warn_user: 'Cảnh cáo tài khoản',
  suspend_user: 'Tạm ngưng tài khoản',
  restore_user: 'Khôi phục tài khoản',
  set_app_role: 'Đổi vai trò tài khoản',
  assign_report: 'Nhận xử lý báo cáo',
  resolve_report: 'Kết luận báo cáo',
  save_settings: 'Lưu quy định hệ thống',
  reset_password: 'Đặt lại mật khẩu tạm',
  suspend_pitch: 'Tạm ngưng sân',
  restore_pitch: 'Mở lại sân',
  pause_pitch: 'Chủ sân tạm dừng nhận đơn',
  resume_pitch: 'Chủ sân mở lại nhận đơn',
  cancel_booking: 'Hủy đơn & hoàn tiền',
  content_create: 'Tạo nội dung',
  content_update: 'Sửa nội dung',
  content_delete: 'Xóa nội dung'
};

export const ROLE_LABELS = {
  customer: 'Khách hàng',
  manager: 'Chủ sân',
  admin: 'Quản trị viên'
};

export const COMMON_FACILITIES = [
  'Đèn chiếu sáng',
  'Phòng thay đồ',
  'Bãi đỗ xe',
  'Nước uống',
  'Cho thuê giày/áo bib',
  'Wifi miễn phí',
  'Căn tin',
  'Nhà vệ sinh'
];
