import {
  getCurrentUser,
  getSession,
  logout as clearSession,
} from './services/auth-service.js';

export const getToken = () => getSession()?.accessToken ?? null;
export const getUser = () => getCurrentUser();
export const isLoggedIn = () => Boolean(getCurrentUser());

export function logout() {
  clearSession();
  location.assign('index.html');
}

export function requireLogin() {
  const filename = location.pathname.split('/').pop() || 'index.html';
  const returnTo = `${filename}${location.search}${location.hash}`;
  const params = new URLSearchParams({ returnTo });
  location.assign(`login.html?${params}`);
}
