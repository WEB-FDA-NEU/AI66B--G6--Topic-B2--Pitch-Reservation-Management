import { api } from '../services/api-client.js';
import { clearFieldErrors, setFieldError, focusFirstInvalid, renderBadge } from '../core/ui.js';
import { el, PITCH_STATUS, quoteNote } from '../core/render.js';
import { createPitchForm } from '../components/pitch-form.js';
import { content, currentUser, fetchRows, openActionDialog, params, setStatus } from './management-kit.js';

export async function renderPitchForm() {
  const pitchId = params.get('id') || params.get('pitchId');
  let pitch = null;
  if (pitchId) {
    pitch = await api.entities.Pitch.get(pitchId);
    if (pitch.manager_id !== currentUser.id) {
      location.replace('403.html');
      return;
    }
    const heading = document.querySelector('main h1');
    if (heading) heading.textContent = `Sửa sân: ${pitch.name}`;
    document.title = `Sửa sân: ${pitch.name} — Pitch Point`;
  }

  // Nút quay lại đặt trên tiêu đề trang.
  const pageHeader = document.querySelector('main .page-header');
  if (pageHeader && !pageHeader.querySelector('.page-back-link')) {
    pageHeader.prepend(el('a', '← Quay lại Sân của tôi', {
      href: 'manager-pitches.html',
      class: 'text-sm font-bold text-link page-back-link'
    }));
  }

  const { form, submitButton, syncHours, nameInput, validate, getPayload } = createPitchForm({ pitch });
  const createPitchRequestId = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.busy === 'true') return;
    clearFieldErrors(form);
    setStatus('');
    if (!validate()) {
      focusFirstInvalid(form);
      return;
    }
    const payload = getPayload();

    form.dataset.busy = 'true';
    submitButton.disabled = true;
    let saved = false;
    try {
      if (pitch) {
        if (syncHours.checked) {
          const schedules = await fetchRows('PitchSchedule', { pitch_id: pitch.id });
          for (const schedule of schedules) {
            await api.entities.PitchSchedule.update(schedule.id, { local_start: payload.open_time, local_end: payload.close_time });
          }
        }
        await api.entities.Pitch.update(pitch.id, payload);
        sessionStorage.setItem('pitch-point:flash', 'Đã lưu thông tin sân.');
      } else {
        const created = await api.functions.invoke('createPitchWithSchedule', { pitch: payload, request_id: createPitchRequestId });
        if (created.data?.error) throw new Error(created.data.error);
        sessionStorage.setItem('pitch-point:flash', 'Đã tạo sân mới và khởi tạo lịch mở cửa 7 ngày.');
      }
      saved = true;
      location.href = 'manager-pitches.html';
    } catch (err) {
      if (/cùng tên tại địa chỉ/i.test(err.message || '')) { setFieldError(nameInput, err.message); nameInput.focus(); }
      else setStatus(err.message, true);
    } finally {
      if (!saved) {
        form.dataset.busy = 'false';
        submitButton.disabled = false;
      }
    }
  });

  if (!pitch) {
    content.replaceChildren(form);
    return;
  }
  if (pitch.status === 'banned') {
    content.replaceChildren(buildPitchStatusSection(pitch));
    return;
  }
  content.replaceChildren(buildPitchStatusSection(pitch), form);
}

function buildPitchStatusSection(pitch) {
  const section = el('section', null, { class: 'surface stack-sm', 'aria-labelledby': 'pitch-status-heading' }, [
    el('div', null, { class: 'row-between' }, [
      el('h2', 'Trạng thái nhận đơn', { id: 'pitch-status-heading' }),
      renderBadge(PITCH_STATUS[pitch.status], pitch.status)
    ])
  ]);
  const text = (value) => el('p', value, { class: 'text-sm muted' });

  if (pitch.status === 'suspended' || pitch.status === 'banned') {
    const reason = pitch.suspension?.reason;
    section.append(el('div', null, { class: 'alert alert--danger stack-sm', role: 'status' }, [
      el('strong', pitch.status === 'banned' ? 'Sân đã bị ngưng vĩnh viễn' : 'Sân đang bị quản trị viên tạm ngưng'),
      el('p', `${reason ? `Lý do: ${reason}. ` : ''}${pitch.status === 'banned'
        ? 'Sân không thể mở lại hoặc chỉnh sửa.'
        : 'Sân chưa nhận đơn mới. Các đơn sắp tới đã được hủy và hoàn tiền cho khách. Bạn vẫn có thể cập nhật thông tin sân bên dưới; quản trị viên sẽ xem xét mở lại sân khi vấn đề được khắc phục.'}`, { class: 'text-sm' })
    ]));
    return section;
  }

  const paused = pitch.status === 'paused';
  section.append(text(paused
    ? `Sân đang tạm dừng nhận đơn mới${pitch.pause_reason ? `. Lời nhắn cho khách: ${quoteNote(pitch.pause_reason)}` : ''}. Khách vẫn xem được sân và thấy thông báo tạm dừng; các đơn đã xác nhận vẫn giữ nguyên.`
    : 'Sân đang nhận đơn. Khi tạm dừng, sân không nhận đơn mới; các đơn đã xác nhận vẫn giữ nguyên.'));
  const button = el('button', paused ? 'Mở lại nhận đơn' : 'Tạm dừng nhận đơn', { type: 'button', class: paused ? 'button sm' : 'button secondary sm' });
  button.addEventListener('click', () => {
    openActionDialog({
      title: paused ? `Mở lại nhận đơn: ${pitch.name}` : `Tạm dừng nhận đơn: ${pitch.name}`,
      description: paused
        ? 'Sân sẽ hiện lại trong kết quả tìm kiếm và khách có thể đặt sân ngay.'
        : 'Sân sẽ ẩn khỏi kết quả tìm kiếm và không nhận đơn mới. Giữ chỗ chưa thanh toán sẽ được hủy. Các đơn đã xác nhận vẫn giữ nguyên; khách có đơn sắp tới sẽ nhận được thông báo.',
      hideReason: paused,
      required: false,
      label: 'Lời nhắn cho khách (không bắt buộc)',
      placeholder: 'Ví dụ: Sân đang thay cỏ, dự kiến mở lại từ 20/11.',
      async onConfirm(reason) {
        const res = await api.functions.invoke('setPitchStatus', { pitch_id: pitch.id, status: paused ? 'active' : 'paused', reason });
        if (res.data?.error) throw new Error(res.data.error);
        const d = res.data;
        sessionStorage.setItem('pitch-point:flash', paused
          ? 'Sân đã mở lại nhận đơn.'
          : `Đã tạm dừng nhận đơn.${d.released ? ` ${d.released} giữ chỗ chưa thanh toán đã được hủy.` : ''}${d.kept ? ` Đã báo cho ${d.kept} khách có đơn sắp tới.` : ''}`);
        location.reload();
      }
    });
  });
  section.append(el('div', null, { class: 'row' }, [button]));
  return section;
}
