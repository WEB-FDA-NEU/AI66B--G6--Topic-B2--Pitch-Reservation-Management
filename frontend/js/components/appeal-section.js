import { api } from '../services/api-client.js';
import { toast, clearFieldErrors, setFieldError, renderBadge } from '../core/ui.js';
import { el, formatDateTime, REPORT_STATUS } from '../core/render.js';

export function focusAppeal() {
  const section = document.getElementById('appeal');
  if (!section) return;
  section.scrollIntoView({ block: 'start' });
  (section.querySelector('textarea') || section.querySelector('h2'))?.focus({ preventScroll: true });
}


export function whenPageVisible(fn) {
  const root = document.documentElement;
  if (!root.classList.contains('page-initializing')) { requestAnimationFrame(fn); return; }
  const observer = new MutationObserver(() => {
    if (!root.classList.contains('page-initializing')) { observer.disconnect(); requestAnimationFrame(fn); }
  });
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
}


export async function buildAppealSection(u, onSubmitted) {
  const appeals = (await api.entities.Report.filter({ reporter_id: u.id, target_type: 'account' }, { sort: '-created_date' })).items || [];
  if (u.status !== 'suspended' && !appeals.length) return null;
  const section = el('section', null, { id: 'appeal', class: 'surface stack', 'aria-labelledby': 'appeal-title' }, [
    el('h2', 'Khiếu nại tới quản trị viên', { id: 'appeal-title', tabindex: '-1' }),
    el('p', u.status === 'suspended'
      ? 'Tài khoản của bạn đang tạm khóa. Hãy cho quản trị viên biết vì sao bạn cho rằng tài khoản nên được mở lại. Kết quả sẽ được gửi vào mục Thông báo.'
      : 'Các khiếu nại bạn đã gửi trước đây.', { class: 'text-sm muted' })
  ]);
  for (const a of appeals) {
    section.append(el('article', null, { class: 'card card--compact stack-sm' }, [
      el('div', null, { class: 'row-between' }, [
        renderBadge(REPORT_STATUS[a.status], a.status),
        el('span', `Gửi lúc ${formatDateTime(a.created_date)}`, { class: 'text-xs muted' })
      ]),
      el('p', a.details || '', { class: 'text-sm' }),
      a.decision ? el('p', `Trả lời của quản trị viên: ${a.decision}`, { class: 'alert alert--info text-sm' }) : null
    ]));
  }
  const hasOpen = appeals.some(a => ['open', 'reviewing'].includes(a.status));
  if (u.status === 'suspended' && !hasOpen) {
    const body = el('textarea', null, { id: 'appeal-body', name: 'body', required: true, minlength: '10', maxlength: '1000', placeholder: 'Ví dụ: Tôi không hủy đơn nào gần đây, mong quản trị viên kiểm tra lại…' });
    const submit = el('button', 'Gửi khiếu nại', { type: 'submit', class: 'button' });
    const appealForm = el('form', null, { class: 'stack-sm', novalidate: true, 'data-suspended-ok': '' }, [
      el('div', null, { class: 'field-group' }, [el('label', 'Nội dung khiếu nại', { for: 'appeal-body' }), body]),
      submit
    ]);
    appealForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit.disabled) return;
      clearFieldErrors(appealForm);
      if (body.value.trim().length < 10) {
        setFieldError(body, 'Vui lòng viết ít nhất 10 ký tự để quản trị viên hiểu tình huống của bạn.');
        body.focus();
        return;
      }
      submit.disabled = true;
      try {
        const r = await api.functions.invoke('submitAppeal', { body: body.value.trim() });
        if (r.data?.error) throw new Error(r.data.error);
        toast('Đã gửi khiếu nại. Quản trị viên sẽ trả lời qua mục Thông báo.');
        await onSubmitted?.();
        whenPageVisible(focusAppeal);
      } catch (err) {
        setFieldError(body, err.message || 'Chưa gửi được khiếu nại. Vui lòng thử lại.');
        body.focus();
      } finally {
        submit.disabled = false;
      }
    });
    section.append(appealForm);
  } else if (hasOpen) {
    section.append(el('p', 'Khiếu nại của bạn đang chờ quản trị viên xem xét.', { class: 'text-sm font-bold' }));
  }
  return section;
}
