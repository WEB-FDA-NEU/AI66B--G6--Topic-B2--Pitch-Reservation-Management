import { initializeState } from '../services/storage-service.js';
import { getCurrentUser, logout } from '../services/auth-service.js';

const TEMPLATE = /* html */ `
<header class="site-header">
  <div class="container site-header__inner">
    <a class="logo" href="index.html">Pitch Point</a>

    <button
      class="btn btn--icon site-header__menu-toggle"
      type="button"
      aria-expanded="false"
      aria-controls="site-header-navigation"
      aria-label="Mở menu"
    >
      <span aria-hidden="true">☰</span>
    </button>

    <form class="site-header__search" action="search.html" method="get" role="search">
      <label class="visually-hidden" for="hq">Tìm sân bóng</label>
      <input class="input" id="hq" name="q" type="search" placeholder="Tìm sân theo tên hoặc địa điểm...">
    </form>

    <nav id="site-header-navigation" aria-label="Điều hướng chính">
      <a class="site-header__link" href="index.html" data-nav="home">Trang chủ</a>
      <a class="site-header__link" href="search.html" data-nav="search">Tìm sân</a>
      <span data-auth="guest" hidden>
        <a class="btn" href="login.html">Đăng nhập</a>
        <a class="btn btn--primary" href="register.html">Đăng ký</a>
      </span>
      <span data-auth="user" hidden>
        <span data-user-name></span>
        <button class="btn" type="button" data-action="logout">Thoát</button>
      </span>
    </nav>
  </div>
</header>`;

class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = TEMPLATE;
    this.setActiveNavigation();
    this.bindMenu();
    this.syncAuthentication();
  }

  setActiveNavigation() {
    const active = this.getAttribute('active');
    if (active) this.querySelector(`[data-nav="${active}"]`)?.classList.add('is-active');
  }

  bindMenu() {
    const menuButton = this.querySelector('.site-header__menu-toggle');
    const navigation = this.querySelector('#site-header-navigation');
    const closeMenu = () => {
      navigation?.classList.remove('is-open');
      menuButton?.setAttribute('aria-expanded', 'false');
      menuButton?.setAttribute('aria-label', 'Mở menu');
    };

    menuButton?.addEventListener('click', () => {
      const open = navigation?.classList.toggle('is-open') ?? false;
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    });

    navigation?.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu();
    });

    matchMedia('(min-width: 641px)').addEventListener('change', event => {
      if (event.matches) closeMenu();
    });
  }

  async syncAuthentication() {
    const guestControls = this.querySelector('[data-auth="guest"]');
    const userControls = this.querySelector('[data-auth="user"]');
    const userName = this.querySelector('[data-user-name]');

    try {
      await initializeState();
      const user = getCurrentUser();
      guestControls.hidden = Boolean(user);
      userControls.hidden = !user;
      if (userName) userName.textContent = user?.displayName ?? '';
    } catch {
      guestControls.hidden = false;
      userControls.hidden = true;
    }

    this.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
      logout();
      location.assign('index.html');
    });
  }
}

customElements.define('site-header', SiteHeader);
