import { initShell, createIcon } from '../core/ui.js';
import { el, roleLanding, appRole } from '../core/render.js';
import { buildPitchScene, buildPitchBrand } from '../components/pitch-scene.js';

function render403(main, user, landing) {
  const role = appRole(user);
  const customerOnly = new URLSearchParams(location.search).get('reason') === 'customer-only';
  const title = customerOnly ? 'Tính năng này dành cho khách hàng' : 'Bạn không có quyền truy cập';
  const body = !customerOnly
    ? 'Tài khoản hiện tại không có quyền mở trang này. Hãy quay lại khu vực phù hợp với vai trò của bạn.'
    : role === 'manager'
      ? 'Trang này dành cho khách hàng. Đơn của khách tại sân bạn nằm ở mục "Đơn đặt sân" của khu chủ sân.'
      : role === 'admin'
        ? 'Trang này dành cho khách hàng. Đơn của khách nằm ở mục "Đơn & hoàn tiền" của khu quản trị.'
        : 'Chỉ tài khoản khách hàng mới dùng được tính năng này.';

  const pitch = buildPitchScene({
    labelledBy: 'error-403-title',
    card: 'red',
    content: [
      el('span', null, { class: 'pitch-scene-badge pitch-scene-badge--danger', 'aria-hidden': 'true' }, [createIcon('ShieldAlert', 36)]),
      el('h1', title, { id: 'error-403-title' }),
      el('p', body, { class: 'pitch-scene-body' }),
      el('div', null, { class: 'row', utility: 'u-justify-content-center' }, [
        el('a', 'Về khu vực của tôi', { href: landing, class: 'button' }),
        el('a', 'Trang chủ', { href: 'index.html', class: 'button secondary' }),
        !user ? el('a', 'Đăng nhập', { href: 'login.html', class: 'button secondary' }) : null
      ])
    ]
  });
  mountErrorScene(main, pitch);
}

function mountErrorScene(main, scene) {
  main.className = 'pitch-shell';
  main.replaceChildren(buildPitchBrand(), scene);
}

function render404(main, landing) {
  mountErrorScene(main, buildPitchScene({
    labelledBy: 'error-404-title',
    card: 'yellow',
    content: [
      el('p', '404', { class: 'pitch-scene-code' }),
      el('h1', 'Không tìm thấy trang', { id: 'error-404-title' }),
      el('p', 'Đường dẫn bạn truy cập không có trong hệ thống Pitch Point. Hãy kiểm tra lại đường dẫn hoặc tìm sân bóng từ trang chủ.', { class: 'pitch-scene-body' }),
      el('div', null, { class: 'row', utility: 'u-justify-content-center' }, [
        el('a', 'Về khu vực của tôi', { href: landing, class: 'button' }),
        el('a', 'Tìm sân bóng', { href: 'search.html', class: 'button secondary' })
      ])
    ]
  }));
}

function render500(main) {
  const reloadBtn = el('button', 'Thử lại', { type: 'button', class: 'button' });
  reloadBtn.addEventListener('click', () => window.location.reload());
  mountErrorScene(main, buildPitchScene({
    labelledBy: 'error-500-title',
    card: 'yellow',
    content: [
      el('p', '500', { class: 'pitch-scene-code' }),
      el('h1', 'Hệ thống đang gặp sự cố', { id: 'error-500-title' }),
      el('p', 'Yêu cầu của bạn chưa xử lý được. Vui lòng thử lại; nếu tình trạng kéo dài, hãy liên hệ ban quản lý.', { class: 'pitch-scene-body' }),
      el('div', null, { class: 'row', utility: 'u-justify-content-center' }, [
        reloadBtn,
        el('a', 'Về trang chủ', { href: 'index.html', class: 'button secondary' })
      ])
    ]
  }));
}

const user = await initShell();
const main = document.querySelector('main');
const file = location.pathname.split('/').pop() || '404.html';

if (main) {
  const page = document.body.dataset.page;
  const code = ['403', '500'].includes(page) ? page : file.startsWith('403') ? '403' : file.startsWith('500') ? '500' : '404';
  const landing = user ? roleLanding(appRole(user)) : 'index.html';

  if (code === '403') {
    render403(main, user, landing);
  } else if (code === '500') {
    render500(main);
  } else {
    render404(main, landing);
  }
}

document.documentElement.classList.remove('page-initializing');
