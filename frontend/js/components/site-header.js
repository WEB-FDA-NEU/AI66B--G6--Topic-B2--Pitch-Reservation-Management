// ============================================================
//  <site-header>  —  Custom Element (Web Components, chuẩn của trình duyệt)
//
//  Viết header MỘT LẦN ở đây. Mỗi trang chỉ cần một dòng:
//      <site-header></site-header>
//
//  Không build step, không thư viện. `customElements` là API có sẵn
//  của trình duyệt từ 2018, giống hệt <template> mà ta đang dùng.
//
//  TODO: sửa nội dung header ở đây — sửa một lần, mọi trang đổi theo.
// ============================================================
import { initHeader } from '../auth.js';

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
      <label class="visually-hidden" for="hq">Tìm Sân Bóng</label>
      <input class="input" id="hq" name="q" type="search" placeholder="Tìm sân theo tên hoặc địa điểm...">
    </form>

    <nav id="site-header-navigation" aria-label="Điều hướng chính">
      <a class="site-header__link" href="index.html" data-nav="home">Trang chủ</a>
      <a class="site-header__link" href="search.html" data-nav="search">Tìm Sân</a>
      <span data-auth="guest" hidden>
        <a class="btn" href="login.html">Đăng nhập</a>
        <a class="btn btn--primary" href="register.html">Đăng ký</a>
      </span>
      <span data-auth="user" hidden>
        <span data-user-name></span>
        <a class="btn" href="#" data-action="logout">Thoát</a>
      </span>
    </nav>
  </div>
</header>`;

class SiteHeader extends HTMLElement {
  connectedCallback() {
    // innerHTML ở đây AN TOÀN vì chuỗi là hằng số do ta viết, không phải
    // dữ liệu người dùng nhập. Quy tắc thật là: KHÔNG đưa dữ liệu người dùng
    // qua innerHTML. Xem docs/CACH-DUNG-FILE-CHUNG.md mục 9.
    this.innerHTML = TEMPLATE;
    initHeader();          // bật/tắt phần Đăng nhập ↔ Tài khoản

    // Truyền dữ liệu VÀO component bằng thuộc tính HTML:
    //     <site-header active="home"></site-header>
    // → mục "Tìm sân" được tô đậm. Đây là cách làm component "khác nhau
    //   một chút" ở từng trang mà vẫn chỉ có một file nguồn.
    const active = this.getAttribute('active');
    if (active) this.querySelector(`[data-nav="${active}"]`)?.classList.add('is-active');

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
}

customElements.define('site-header', SiteHeader);
