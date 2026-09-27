import { getCurrentUser } from './auth-service.js';

export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  MANAGER: 'manager',
  ADMIN: 'admin',
});

function currentRelativeUrl() {
  const filename = location.pathname.split('/').pop() || 'index.html';
  return `${filename}${location.search}${location.hash}`;
}

export function requireAuth() {
  const user = getCurrentUser();
  if (user) return user;

  const params = new URLSearchParams({ returnTo: currentRelativeUrl() });
  location.replace(`login.html?${params}`);
  return null;
}

export function requireRole(allowedRoles, options = {}) {
  const user = requireAuth();
  if (!user) return null;

  const statusAllowed = user.status === 'active' || (options.allowSuspended && user.status === 'suspended');
  if (!statusAllowed || !allowedRoles.includes(user.role)) {
    location.replace('404.html');
    return null;
  }

  return user;
}
