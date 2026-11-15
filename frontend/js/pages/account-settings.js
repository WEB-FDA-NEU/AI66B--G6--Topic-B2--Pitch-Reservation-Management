import { api } from '../services/api-client.js';
import { initShell, toast, clearFieldErrors, setFieldError, focusFirstInvalid, renderBadge, buildThemeToggle } from '../core/ui.js';
import { el, formatVnd, formatDateTime, appRole, buildAvatar, ACCOUNT_STATUS, ROLE_LABELS } from '../core/render.js';
import { buildAppealSection, focusAppeal, whenPageVisible } from '../components/appeal-section.js';
import { createPasswordField } from '../components/password-field.js';
import { PASSWORD_MIN_LENGTH } from '../core/config.js';
import { $, ensureAuthenticated, params, say, bootCustomerPage } from '../features/customer-kit.js';

const ROLE_VIEW = {
  customer: { walletLink: { label: 'Lịch sử thanh toán →', href: 'payment-history.html' } },
  manager: { walletLink: { label: 'Xem doanh thu →', href: 'manager-revenue.html' } },
  admin: { walletLink: { label: 'Xem đơn hệ thống →', href: 'admin-finance.html' } }
};

async function renderAccountSettingsPage() {
  const main = $('#main');
  if (!main) return;
  main.className = 'container container--narrow stack-lg';
  const u = await ensureAuthenticated();
  if (!u) return;
  const role = appRole(u);

  const [walletsRes, warningsRes] = await Promise.all([
    api.entities.Wallet.filter({ user_id: u.id }),
    api.entities.Warning.filter({ recipient_id: u.id }, { sort: '-created_date' })
  ]);
  const responseGroups = await Promise.all((warningsRes.items || []).map(w =>
    api.entities.WarningResponse.filter({ warning_id: w.id }, { sort: 'created_date', limit: 500 })
  ));
  const responsesRes = responseGroups.flatMap(group => group.items || []);

  const wallet = walletsRes.items[0] || { balance_vnd: 0 };
  const warnings = warningsRes.items || [];
  const highlightWarningId = params.get('warning');

  const profileHeader = el('section', null, { class: 'surface row-between' }, [
    el('div', null, { class: 'row', utility: 'u-gap-1rem' }, [
      buildAvatar(u, { size: 'lg' }),
      el('div', null, {}, [
        el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
          el('span', ROLE_LABELS[role] || 'Khách hàng', { class: 'badge badge--info' }),
          renderBadge(ACCOUNT_STATUS[u.status], u.status)
        ]),
        el('h1', u.full_name || 'Tài khoản của tôi', { utility: 'u-font-size-1p5rem u-margin-top-0p25rem' }),
        el('p', u.email, { class: 'text-sm muted' })
      ])
    ]),
    el('div', null, { class: 'card card--compact card--subtle', utility: 'u-text-align-right' }, [
      el('div', 'Số dư ví', { class: 'text-xs muted' }),
      el('strong', formatVnd(wallet.balance_vnd), { utility: 'u-font-size-1p25rem u-color-brand-text u-display-block' }),
      el('a', (ROLE_VIEW[role] || ROLE_VIEW.customer).walletLink.label, {
        href: (ROLE_VIEW[role] || ROLE_VIEW.customer).walletLink.href,
        class: 'text-xs font-bold text-link'
      })
    ])
  ]);

  const suspendedBanner = null;

  const nameInput = el('input', null, { id: 'acc-name', name: 'full_name', required: true, maxlength: '100', value: u.full_name || '' });
  const phoneInput = el('input', null, { id: 'acc-phone', name: 'phone', type: 'tel', maxlength: '20', value: u.phone || '', placeholder: '0912345678' });
  const emailReadonly = el('input', null, { id: 'acc-email', type: 'email', value: u.email || '', disabled: true });

  const form = el('form', null, { id: 'account-form', class: 'surface stack', novalidate: true }, [
    el('h2', 'Thông tin cá nhân'),
    el('div', null, { class: 'grid-2' }, [
      el('div', null, { class: 'field-group' }, [
        el('label', 'Họ và tên', { for: 'acc-name' }),
        nameInput
      ]),
      el('div', null, { class: 'field-group' }, [
        el('label', 'Số điện thoại', { for: 'acc-phone' }),
        phoneInput
      ])
    ]),
    el('div', null, { class: 'field-group' }, [
      el('label', 'Email đăng nhập (không thể thay đổi)', { for: 'acc-email' }),
      emailReadonly
    ]),
    el('div', null, { class: 'row-between' }, [
      el('span', ''),
      el('button', 'Lưu thay đổi', { type: 'submit', class: 'button' })
    ])
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    say('');
    const full_name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    if (!full_name) setFieldError(nameInput, 'Vui lòng nhập họ và tên.');
    if (phone && !/^(?:0|\+84)[0-9]{9,10}$/.test(phone)) {
      setFieldError(phoneInput, 'Số điện thoại không hợp lệ (cần bắt đầu bằng 0 hoặc +84, gồm 10–11 số).');
    }
    if (form.querySelector('[aria-invalid="true"]')) {
      focusFirstInvalid(form);
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      await api.auth.updateMe({ full_name, phone });
      profileHeader.querySelector('h1').textContent = full_name;
      await initShell();
      toast('Đã lưu thông tin tài khoản.');
    } catch (err) {
      setFieldError(nameInput, err.message || 'Không lưu được thông tin tài khoản.');
    } finally {
      submit.disabled = false;
      if (nameInput.getAttribute('aria-invalid') === 'true') nameInput.focus();
    }
  });

  const appearanceSection = el('section', null, { id: 'appearance', class: 'surface stack', 'aria-labelledby': 'appearance-title' }, [
    el('h2', 'Giao diện', { id: 'appearance-title' }),
    el('div', null, { class: 'row-between' }, [
      el('p', 'Chọn Sáng, Tối hoặc theo cài đặt của thiết bị. Áp dụng ngay trên thiết bị này.', { class: 'text-sm muted' }),
      buildThemeToggle()
    ])
  ]);
  const prefsSection = buildPreferencesSection(u, role);
  const passwordSection = buildPasswordSection();

  const warningsSection = el('section', null, { class: 'surface stack' }, [
    el('h2', `Cảnh cáo tài khoản (${warnings.length})`),
    el('p', 'Nếu bạn nhận được cảnh cáo từ chủ sân hoặc quản trị viên, bạn có thể gửi phản hồi giải trình tại đây.', { class: 'text-sm muted' }),
    el('div', null, { id: 'warnings', class: 'stack' })
  ]);
  const warningsList = warningsSection.querySelector('#warnings');

  if (!warnings.length) {
    warningsList.append(el('div', 'Tài khoản của bạn không có cảnh cáo nào.', { class: 'empty' }));
  } else {
    for (const w of warnings) {
      const wResponses = responsesRes.filter(r => r.warning_id === w.id);
      const isHighlighted = w.id === highlightWarningId;
      const wCard = el('article', null, {
        class: 'card stack-sm',
        style: isHighlighted ? 'border:2px solid var(--warning)' : ''
      }, [
        el('div', null, { class: 'row-between' }, [
          el('strong', `Cảnh cáo từ ${w.issuer_name || 'Hệ thống'} (${ROLE_LABELS[w.issuer_role] || w.issuer_role || ''})`),
          el('span', formatDateTime(w.created_date), { class: 'text-xs muted' })
        ]),
        el('p', w.reason || '', { class: 'alert alert--warning text-sm' })
      ]);

      if (wResponses.length) {
        const respList = el('div', null, { class: 'stack-sm' });
        for (const resp of wResponses) {
          respList.append(
            el('div', null, { class: 'card card--compact card--subtle text-sm' }, [
              el('div', null, { class: 'row-between text-xs muted' }, [el('strong', 'Phản hồi của bạn'), el('span', formatDateTime(resp.created_date))]),
              el('div', resp.body)
            ])
          );
        }
        wCard.append(respList);
      }

      const respInput = el('textarea', null, {
        id: `warning-response-${w.id}`,
        'aria-label': 'Phản hồi cảnh cáo',
        required: true,
        maxlength: '1000',
        placeholder: 'Nhập nội dung phản hồi giải trình (tối đa 1000 ký tự)...',
        utility: 'u-min-height-3p5rem'
      });
      const respForm = el('form', null, { class: 'stack-sm', novalidate: true }, [
        el('label', 'Gửi phản hồi cho cảnh cáo này', { for: `warning-response-${w.id}`, class: 'text-xs font-bold' }),
        respInput,
        el('button', 'Gửi phản hồi', { type: 'submit', class: 'button secondary sm' })
      ]);
      respForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submit = respForm.querySelector('button[type="submit"]');
        if (submit.disabled) return;
        clearFieldErrors(respForm);
        if (!respInput.value.trim()) {
          setFieldError(respInput, 'Vui lòng nhập nội dung phản hồi.');
          respInput.focus();
          return;
        }
        submit.disabled = true;
        try {
          const r = await api.functions.invoke('respondWarning', {
            warning_id: w.id,
            body: respInput.value.trim()
          });
          if (r.data?.error) throw new Error(r.data.error);
          toast('Đã gửi phản hồi cảnh cáo.');
          await renderAccountSettingsPage();
        } catch (err) {
          setFieldError(respInput, err.message || 'Không thể gửi phản hồi.');
        } finally {
          submit.disabled = false;
          if (respInput.isConnected && respInput.getAttribute('aria-invalid') === 'true') respInput.focus();
        }
      });
      wCard.append(respForm);
      warningsList.append(wCard);
    }
  }

  const appealSection = await buildAppealSection(u, renderAccountSettingsPage);
  main.replaceChildren(...[profileHeader, suspendedBanner, appealSection, form, appearanceSection, prefsSection, passwordSection, warningsSection, el('p', '', { id: 'error', role: 'alert' })].filter(Boolean));
  if (location.hash === '#password') whenPageVisible(() => document.getElementById('pw-current')?.focus());
  if (location.hash === '#appearance') whenPageVisible(focusAppearance);
  if (!window.__appearanceHashListener) {
    window.__appearanceHashListener = true;
    window.addEventListener('hashchange', () => { if (location.hash === '#appearance') focusAppearance(); });
  }
  if (location.hash === '#appeal' && appealSection) whenPageVisible(focusAppeal);
  if (!window.__appealHashListener) {
    window.__appealHashListener = true;
    window.addEventListener('hashchange', () => { if (location.hash === '#appeal') focusAppeal(); });
  }
}

function focusAppearance() {
  const section = document.getElementById('appearance');
  if (!section) return;
  section.scrollIntoView({ block: 'center' });
  section.querySelector('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true });
}

// ---- thông báo và quyền riêng tư
const PREFERENCE_VIEW = {
  customer: [
    ['notify_bookings', 'Thông báo khi đặt sân hoặc đổi lịch thành công'],
    ['notify_messages', 'Thông báo khi có tin nhắn mới từ chủ sân hoặc quản trị viên']
  ],
  manager: [
    ['notify_bookings', 'Thông báo khi có đơn mới, khách tự hủy hoặc đổi lịch'],
    ['notify_messages', 'Thông báo khi có tin nhắn mới từ khách hoặc quản trị viên'],
    ['show_phone', 'Hiện số điện thoại của tôi trên hồ sơ chủ sân công khai', 'privacy']
  ],
  admin: [
    ['notify_reports', 'Thông báo khi có báo cáo, khiếu nại hoặc yêu cầu đặt lại mật khẩu mới'],
    ['notify_messages', 'Thông báo khi người dùng nhắn tin cho quản trị viên']
  ]
};

function buildPreferencesSection(u, role) {
  const prefs = u.preferences || {};
  const items = PREFERENCE_VIEW[role] || PREFERENCE_VIEW.customer;
  const boxes = items.map(([key, label]) => {
    const input = el('input', null, { type: 'checkbox', name: key, checked: prefs[key] !== false });
    return { key, group: items.find(i => i[0] === key)[2] || 'notify', node: el('label', null, { class: 'checkbox-label' }, [input, el('span', label)]), input };
  });
  const notifyBoxes = boxes.filter(b => b.group === 'notify');
  const privacyBoxes = boxes.filter(b => b.group === 'privacy');
  const saveBtn = el('button', 'Lưu tùy chọn', { type: 'submit', class: 'button sm' });
  const section = el('form', null, { id: 'preferences', class: 'surface stack', novalidate: true }, [
    el('h2', 'Thông báo và quyền riêng tư'),
    el('div', null, { class: 'stack-sm' }, notifyBoxes.map(b => b.node)),
    el('p', 'Thông báo quan trọng (khóa tài khoản, cảnh cáo, hủy đơn, hoàn tiền, đổi mật khẩu…) luôn được gửi.', { class: 'text-xs muted' }),
    privacyBoxes.length ? el('h3', 'Quyền riêng tư') : null,
    privacyBoxes.length ? el('div', null, { class: 'stack-sm' }, privacyBoxes.map(b => b.node)) : null,
    role === 'manager'
      ? el('div', null, { class: 'row text-sm' }, [
        el('span', 'Cài đặt sân và lịch đặt:', { class: 'muted' }),
        el('a', 'Sân của tôi', { href: 'manager-pitches.html', class: 'text-link' }),
        el('a', 'Đơn đặt sân', { href: 'manager-bookings.html', class: 'text-link' })
      ])
      : null,
    el('div', null, { class: 'row-between' }, [el('span', ''), saveBtn])
  ].filter(Boolean));
  section.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    try {
      await api.auth.updateMe({ preferences: Object.fromEntries(boxes.map(b => [b.key, b.input.checked])) });
      toast('Đã lưu tùy chọn thông báo và quyền riêng tư.');
    } catch (err) {
      toast(err.message || 'Không lưu được tùy chọn.');
    } finally {
      saveBtn.disabled = false;
    }
  });
  return section;
}


// ---- đổi mật khẩu
function buildPasswordSection() {
  const current = createPasswordField('pw-current', 'current_password', 'Mật khẩu hiện tại', 'current-password');
  const fresh = createPasswordField('pw-new', 'new_password', `Mật khẩu mới (tối thiểu ${PASSWORD_MIN_LENGTH} ký tự)`, 'new-password');
  const confirm = createPasswordField('pw-confirm', 'confirm_password', 'Nhập lại mật khẩu mới', 'new-password');
  const submit = el('button', 'Đổi mật khẩu', { type: 'submit', class: 'button sm' });
  const form = el('form', null, { id: 'password', class: 'surface stack', novalidate: true }, [
    el('h2', 'Đổi mật khẩu'),
    current.group,
    el('div', null, { class: 'grid-2' }, [fresh.group, confirm.group]),
    el('div', null, { class: 'row-between' }, [
      el('span', 'Sau khi đổi, các thiết bị khác đang đăng nhập tài khoản này sẽ bị đăng xuất.', { class: 'text-xs muted' }),
      submit
    ])
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.disabled) return;
    clearFieldErrors(form);
    if (!current.input.value) setFieldError(current.input, 'Vui lòng nhập mật khẩu hiện tại.');
    if (fresh.input.value.length < PASSWORD_MIN_LENGTH) setFieldError(fresh.input, `Mật khẩu mới phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`);
    if (confirm.input.value !== fresh.input.value) setFieldError(confirm.input, 'Mật khẩu nhập lại không khớp.');
    if (form.querySelector('[aria-invalid="true"]')) { focusFirstInvalid(form); return; }
    submit.disabled = true;
    try {
      await api.auth.changePassword(current.input.value, fresh.input.value);
      form.reset();
      toast('Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.');
    } catch (err) {
      const target = /hiện tại/i.test(err.message || '') ? current.input : fresh.input;
      setFieldError(target, err.message || 'Không đổi được mật khẩu.');
      target.focus();
    } finally {
      submit.disabled = false;
    }
  });
  return form;
}

bootCustomerPage(user => renderAccountSettingsPage(user));
