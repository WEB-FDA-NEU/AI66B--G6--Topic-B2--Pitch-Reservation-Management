import { api } from '../services/api-client.js';
import { validContentLink } from '../core/links.js';
import { toast, clearFieldErrors, setFieldError, focusFirstInvalid } from '../core/ui.js';
import { el, formatDateTime, createPager } from '../core/render.js';
import { content, currentUser, fetchRows, openActionDialog, bootManagement } from '../features/management-kit.js';

async function renderAdminContent() {
  const items = await fetchRows('ContentItem');
  let editingItem = null;

  const titleInput = el('input', null, { id: 'ac-title', name: 'title', required: true, maxlength: '200', placeholder: 'Nhập tiêu đề thông báo hoặc banner...' });
  const typeSelect = el('select', null, { id: 'ac-type', name: 'type' }, [
    el('option', 'Thông báo hệ thống', { value: 'announcement' }),
    el('option', 'Banner nổi bật trang chủ', { value: 'banner' })
  ]);
  const TYPE_HINTS = {
    announcement: 'Hiện ở đầu trang chủ và gửi tới chuông thông báo của mọi tài khoản.',
    banner: 'Hiện ở mục "Chương trình nổi bật" trên trang chủ.'
  };
  const typeHint = el('p', TYPE_HINTS.announcement, { id: 'ac-type-hint', class: 'field-hint' });
  typeSelect.setAttribute('aria-describedby', 'ac-type-hint');
  const syncTypeHint = () => { typeHint.textContent = TYPE_HINTS[typeSelect.value] || ''; };
  typeSelect.addEventListener('change', syncTypeHint);
  const statusSelect = el('select', null, { id: 'ac-status', name: 'status' }, [
    el('option', 'Công khai ngay', { value: 'published' }),
    el('option', 'Lưu bản nháp', { value: 'draft' })
  ]);
  const bodyInput = el('textarea', null, { id: 'ac-body', name: 'body', required: true, maxlength: '2000', placeholder: 'Nội dung chi tiết hiển thị trên trang chủ...' });
  const ctaLabelInput = el('input', null, { id: 'ac-cta-label', name: 'cta_label', maxlength: '60', placeholder: 'VD: Tìm sân ngay' });
  const CTA_TARGETS = [['', 'Không gắn trang'], ['search.html', 'Tìm sân'], ['index.html', 'Trang chủ'], ['booking-history.html', 'Đơn của tôi'], ['favorite-pitches.html', 'Sân yêu thích'], ['notifications.html', 'Thông báo'], ['messages.html', 'Tin nhắn'], ['register.html', 'Đăng ký tài khoản'], ['__custom', 'Địa chỉ web khác…']];
  const ctaPageSelect = el('select', null, { id: 'ac-cta-page' }, CTA_TARGETS.map(([value, label]) => el('option', label, { value })));
  const ctaLinkInput = el('input', null, { id: 'ac-cta-link', name: 'cta_link', type: 'url', placeholder: 'https://…', hidden: true, 'aria-label': 'Địa chỉ web' });
  const syncCtaInput = () => { ctaLinkInput.hidden = ctaPageSelect.value !== '__custom'; };
  ctaPageSelect.addEventListener('change', syncCtaInput);
  const getCtaLink = () => ctaPageSelect.value === '__custom' ? ctaLinkInput.value.trim() : ctaPageSelect.value;
  const setCtaLink = (value) => {
    const known = CTA_TARGETS.some(([v]) => v === value && v !== '__custom');
    ctaPageSelect.value = known ? value : value ? '__custom' : '';
    ctaLinkInput.value = known ? '' : (value || '');
    syncCtaInput();
  };

  const formHeading = el('h2', 'Tạo nội dung / banner mới');
  const submitBtn = el('button', 'Lưu & Xuất bản', { type: 'submit', class: 'button' });
  const cancelEditBtn = el('button', 'Hủy sửa', { type: 'button', class: 'button secondary', hidden: true });

  const form = el('form', null, { class: 'surface stack', novalidate: true }, [
    formHeading,
    el('div', null, { class: 'grid-3' }, [
      el('div', null, { class: 'field-group' }, [el('label', 'Tiêu đề *', { for: 'ac-title' }), titleInput]),
      el('div', null, { class: 'field-group' }, [el('label', 'Loại nội dung', { for: 'ac-type' }), typeSelect, typeHint]),
      el('div', null, { class: 'field-group' }, [el('label', 'Trạng thái', { for: 'ac-status' }), statusSelect])
    ]),
    el('div', null, { class: 'field-group' }, [el('label', 'Nội dung chi tiết *', { for: 'ac-body' }), bodyInput]),
    el('div', null, { class: 'grid-2' }, [
      el('div', null, { class: 'field-group' }, [el('label', 'Nhãn nút hành động (không bắt buộc)', { for: 'ac-cta-label' }), ctaLabelInput]),
      el('div', null, { class: 'field-group' }, [el('label', 'Bấm nút sẽ mở', { for: 'ac-cta-page' }), ctaPageSelect, ctaLinkInput])
    ]),
    el('div', null, { class: 'row' }, [submitBtn, cancelEditBtn])
  ]);

  cancelEditBtn.addEventListener('click', () => {
    editingItem = null;
    form.reset(); syncCtaInput(); syncTypeHint();
    formHeading.textContent = 'Tạo nội dung / banner mới';
    submitBtn.textContent = 'Lưu & Xuất bản';
    cancelEditBtn.hidden = true;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;
    clearFieldErrors(form);
    if (!titleInput.value.trim()) setFieldError(titleInput, 'Vui lòng nhập tiêu đề.');
    if (!bodyInput.value.trim()) setFieldError(bodyInput, 'Vui lòng nhập nội dung.');
    const ctaLink = getCtaLink();
    if (ctaPageSelect.value === '__custom' && !ctaLink) setFieldError(ctaLinkInput, 'Vui lòng nhập địa chỉ web.');
    else if (!validContentLink(ctaLink)) setFieldError(ctaPageSelect.value === '__custom' ? ctaLinkInput : ctaPageSelect, 'Địa chỉ web phải bắt đầu bằng https://.');
    if (form.querySelector('[aria-invalid="true"]')) {
      focusFirstInvalid(form);
      return;
    }
    const payload = {
      title: titleInput.value.trim(),
      type: typeSelect.value,
      status: statusSelect.value,
      body: bodyInput.value.trim(),
      cta_label: ctaLabelInput.value.trim(),
      cta_link: getCtaLink(),
      created_by_name: currentUser.full_name || currentUser.email,
      published_at: new Date().toISOString()
    };
    submitBtn.disabled = true;
    try {
      if (editingItem) {
        await api.entities.ContentItem.update(editingItem.id, payload);
        toast('Đã cập nhật nội dung.');
      } else {
        await api.entities.ContentItem.create(payload);
        toast('Đã tạo nội dung mới.');
      }
      await renderAdminContent();
    } catch (err) {
      setFieldError(titleInput, err.message || 'Không lưu được nội dung.');
    } finally {
      submitBtn.disabled = false;
    }
  });

  const listWrap = el('div', null, { class: 'stack' });
  const pager = createPager({ noun: 'nội dung', onChange: () => renderItems(), scrollTarget: listWrap });
  function renderItems() {
    listWrap.replaceChildren();
    const pageRows = pager.slice(items);
    if (!items.length) {
      listWrap.append(el('div', 'Chưa có thông báo hoặc banner nào.', { class: 'empty' }));
    } else {
      for (const c of pageRows) {
        const editBtn = el('button', 'Sửa', { type: 'button', class: 'button secondary sm' });
        editBtn.addEventListener('click', () => {
          editingItem = c;
          titleInput.value = c.title || '';
          typeSelect.value = c.type || 'announcement';
          syncTypeHint();
          statusSelect.value = c.status || 'published';
          bodyInput.value = c.body || '';
          ctaLabelInput.value = c.cta_label || '';
          setCtaLink(c.cta_link || '');
          formHeading.textContent = `Đang chỉnh sửa: ${c.title}`;
          submitBtn.textContent = 'Lưu cập nhật';
          cancelEditBtn.hidden = false;
          titleInput.focus();
        });

        const toggleBtn = el('button', c.status === 'published' ? 'Chuyển thành nháp' : 'Xuất bản ngay', {
          type: 'button',
          class: 'button secondary sm'
        });
        toggleBtn.addEventListener('click', async () => {
          const nextStatus = c.status === 'published' ? 'draft' : 'published';
          await api.entities.ContentItem.update(c.id, { status: nextStatus });
          toast(nextStatus === 'published' ? 'Đã xuất bản nội dung lên trang chủ.' : 'Đã ẩn nội dung về trạng thái nháp.');
          await renderAdminContent();
        });

        const delBtn = el('button', 'Xóa', { type: 'button', class: 'button danger-outline sm' });
        delBtn.addEventListener('click', () => {
          openActionDialog({
            title: 'Xóa nội dung',
            danger: true,
            confirmLabel: 'Xóa',
            description: `Xác nhận xóa "${c.title}"?`,
            required: false,
            hideReason: true,
            async onConfirm() {
              await api.entities.ContentItem.delete(c.id);
              toast('Đã xóa nội dung.');
              await renderAdminContent();
            }
          });
        });

        listWrap.append(
          el('article', null, { class: 'surface row-between' }, [
            el('div', null, { class: 'stack-sm' }, [
              el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
                el('span', c.type === 'banner' ? 'Banner trang chủ' : 'Thông báo', { class: 'badge badge--info' }),
                el('span', c.status === 'published' ? 'Đang hiển thị' : 'Bản nháp', {
                  class: `badge ${c.status === 'published' ? 'badge--success' : 'badge--muted'}`
                }),
                el('span', formatDateTime(c.published_at || c.created_date), { class: 'text-xs muted' })
              ]),
              el('h2', c.title || 'Nội dung', { utility: 'u-font-size-1p1rem' }),
              el('p', c.body || '', { class: 'text-sm muted' })
            ]),
            el('div', null, { class: 'row' }, [editBtn, toggleBtn, delBtn])
          ])
        );
      }
    }
  }
  renderItems();

  content.replaceChildren(form, listWrap, pager.el);
}

bootManagement(renderAdminContent);
