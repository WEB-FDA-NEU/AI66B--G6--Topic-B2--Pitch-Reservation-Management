import { initShell, getSelectedTheme, applyTheme, toast, createIcon } from '../core/ui.js';
import { el } from '../core/render.js';

const user = await initShell();
const main = document.querySelector('main');

if (main) {
  main.className = 'container container--narrow stack-lg';
  const header = el('header', null, { class: 'page-header' }, [
    el('p', 'Tùy chỉnh giao diện', { class: 'eyebrow' }),
    el('h1', 'Chế độ hiển thị'),
    el('p', 'Lựa chọn giao diện chỉ áp dụng trên thiết bị bạn đang dùng.', { class: 'muted' })
  ]);

  const card = el('section', null, { class: 'surface stack' });
  const groupTitle = el('h2', 'Giao diện màu sắc');
  const groupDesc = el('p', 'Chọn chế độ phù hợp với ánh sáng nơi bạn dùng.', { class: 'muted text-sm' });

  const options = [
    { value: 'light', icon: 'Sun', title: 'Sáng', desc: 'Nền cỏ sáng dịu mắt, độ tương phản cao khi xem ngoài trời.' },
    { value: 'dark', icon: 'Moon', title: 'Tối', desc: 'Nền xanh đậm ban đêm, giảm chói mắt khi đặt sân buổi tối.' },
    { value: 'system', icon: 'MonitorSmartphone', title: 'Theo hệ thống', desc: 'Tự động đồng bộ theo cài đặt giao diện trên thiết bị của bạn.' }
  ];

  const btnGrid = el('div', null, {
    class: 'grid-3',
    role: 'radiogroup',
    'aria-label': 'Chọn chế độ hiển thị'
  });

  const buttons = [];

  function updateButtons(selected) {
    for (const { btn, value, badge } of buttons) {
      const active = value === selected;
      btn.setAttribute('aria-checked', String(active));
      btn.tabIndex = active ? 0 : -1;
      btn.className = `card stack-sm ${active ? '' : 'card--subtle'}`.trim();
      btn.style.textAlign = 'left';
      btn.style.borderColor = active ? 'var(--primary)' : 'var(--border)';
      btn.style.borderWidth = active ? '2px' : '1px';
      badge.textContent = active ? 'Đang chọn' : 'Chọn';
      badge.className = `badge ${active ? 'badge--success' : 'badge--muted'}`;
    }
  }

  options.forEach((opt, idx) => {
    const badge = el('span', '', { class: 'badge' });
    const previewSwatch = el('div', null, { class: `theme-preview-swatch theme-preview-swatch--${opt.value}`, 'aria-hidden': 'true' }, [
      el('span', null, { class: 'theme-preview-bar' }),
      el('span', null, { class: 'theme-preview-card' })
    ]);
    const btn = el('button', null, {
      type: 'button',
      role: 'radio',
      'aria-checked': 'false',
      'data-theme-value': opt.value
    }, [
      previewSwatch,
      el('div', null, { class: 'row-between' }, [
        el('span', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
          createIcon(opt.icon, 16),
          el('strong', opt.title)
        ]),
        badge
      ]),
      el('p', opt.desc, { class: 'text-sm muted' })
    ]);

    btn.addEventListener('click', () => {
      applyTheme(opt.value);
      updateButtons(opt.value);
      const headerSelect = document.querySelector('.site-header select');
      if (headerSelect) headerSelect.value = opt.value;
      toast(`Đã chuyển sang chế độ: ${opt.title}`);
    });

    btn.addEventListener('keydown', (e) => {
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
        const nextIdx = (idx + dir + options.length) % options.length;
        buttons[nextIdx].btn.focus();
        buttons[nextIdx].btn.click();
      }
    });

    buttons.push({ btn, value: opt.value, badge });
    btnGrid.append(btn);
  });

  updateButtons(getSelectedTheme());

  const actions = el('div', null, { class: 'row' }, [
    el('a', 'Về trang chủ', { href: 'index.html', class: 'button secondary' }),
    user ? el('a', 'Cài đặt tài khoản', { href: 'account-settings.html', class: 'button secondary' }) : null
  ]);

  card.append(groupTitle, groupDesc, btnGrid, actions);
  main.replaceChildren(header, card);
}

document.documentElement.classList.remove('page-initializing');
document.documentElement.classList.add('page-ready');
