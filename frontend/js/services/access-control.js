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

export function requireRole(allowedRoles) {
  const user = requireAuth();
  if (!user) return null;

  if (user.status !== 'active' || !allowedRoles.includes(user.role)) {
    location.replace('403.html');
    return null;
  }

  return user;
}
