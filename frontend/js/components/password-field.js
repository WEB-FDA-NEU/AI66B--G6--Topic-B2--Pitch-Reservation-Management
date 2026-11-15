import { el } from '../core/render.js';

export function createPasswordField(id, name, labelText, autocomplete = 'current-password') {
  const input = el('input', null, {
    id,
    name,
    type: 'password',
    required: true,
    autocomplete
  });
  const toggle = el('button', 'Hiện', {
    type: 'button',
    class: 'password-toggle-btn',
    'aria-label': `Hiện ${labelText.toLowerCase()}`
  });
  toggle.addEventListener('click', () => {
    const isPwd = input.type === 'password';
    input.type = isPwd ? 'text' : 'password';
    toggle.textContent = isPwd ? 'Ẩn' : 'Hiện';
    toggle.setAttribute('aria-label', `${isPwd ? 'Ẩn' : 'Hiện'} ${labelText.toLowerCase()}`);
  });
  const wrap = el('div', null, { class: 'password-input-wrap' }, [input, toggle]);
  return {
    group: el('div', null, { class: 'field-group' }, [
      el('label', labelText, { for: id }),
      wrap
    ]),
    input
  };
}
