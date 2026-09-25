// ============================================================
//  <site-footer>  —  cùng cơ chế với <site-header>.
//  Đây là bằng chứng pattern nhân rộng được: cần thêm khối dùng chung nào
//  (footer, breadcrumb, banner khuyến mãi…) thì tạo thêm một file như file này.
//
//  TODO: sửa nội dung footer ở đây — sửa một lần, mọi trang đổi theo.
// ============================================================

const YEAR = new Date().getFullYear();

const TEMPLATE = /* html */ `
<footer class="site-footer">
  <div class="container site-footer__grid">

    <div class="site-footer__brand">
      <p class="logo">Pitch Point</p>
      <p class="site-footer__tagline">Hệ thống đặt sân bóng trực tuyến</p>
    </div>

    <nav class="site-footer__col" aria-labelledby="ft-discover">
      <h3 class="site-footer__title" id="ft-discover">Khám phá</h3>
      <ul>
        <li><a href="index.html">Trang chủ</a></li>
        <li><a href="search.html">Tìm sân bóng</a></li>
        <li><a href="index.html#booking-steps-title">Cách đặt sân</a></li>
      </ul>
    </nav>

    <nav class="site-footer__col" aria-labelledby="ft-help">
      <h3 class="site-footer__title" id="ft-help">Hỗ trợ</h3>
      <ul>
        <li><a href="index.html#booking-steps-title">Câu hỏi thường gặp</a></li>
        <li><span class="site-footer__pending">Quy định đặt và huỷ sân <small>Sắp có</small></span></li>
        <li><span class="site-footer__pending">Liên hệ <small>Sắp có</small></span></li>
      </ul>
    </nav>

    <nav class="site-footer__col" aria-labelledby="ft-about">
      <h3 class="site-footer__title" id="ft-about">Về chúng tôi</h3>
      <ul>
        <li><a href="index.html">Về Pitch Point</a></li>
        <li><span class="site-footer__pending">Điều khoản <small>Sắp có</small></span></li>
        <li><span class="site-footer__pending">Bảo mật <small>Sắp có</small></span></li>
      </ul>
    </nav>

  </div>

  <div class="container site-footer__bottom">
    <p>© ${YEAR} Pitch Point — Đồ án môn Web Design &amp; Programming, lớp AI66B.</p>
  </div>
</footer>`;

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = TEMPLATE;      // hằng số do ta viết → an toàn
  }
}

customElements.define('site-footer', SiteFooter);
