import { api } from '../services/api-client.js';
import { renderBadge, renderStatCard, toast } from '../core/ui.js';
import { el, formatVnd, fullAddress, normalizeText, PITCH_STATUS, PITCH_TYPE_LABEL, quoteNote, createPager, infoList, buildFilterChip } from '../core/render.js';
import { content, fetchRows, openActionDialog, params, bootManagement } from '../features/management-kit.js';

async function renderAdminPitches() {
  const [pitches, bookings, reports] = await Promise.all([
    fetchRows('Pitch'),
    fetchRows('Booking'),
    fetchRows('Report')
  ]);

  let qText = params.get('q') || '';
  let statusFilter = params.get('status') || 'all';
  let managerIdParam = new URLSearchParams(location.search).get('managerId') || '';

  const qInput = el('input', null, { id: 'ap-q', value: qText, placeholder: 'Tìm theo tên sân, chủ sân hoặc địa chỉ...' });
  const statusSelect = el('select', null, { id: 'ap-status' }, [
    el('option', 'Tất cả trạng thái sân', { value: 'all' }),
    el('option', 'Đang hoạt động', { value: 'active' }),
    el('option', 'Tạm dừng nhận đơn', { value: 'paused' }),
    el('option', 'Bị tạm ngưng', { value: 'suspended' }),
    el('option', 'Ngưng vĩnh viễn', { value: 'banned' })
  ]);
  statusSelect.value = statusFilter;

  const filterCard = el('section', null, { class: 'surface stack' }, [
    el('div', 'Tạm ngưng sân sẽ hủy và hoàn tiền đầy đủ các đơn sắp tới. Sân ngưng vĩnh viễn không mở lại được.', {
      class: 'alert alert--info text-sm'
    }),
    el('div', null, { class: 'grid-2' }, [
      el('div', null, { class: 'field-group' }, [el('label', 'Tìm kiếm sân bóng', { for: 'ap-q' }), qInput]),
      el('div', null, { class: 'field-group' }, [el('label', 'Trạng thái', { for: 'ap-status' }), statusSelect])
    ])
  ]);

  const countStatus = (...st) => pitches.filter(p => st.includes(p.status)).length;
  const openPitchReports = reports.filter(r => r.target_type === 'pitch' && ['open', 'reviewing'].includes(r.status)).length;
  const upcomingAll = bookings.filter(b => b.status === 'confirmed' && Date.parse(b.starts_at) > Date.now()).length;
  const statsGrid = el('div', null, { class: 'grid-4' }, [
    renderStatCard({ label: 'Tổng sân', value: String(pitches.length), hint: `${upcomingAll} đơn sắp tới trên hệ thống`, icon: 'Building2' }),
    renderStatCard({ label: 'Đang hoạt động', value: String(countStatus('active')), hint: 'Đang nhận đơn mới', icon: 'CheckCircle2', tone: 'success' }),
    renderStatCard({ label: 'Tạm dừng / tạm ngưng', value: String(countStatus('paused', 'suspended')), hint: `${countStatus('paused')} do chủ sân, ${countStatus('suspended')} do quản trị`, icon: 'ShieldAlert', tone: 'warning' }),
    renderStatCard({ label: 'Báo cáo chờ xử lý', value: String(openPitchReports), hint: `${countStatus('banned')} sân ngưng vĩnh viễn`, icon: 'Flag', tone: 'info' })
  ]);

  const listWrap = el('div', null, { class: 'stack' });
  const pager = createPager({ noun: 'sân', onChange: () => updateList(), scrollTarget: listWrap });

  if (managerIdParam) {
    const name = pitches.find(p => p.manager_id === managerIdParam)?.manager_name || 'Chủ sân đã chọn';
    const badge = buildFilterChip(name, 'Bỏ lọc chủ sân', () => {
      managerIdParam = '';
      const url = new URL(location.href);
      url.searchParams.delete('managerId');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      badge.remove();
      updateList();
    });
    filterCard.append(badge);
  }

  function updateList() {
    let filtered = pitches;
    if (managerIdParam) filtered = filtered.filter(p => p.manager_id === managerIdParam);
    if (qText) {
      const norm = normalizeText(qText);
      filtered = filtered.filter(p => normalizeText(`${p.name} ${p.manager_name} ${p.address} ${p.district} ${p.city}`).includes(norm));
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    const pageRows = pager.slice(filtered, [managerIdParam, qText, statusFilter].join('|'));
    listWrap.replaceChildren();
    if (!filtered.length) {
      listWrap.append(el('div', 'Không tìm thấy sân bóng phù hợp.', { class: 'empty' }));
      return;
    }

    for (const p of pageRows) {
      const pBookings = bookings.filter(b => b.pitch_id === p.id && ['pending', 'confirmed'].includes(b.status));
      const pReports = reports.filter(r => r.target_type === 'pitch' && r.target_id === p.id);

      const upcoming = pBookings.filter(b => b.status === 'confirmed' && Date.parse(b.starts_at) > Date.now());
      const holds = pBookings.filter(b => b.status === 'pending');
      const handleBtn = p.status === 'banned' ? null : el('button', p.status === 'suspended' ? 'Mở lại / ngưng vĩnh viễn' : 'Tạm ngưng sân', { type: 'button', class: p.status === 'suspended' ? 'button sm' : 'button danger-outline sm' });
      handleBtn?.addEventListener('click', () => {
        const actionSelect = el('select', null, { id: 'modal-pitch-action' });
        if (p.status === 'suspended') actionSelect.append(el('option', 'Mở lại sân (nhận đơn trở lại)', { value: 'restore' }));
        else actionSelect.append(el('option', 'Tạm ngưng có thời hạn (có thể mở lại)', { value: 'suspend' }));
        actionSelect.append(el('option', 'Ngưng vĩnh viễn (không thể mở lại)', { value: 'ban' }));
        const impact = upcoming.length || holds.length
          ? `Khi tạm ngưng: ${upcoming.length} đơn sắp tới (${formatVnd(upcoming.reduce((sum, b) => sum + Number(b.amount_vnd || 0), 0))}) sẽ bị hủy và hoàn tiền đầy đủ cho khách${holds.length ? `, ${holds.length} giữ chỗ chưa thanh toán sẽ bị hủy` : ''}. Khách và chủ sân đều nhận được thông báo.`
          : 'Sân hiện không có đơn sắp tới hay giữ chỗ nào bị ảnh hưởng. Chủ sân sẽ nhận được thông báo.';
        const impactEl = el('p', impact, { class: 'alert alert--warning text-sm' });
        const syncImpact = () => { impactEl.hidden = actionSelect.value === 'restore'; };
        actionSelect.addEventListener('change', syncImpact);
        syncImpact();
        openActionDialog({
          title: `Xử lý sân: ${p.name}`,
          description: `Chủ sân: ${p.manager_name || '—'}
Trạng thái: ${PITCH_STATUS[p.status]?.label || p.status}${pReports.length ? `
Báo cáo: ${pReports.length}` : ''}`,
          label: 'Lý do (gửi kèm thông báo cho chủ sân; bắt buộc khi tạm ngưng)',
          required: false,
          placeholder: 'Ví dụ: Nhiều khách báo cáo mặt sân xuống cấp, chưa an toàn.',
          extraFields: el('div', null, { class: 'stack-sm' }, [
            el('div', null, { class: 'field-group' }, [el('label', 'Chọn thao tác', { for: 'modal-pitch-action' }), actionSelect]),
            impactEl
          ]),
          async onConfirm(reason) {
            const act = actionSelect.value;
            if (act !== 'restore' && !reason) throw new Error('Vui lòng nhập lý do tạm ngưng.');
            const res = await api.functions.invoke('adminAction', act === 'restore'
              ? { action: 'restore_pitch', pitch_id: p.id, reason }
              : { action: 'suspend_pitch', pitch_id: p.id, reason, permanent: act === 'ban' });
            if (res.data?.error) throw new Error(res.data.error);
            toast(act === 'restore' ? 'Đã mở lại sân.' : `Đã ${act === 'ban' ? 'ngưng vĩnh viễn' : 'tạm ngưng'} sân.${res.data.cancelled ? ` Đã hủy và hoàn tiền ${res.data.cancelled} đơn.` : ''}`);
            await renderAdminPitches();
          }
        });
      });
      const suspensionNote = p.suspension?.reason && ['suspended', 'banned'].includes(p.status)
        ? el('p', `Lý do ${p.status === 'banned' ? 'ngưng vĩnh viễn' : 'tạm ngưng'}: ${p.suspension.reason}`, { class: 'text-sm', utility: 'u-color-brand-text' })
        : p.status === 'paused' ? el('p', `Chủ sân đang tạm dừng nhận đơn${p.pause_reason ? `: ${quoteNote(p.pause_reason)}.` : '.'}`, { class: 'text-sm muted' }) : null;
      listWrap.append(
        el('article', null, { class: 'surface stack-sm admin-card', 'data-memory-id': `pitch-${p.id}` }, [
          el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
            renderBadge(PITCH_STATUS[p.status], p.status),
            el('span', PITCH_TYPE_LABEL[p.type] || p.type, { class: 'badge badge--info' }),
            pReports.length ? el('span', `${pReports.length} báo cáo`, { class: 'badge badge--warning' }) : null
          ]),
          el('h2', p.name, { utility: 'u-font-size-1p15rem' }),
          infoList([['Chủ sân', p.manager_name || '—'], ['Địa chỉ', fullAddress(p)], ['Giá', `${formatVnd(p.base_price_vnd)}/giờ`]], { className: 'text-sm' }),
          suspensionNote,
          el('div', null, { class: 'admin-card-actions' }, [
            el('a', 'Xem trang sân', { href: `pitch-detail.html?id=${encodeURIComponent(p.id)}`, class: 'button secondary sm' }),
            el('a', `Đơn sắp tới (${pBookings.length})`, { href: `admin-finance.html?pitchId=${encodeURIComponent(p.id)}&status=upcoming`, class: 'button secondary sm' }),
            handleBtn
          ])
        ])
      );
    }
  }

  qInput.addEventListener('input', () => { qText = qInput.value.trim(); updateList(); });
  statusSelect.addEventListener('change', () => { statusFilter = statusSelect.value; updateList(); });

  content.replaceChildren(statsGrid, filterCard, listWrap, pager.el);
  updateList();
}

bootManagement(renderAdminPitches);
