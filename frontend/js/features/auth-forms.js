import { api } from '../services/api-client.js';
import { clearFieldErrors, setFieldError, focusFirstInvalid, createIcon, buildThemeToggle } from '../core/ui.js';
import { el, appRole, roleLanding, safeReturnTo, formatVnd } from '../core/render.js';
import { INITIAL_BALANCE_VND, PASSWORD_MIN_LENGTH } from '../core/config.js';
import { createPasswordField } from '../components/password-field.js';
import { buildPitchScene, buildPitchBrand } from '../components/pitch-scene.js';
import { $, getCurrentUser, page, params, say } from './customer-kit.js';

function mountPitchPage(main, scene) {
  main.className = 'pitch-shell';
  main.replaceChildren(buildPitchBrand(buildThemeToggle({ compact: true })), scene);
}

function mountAuthScene(main, content) {
  mountPitchPage(main, buildPitchScene({ content, wide: true, card: 'yellow', labelledBy: 'auth-title' }));
}

export async function renderAuthPage() {
  const main = $('#main');
  if (!main) return;
  const errEl = el('p', '', { id: 'error', role: 'alert' });
  const rawReturn = params.get('returnTo') || params.get('return') || '';

  const iconName = page === 'register' ? 'UserPlus' : page === 'login' ? 'LogIn' : 'Lock';
  const heroTitle = page === 'login'
    ? 'Đăng nhập'
    : page === 'register'
      ? 'Tạo tài khoản'
      : page === 'forgot-password' ? 'Quên mật khẩu' : 'Đặt mật khẩu mới';
  const heroDesc = page === 'login'
    ? (rawReturn ? 'Vui lòng đăng nhập để tiếp tục thao tác trước đó.' : 'Đăng nhập để đặt sân và theo dõi các đơn của bạn.')
    : page === 'register'
      ? `Tài khoản mới được tặng sẵn ${formatVnd(INITIAL_BALANCE_VND)} trong ví để đặt sân thử.`
      : page === 'forgot-password'
        ? 'Gửi yêu cầu tới quản trị viên. Quản trị viên sẽ đặt lại mật khẩu tạm và báo cho bạn.'
        : 'Chọn mật khẩu mới cho tài khoản của bạn.';


  const hero = el('div', null, { class: 'auth-hero' }, [
    el('div', null, { class: 'auth-icon-badge', 'aria-hidden': 'true' }, [createIcon(iconName, 28)]),
    el('h1', heroTitle, { id: 'auth-title' }),
    el('p', heroDesc, { class: 'muted text-sm' })
  ]);

  const authCard = el('div', null, { class: 'surface auth-card stack' });

  if (page === 'login' || page === 'register') {
    const current = await getCurrentUser();
    if (current) {
      const logout = el('button', 'Đăng xuất để dùng tài khoản khác', { type: 'button', class: 'button secondary' });
      logout.addEventListener('click', async () => {
        logout.disabled = true;
        try {
          await api.auth.logout();
          await renderAuthPage();
        } catch (err) {
          errEl.textContent = err.message || 'Không thể đăng xuất.';
          logout.disabled = false;
        }
      });
      const scene = buildPitchScene({
        labelledBy: 'signed-in-title',
        card: 'yellow',
        content: [
          el('span', null, { class: 'pitch-scene-badge', 'aria-hidden': 'true' }, [createIcon('LogIn', 30)]),
          el('h1', 'Bạn đã đăng nhập', { id: 'signed-in-title' }),
          el('p', 'Tiếp tục với tài khoản hiện tại hoặc đăng xuất để chuyển tài khoản.', { class: 'pitch-scene-body' }),
          el('p', `Bạn đang đăng nhập là ${current.full_name || current.email}`, { class: 'font-bold' }),
          el('div', null, { class: 'row', utility: 'u-justify-content-center' }, [
            el('a', 'Tiếp tục', { href: safeReturnTo(rawReturn, roleLanding(appRole(current))), class: 'button' }),
            logout
          ]),
          errEl
        ]
      });
      mountPitchPage(main, scene);
      return;
    }
  }

  if (page === 'forgot-password') {
    renderForgotPassword(authCard, errEl);
    const footerNote = el('p', null, { class: 'auth-footer-note' }, [
      document.createTextNode('Nhớ ra mật khẩu? '),
      el('a', 'Đăng nhập', { href: 'login.html' })
    ]);
    mountAuthScene(main, [hero, authCard, footerNote]);
    return;
  }

  if (page === 'reset-password') {
    await renderNewPassword(authCard, errEl, hero, rawReturn);
    mountAuthScene(main, [hero, authCard]);
    return;
  }

  if (page === 'login') {
    const emailInput = el('input', null, {
      id: 'login-email',
      name: 'email',
      type: 'email',
      required: true,
      autocomplete: 'email',
      placeholder: 'ban@example.com'
    });
    const pwdField = createPasswordField('login-password', 'password', 'Mật khẩu', 'current-password');

    const demoBar = el('div', null, { class: 'card card--compact card--subtle stack-sm', utility: 'u-border-style-dashed' }, [
      el('div', 'Điền nhanh tài khoản dùng thử (mật khẩu 123456)', { class: 'text-xs font-bold muted' }),
      el('div', null, { class: 'row', utility: 'u-gap-0p4rem' })
    ]);
    const demoBtnRow = demoBar.querySelector('.row');
    for (const [label, email] of [
      ['Khách hàng', 'customer@pitchpoint.test'],
      ['Chủ sân', 'manager@pitchpoint.test'],
      ['Quản trị', 'admin@pitchpoint.test']
    ]) {
      const b = el('button', label, { type: 'button', class: 'button secondary sm' });
      b.addEventListener('click', () => {
        emailInput.value = email;
        pwdField.input.value = '123456';
        clearFieldErrors(form);
        say('');
        for (const sib of demoBtnRow.querySelectorAll('button')) sib.classList.remove('active-demo-pill');
        b.classList.add('active-demo-pill');
        form.querySelector('button[type="submit"]')?.focus();
      });
      demoBtnRow.append(b);
    }

    const form = el('form', null, { id: 'auth-form', class: 'stack', novalidate: true, 'data-suspended-ok': '' }, [
      el('div', null, { class: 'field-group' }, [
        el('label', 'Email', { for: 'login-email' }),
        emailInput
      ]),
      pwdField.group,
      el('div', null, { class: 'row-between text-xs' }, [
        el('span', ''),
        el('a', 'Quên mật khẩu?', { href: 'forgot-password.html', class: 'text-link', utility: 'u-color-brand-text u-font-weight-600' })
      ]),
      el('button', 'Đăng nhập', { type: 'submit', class: 'button full' })
    ]);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      if (submit.disabled) return;
      clearFieldErrors(form);
      say('');
      const email = emailInput.value.trim();
      const password = pwdField.input.value;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError(emailInput, 'Vui lòng nhập địa chỉ email hợp lệ.');
      }
      if (!password) {
        setFieldError(pwdField.input, 'Vui lòng nhập mật khẩu.');
      }
      if (form.querySelector('[aria-invalid="true"]')) {
        focusFirstInvalid(form);
        return;
      }
      submit.disabled = true;
      try {
        const u = await api.auth.loginViaEmailPassword(email, password);
        const dest = safeReturnTo(rawReturn, roleLanding(appRole(u)));
        location.href = u.must_change_password ? `reset-password.html?returnTo=${encodeURIComponent(dest)}` : dest;
      } catch (err) {
        say(err.message);
        submit.disabled = false;
        submit.focus();
      }
    });

    authCard.append(demoBar, form, errEl);
    const footerNote = el('p', null, { class: 'auth-footer-note' }, [
      document.createTextNode('Chưa có tài khoản? '),
      el('a', 'Đăng ký', { href: `register.html${rawReturn ? `?returnTo=${encodeURIComponent(rawReturn)}` : ''}` })
    ]);
    mountAuthScene(main, [hero, authCard, footerNote]);
    return;
  }

  const nameInput = el('input', null, { id: 'reg-name', name: 'full_name', required: true, maxlength: '100', placeholder: 'Nguyễn Văn A' });
  const phoneInput = el('input', null, { id: 'reg-phone', name: 'phone', type: 'tel', maxlength: '20', placeholder: '0912345678 (không bắt buộc)' });
  const emailInput = el('input', null, { id: 'reg-email', name: 'email', type: 'email', required: true, placeholder: 'ban@example.com' });
  const pwdField = createPasswordField('reg-password', 'password', `Mật khẩu (tối thiểu ${PASSWORD_MIN_LENGTH} ký tự)`, 'new-password');
  const confirmField = createPasswordField('reg-confirm', 'confirm_password', 'Nhập lại mật khẩu', 'new-password');

  const form = el('form', null, { id: 'auth-form', class: 'stack', novalidate: true, 'data-suspended-ok': '' }, [
    el('div', null, { class: 'field-group' }, [
      el('label', 'Họ và tên', { for: 'reg-name' }),
      nameInput
    ]),
    el('div', null, { class: 'field-group' }, [
      el('label', 'Số điện thoại (không bắt buộc)', { for: 'reg-phone' }),
      phoneInput
    ]),
    el('div', null, { class: 'field-group' }, [
      el('label', 'Email', { for: 'reg-email' }),
      emailInput
    ]),
    pwdField.group,
    confirmField.group,
    el('button', 'Tạo tài khoản & đăng nhập', { type: 'submit', class: 'button full' })
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    clearFieldErrors(form);
    say('');
    const full_name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const password = pwdField.input.value;
    const confirm = confirmField.input.value;

    if (!full_name) setFieldError(nameInput, 'Vui lòng nhập họ và tên của bạn.');
    if (phone && !/^(?:0|\+84)[0-9]{9,10}$/.test(phone)) {
      setFieldError(phoneInput, 'Số điện thoại cần bắt đầu bằng 0 hoặc +84 và gồm 10–11 chữ số.');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError(emailInput, 'Vui lòng nhập địa chỉ email hợp lệ.');
    }
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      setFieldError(pwdField.input, `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`);
    }
    if (confirm !== password) {
      setFieldError(confirmField.input, 'Mật khẩu nhập lại không khớp.');
    }
    if (form.querySelector('[aria-invalid="true"]')) {
      focusFirstInvalid(form);
      return;
    }

    submit.disabled = true;
    try {
      await api.auth.register({ full_name, phone, email, password });
      const u = await api.auth.loginViaEmailPassword(email, password);
      location.href = safeReturnTo(rawReturn, roleLanding(appRole(u)));
    } catch (err) {
      say(err.message);
      submit.disabled = false;
      submit.focus();
    }
  });

  authCard.append(form, errEl);
  const footerNote = el('p', null, { class: 'auth-footer-note' }, [
    document.createTextNode('Đã có tài khoản? '),
    el('a', 'Đăng nhập', { href: `login.html${rawReturn ? `?returnTo=${encodeURIComponent(rawReturn)}` : ''}` })
  ]);
  mountAuthScene(main, [hero, authCard, footerNote]);
}


// ---- quên mật khẩu
function renderForgotPassword(authCard, errEl) {
  const emailInput = el('input', null, { id: 'forgot-email', name: 'email', type: 'email', required: true, autocomplete: 'email', placeholder: 'ban@example.com' });
  const noteInput = el('textarea', null, {
    id: 'forgot-note', name: 'note', maxlength: '500',
    placeholder: 'Ví dụ: số điện thoại hoặc cách liên hệ để quản trị viên báo mật khẩu tạm cho bạn (không bắt buộc)'
  });
  const form = el('form', null, { id: 'auth-form', class: 'stack', novalidate: true }, [
    el('div', null, { class: 'field-group' }, [el('label', 'Email đăng nhập', { for: 'forgot-email' }), emailInput]),
    el('div', null, { class: 'field-group' }, [el('label', 'Ghi chú cho quản trị viên (không bắt buộc)', { for: 'forgot-note' }), noteInput]),
    el('button', 'Gửi yêu cầu đặt lại mật khẩu', { type: 'submit', class: 'button full' })
  ]);
  const steps = el('ol', null, { class: 'text-sm muted stack-sm', utility: 'u-padding-left-1p25rem' }, [
    el('li', 'Bạn gửi yêu cầu bằng email đăng nhập.'),
    el('li', 'Quản trị viên kiểm tra và đặt một mật khẩu tạm, rồi báo cho bạn qua số điện thoại của tài khoản hoặc cách liên hệ bạn ghi trong ô ghi chú bên dưới.'),
    el('li', 'Bạn đăng nhập bằng mật khẩu tạm và đặt ngay mật khẩu mới.')
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    clearFieldErrors(form);
    say('');
    const email = emailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError(emailInput, 'Vui lòng nhập địa chỉ email hợp lệ.');
      emailInput.focus();
      return;
    }
    submit.disabled = true;
    try {
      const res = await api.auth.resetPasswordRequest(email, noteInput.value.trim());
      authCard.replaceChildren(
        el('div', null, { class: 'alert alert--success stack-sm', role: 'status' }, [
          el('strong', 'Đã gửi yêu cầu'),
          el('p', res?.message || 'Quản trị viên đã nhận được yêu cầu của bạn.', { class: 'text-sm' })
        ]),
        el('a', 'Về trang đăng nhập', { href: 'login.html', class: 'button' })
      );
      authCard.querySelector('[role="status"]')?.focus?.();
    } catch (err) {
      say(err.message);
      submit.disabled = false;
    }
  });
  authCard.append(steps, form, errEl);
}


// ---- đặt mật khẩu mới
async function renderNewPassword(authCard, errEl, hero, rawReturn) {
  const user = await getCurrentUser();
  if (!user) {
    hero.querySelector('p').textContent = 'Bạn cần đăng nhập bằng mật khẩu tạm do quản trị viên cung cấp trước khi đặt mật khẩu mới.';
    authCard.append(
      el('div', null, { class: 'row' }, [
        el('a', 'Đăng nhập', { href: 'login.html', class: 'button' }),
        el('a', 'Quên mật khẩu?', { href: 'forgot-password.html', class: 'button secondary' })
      ]),
      errEl
    );
    return;
  }
  const temp = Boolean(user.must_change_password);
  if (temp) {
    authCard.append(el('div', null, { class: 'alert alert--warning text-sm', role: 'status' }, [
      el('strong', 'Bạn đang dùng mật khẩu tạm. '),
      document.createTextNode('Hãy đặt mật khẩu mới để tiếp tục sử dụng Pitch Point.')
    ]));
  }
  const current = createPasswordField('np-current', 'current_password', temp ? 'Mật khẩu tạm' : 'Mật khẩu hiện tại', 'current-password');
  const fresh = createPasswordField('np-new', 'new_password', `Mật khẩu mới (tối thiểu ${PASSWORD_MIN_LENGTH} ký tự)`, 'new-password');
  const confirm = createPasswordField('np-confirm', 'confirm_password', 'Nhập lại mật khẩu mới', 'new-password');
  const form = el('form', null, { id: 'auth-form', class: 'stack', novalidate: true, 'data-suspended-ok': '' }, [
    current.group, fresh.group, confirm.group,
    el('button', 'Lưu mật khẩu mới', { type: 'submit', class: 'button full' })
  ]);
  const logout = el('button', 'Đăng xuất', { type: 'button', class: 'button ghost sm' });
  logout.addEventListener('click', async () => {
    await api.auth.logout().catch(() => {});
    location.href = 'login.html';
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    clearFieldErrors(form);
    say('');
    if (!current.input.value) setFieldError(current.input, temp ? 'Vui lòng nhập mật khẩu tạm.' : 'Vui lòng nhập mật khẩu hiện tại.');
    if (fresh.input.value.length < PASSWORD_MIN_LENGTH) setFieldError(fresh.input, `Mật khẩu mới phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`);
    if (confirm.input.value !== fresh.input.value) setFieldError(confirm.input, 'Mật khẩu nhập lại không khớp.');
    if (form.querySelector('[aria-invalid="true"]')) { focusFirstInvalid(form); return; }
    submit.disabled = true;
    try {
      const u = await api.auth.changePassword(current.input.value, fresh.input.value);
      sessionStorage.setItem('pitch-point:flash', 'Đã đặt mật khẩu mới.');
      const back = safeReturnTo(rawReturn, roleLanding(appRole(u)));
      location.href = back.startsWith('reset-password.html') ? roleLanding(appRole(u)) : back;
    } catch (err) {
      say(err.message);
      submit.disabled = false;
    }
  });
  authCard.append(form, errEl, el('div', null, { class: 'row-between text-xs' }, [
    el('span', `Đăng nhập là ${user.email}`, { class: 'muted' }), logout
  ]));
}
