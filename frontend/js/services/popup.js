// ============================================================
//  Popup Service — Hệ thống popup bắt mắt cho Pitch Point.
//  Tạo <dialog> động, hỗ trợ 5 biến thể màu, hiệu ứng slide-up
//  và icon nhấp nháy. Thay thế việc điều hướng sang trang lỗi.
// ============================================================

const ICONS = {
  success: '✓',
  error:   '✕',
  warning: '⏱',
  auth:    '🔒',
  info:    'ℹ',
};

/**
 * Hiển thị popup bắt mắt.
 * @param {{ type?: string, title: string, message: string, actions?: Array }} opts
 *   - type: 'success' | 'error' | 'warning' | 'auth' | 'info'
 *   - actions: [{ text, href?, onClick?, primary? }]
 */
export function showPopup({ type = 'info', title, message, actions = [] }) {
  let dialog = document.getElementById('pp-popup');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'pp-popup';
    dialog.className = 'pp-popup';

    const card = document.createElement('div');
    card.className = 'pp-popup__card';

    const iconEl = document.createElement('div');
    iconEl.className = 'pp-popup__icon';

    const titleEl = document.createElement('h2');
    titleEl.className = 'pp-popup__title';

    const msgEl = document.createElement('p');
    msgEl.className = 'pp-popup__message';

    const actEl = document.createElement('div');
    actEl.className = 'pp-popup__actions';

    card.append(iconEl, titleEl, msgEl, actEl);
    dialog.appendChild(card);
    document.body.appendChild(dialog);
  }

  dialog.dataset.type = type;
  dialog.querySelector('.pp-popup__icon').textContent = ICONS[type] || ICONS.info;
  dialog.querySelector('.pp-popup__title').textContent = title;
  dialog.querySelector('.pp-popup__message').textContent = message;

  const container = dialog.querySelector('.pp-popup__actions');
  container.replaceChildren();

  actions.forEach(action => {
    if (action.href) {
      const a = document.createElement('a');
      a.className = `pp-popup__btn${action.primary ? ' pp-popup__btn--primary' : ''}`;
      a.href = action.href;
      a.textContent = action.text;
      container.appendChild(a);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pp-popup__btn${action.primary ? ' pp-popup__btn--primary' : ''}`;
      btn.textContent = action.text;
      btn.addEventListener('click', () => {
        dialog.close();
        action.onClick?.();
      });
      container.appendChild(btn);
    }
  });

  // Prevent dismiss on backdrop click for important popups
  dialog.oncancel = (e) => {
    if (type === 'auth' || type === 'error') e.preventDefault();
  };

  dialog.showModal();
  return dialog;
}

export function closePopup() {
  document.getElementById('pp-popup')?.close();
}
