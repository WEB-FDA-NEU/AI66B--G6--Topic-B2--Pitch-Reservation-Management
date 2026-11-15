export function translateLink(link) {
  if (!link) return 'notifications.html';
  if (/^https?:\/\//i.test(link) || /^[a-z0-9_-]+\.html(\?|#|$)/i.test(link)) return link;
  const idx = link.search(/[?#]/);
  const rawPath = idx === -1 ? link : link.slice(0, idx);
  const rest = idx === -1 ? '' : link.slice(idx);
  const routes = {
    '/': 'index.html',
    '/search': 'search.html',
    '/notifications': 'notifications.html',
    '/user/messages': 'messages.html',
    '/manager/messages': 'messages.html',
    '/admin/messages': 'messages.html',
    '/user/settings': 'account-settings.html',
    '/manager/settings': 'account-settings.html',
    '/settings': 'settings.html',
    '/user/bookings': 'booking-history.html',
    '/user/favorites': 'favorite-pitches.html',
    '/user/payments': 'payment-history.html',
    '/manager': 'manager-dashboard.html',
    '/manager/pitches': 'manager-pitches.html',
    '/manager/calendar': 'manager-bookings.html',
    '/manager/revenue': 'manager-revenue.html',
    '/admin': 'admin-dashboard.html',
    '/admin/users': 'admin-users.html',
    '/admin/pitch-managers': 'admin-pitch-managers.html',
    '/admin/pitches': 'admin-pitch-moderation.html',
    '/admin/bookings': 'admin-finance.html',
    '/admin/reports': 'admin-reports.html',
    '/admin/content': 'admin-content.html',
    '/admin/activity-log': 'admin-activity-log.html',
    '/admin/settings': 'admin-settings.html'
  };
  if (routes[rawPath]) return routes[rawPath] + rest;
  const bookingMatch = rawPath.match(/^\/user\/bookings\/([^/]+)$/);
  if (bookingMatch) return 'booking-details.html?id=' + encodeURIComponent(bookingMatch[1]);
  const pitchMatch = rawPath.match(/^\/(?:pitch|pitches)\/([^/]+)$/);
  if (pitchMatch) return 'pitch-detail.html?id=' + encodeURIComponent(pitchMatch[1]);
  const ownerMatch = rawPath.match(/^\/(?:owner|owners)\/([^/]+)$/);
  if (ownerMatch) return 'pitch-owner-profile.html?id=' + encodeURIComponent(ownerMatch[1]);
  const managerBookings = rawPath.match(/^\/manager\/pitches\/([^/]+)\/bookings$/);
  if (managerBookings) return 'manager-bookings.html?pitchId=' + encodeURIComponent(managerBookings[1]);
  const managerAvail = rawPath.match(/^\/manager\/pitches\/([^/]+)\/availability$/);
  if (managerAvail) return 'pitch-availability.html?id=' + encodeURIComponent(managerAvail[1]);
  return 'notifications.html';
}
export const CTA_PAGES = new Set('index search settings reset-password register add-pitch edit-pitch pitch-detail pitch-availability payment payment-history pitch-owner-profile notifications messages manager-revenue manager-pitches manager-dashboard manager-bookings login admin-settings booking-schedule admin-reports admin-pitch-moderation admin-pitch-managers admin-dashboard admin-content booking-details booking-confirmation admin-users booking-history booking-result forgot-password favorite-pitches admin-finance admin-activity-log account-settings 403 404 500'.split(' ').map(name => `${name}.html`));
export function validContentLink(value) {
  if (!value) return true;
  if (typeof value !== 'string') return false;
  if (/^[a-z0-9-]+\.html(?:[?#][^\s]*)?$/.test(value)) return CTA_PAGES.has(value.split(/[?#]/, 1)[0]);
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
