import { api } from '../services/api-client.js';
import { toast, renderBadge, renderStatCard } from '../core/ui.js';
import { el, formatVnd, normalizeText, appRole, ACCOUNT_STATUS, createPager, buildAvatar, infoList } from '../core/render.js';
import { content, fetchRows, openActionDialog, params, bootManagement } from '../features/management-kit.js';

async function renderAdminManagers() {
  const [users, pitches, payments, refunds, bookings] = await Promise.all([
    fetchRows('User'),
    fetchRows('Pitch'),
    fetchRows('Payment'),
    fetchRows('Refund'),
    fetchRows('Booking')
  ]);

  const ownerIds = new Set(pitches.map(p => p.manager_id).filter(Boolean));
  const managers = users.filter(u => appRole(u) === 'manager' || ownerIds.has(u.id));
  let qText = params.get('q') || '';

  const qInput = el('input', null, { id: 'am-q', value: qText, placeholder: 'Tìm chủ sân theo tên hoặc email...' });
  const topSection = el('section', null, { class: 'surface stack' }, [
    el('div', 'Tạm ngưng chủ sân sẽ khóa quyền quản lý và các sân ngừng nhận đơn mới. Đơn đã xác nhận vẫn giữ nguyên.', {
      class: 'alert alert--info text-sm'
    }),
    el('div', null, { class: 'field-group' }, [
      el('label', 'Tìm kiếm chủ sân', { for: 'am-q' }),
      qInput
    ])
  ]);

  const managerIds = new Set(managers.map(m => m.id));
  const sumBy = (rows) => rows.filter(r => managerIds.has(r.manager_id)).reduce((s, r) => s + Number(r.amount_vnd || 0), 0);
  const suspendedManagers = managers.filter(m => m.status === 'suspended').length;
  const managedPitches = pitches.filter(p => managerIds.has(p.manager_id));
  const upcomingAll = bookings.filter(b => managerIds.has(b.manager_id) && b.status === 'confirmed' && Date.parse(b.starts_at) > Date.now()).length;
  const statsGrid = el('div', null, { class: 'grid-4' }, [
    renderStatCard({ label: 'Tổng chủ sân', value: String(managers.length), hint: `${managers.length - suspendedManagers} đang hoạt động`, icon: 'Users' }),
    renderStatCard({ label: 'Sân đang quản lý', value: String(managedPitches.length), hint: `${managedPitches.filter(p => p.status === 'active').length} sân đang nhận đơn`, icon: 'Building2', tone: 'info' }),
    renderStatCard({ label: 'Đơn sắp tới', value: String(upcomingAll), hint: 'Đơn đã xác nhận chưa đá', icon: 'ReceiptText', tone: 'success' }),
    renderStatCard({ label: 'Thực nhận', value: formatVnd(sumBy(payments) - sumBy(refunds)), hint: `${suspendedManagers} chủ sân đang tạm ngưng`, icon: 'Wallet', tone: 'warning' })
  ]);

  const listWrap = el('div', null, { class: 'stack' });
  const pager = createPager({ noun: 'chủ sân', onChange: () => updateList(), scrollTarget: listWrap });

  function updateList() {
    let filtered = managers;
    if (qText) {
      const norm = normalizeText(qText);
      filtered = filtered.filter(m => normalizeText(`${m.full_name} ${m.email}`).includes(norm));
    }

    const slice = pager.slice(filtered, qText);
    listWrap.replaceChildren();
    if (!filtered.length) {
      listWrap.append(el('div', 'Không tìm thấy chủ sân phù hợp.', { class: 'empty' }));
      return;
    }

    for (const m of slice) {
      const mPitches = pitches.filter(p => p.manager_id === m.id);
      const mGross = payments.filter(p => p.manager_id === m.id).reduce((s, p) => s + Number(p.amount_vnd || 0), 0);
      const mRef = refunds.filter(r => r.manager_id === m.id).reduce((s, r) => s + Number(r.amount_vnd || 0), 0);

      const warnBtn = el('button', 'Cảnh cáo chủ sân', { type: 'button', class: 'button secondary sm' });
      warnBtn.addEventListener('click', () => {
        openActionDialog({
          title: `Cảnh cáo chủ sân: ${m.full_name || m.email}`,
          description: 'Cảnh cáo sẽ được lưu vào nhật ký quản trị và gửi thông báo tới chủ sân.',
          label: 'Nội dung cảnh cáo (bắt buộc)',
          required: true,
          async onConfirm(reason) {
            const res = await api.functions.invoke('adminAction', {
              action: 'warn_user',
              user_id: m.id,
              reason
            });
            if (res.data?.error) throw new Error(res.data.error);
            toast('Đã gửi cảnh cáo tới chủ sân.');
            await renderAdminManagers();
          }
        });
      });

      const suspended = m.status === 'suspended';
      const upcoming = bookings.filter(b => b.manager_id === m.id && b.status === 'confirmed' && Date.parse(b.starts_at) > Date.now()).length;
      const statusBtn = el('button', suspended ? 'Khôi phục chủ sân' : 'Tạm ngưng chủ sân', { type: 'button', class: suspended ? 'button sm' : 'button danger-outline sm' });
      statusBtn.addEventListener('click', () => {
        openActionDialog({
          title: suspended ? `Khôi phục chủ sân: ${m.full_name || m.email}` : `Tạm ngưng chủ sân: ${m.full_name || m.email}`,
          description: suspended
            ? 'Chủ sân sẽ quản lý lại được sân và các sân nhận đơn mới trở lại. Chủ sân nhận được thông báo.'
            : `Chủ sân sẽ không quản lý được sân và ${mPitches.length} sân của họ ngừng nhận đơn mới. ${upcoming ? `${upcoming} đơn sắp tới vẫn giữ nguyên; nếu không thể phục vụ, hãy hủy và hoàn tiền trong mục "Đơn tại sân".` : 'Hiện không có đơn sắp tới nào bị ảnh hưởng.'} Chủ sân nhận được thông báo kèm lý do.`,
          label: suspended ? 'Ghi chú (không bắt buộc)' : 'Lý do tạm ngưng (bắt buộc)',
          required: !suspended,
          danger: !suspended,
          confirmLabel: suspended ? 'Khôi phục' : 'Tạm ngưng',
          async onConfirm(reason) {
            const res = await api.functions.invoke('adminAction', { action: suspended ? 'restore_user' : 'suspend_user', user_id: m.id, reason });
            if (res.data?.error) throw new Error(res.data.error);
            toast(suspended ? 'Đã khôi phục chủ sân.' : 'Đã tạm ngưng chủ sân.');
            await renderAdminManagers();
          }
        });
      });

      listWrap.append(
        el('article', null, { class: 'surface stack-sm admin-card', 'data-memory-id': `manager-${m.id}` }, [
          el('div', null, { class: 'admin-user-head' }, [
            buildAvatar(m, { size: 'md', role: 'manager' }),
            el('div', null, { class: 'admin-user-id' }, [
              el('strong', m.full_name || m.email, { class: 'admin-user-name' }),
              el('div', null, { class: 'admin-user-badges' }, [renderBadge(ACCOUNT_STATUS[m.status], m.status)])
            ])
          ]),
          infoList([['Email', m.email], ['Điện thoại', m.phone]], { className: 'text-sm' }),
          el('dl', null, { class: 'admin-money-row' }, [
            el('div', null, {}, [el('dt', 'Đã thu'), el('dd', formatVnd(mGross))]),
            el('div', null, {}, [el('dt', 'Đã hoàn tiền'), el('dd', formatVnd(mRef))]),
            el('div', null, {}, [el('dt', 'Thực nhận'), el('dd', formatVnd(mGross - mRef), { class: 'is-net' })])
          ]),
          el('div', null, { class: 'admin-card-actions admin-card-actions--grid' }, [
            el('a', `Xem sân (${mPitches.length})`, { href: `admin-pitch-moderation.html?managerId=${encodeURIComponent(m.id)}`, class: 'button secondary sm' }),
            el('a', `Đơn tại sân (${upcoming} sắp tới)`, { href: `admin-finance.html?managerId=${encodeURIComponent(m.id)}`, class: 'button secondary sm' }),
            warnBtn,
            statusBtn
          ])
        ])
      );
    }
  }

  qInput.addEventListener('input', () => { qText = qInput.value.trim(); updateList(); });
  content.replaceChildren(statsGrid, topSection, listWrap, pager.el);
  updateList();
}

bootManagement(renderAdminManagers);
