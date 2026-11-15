import { api } from '../services/api-client.js';
import { toast, renderBadge, renderStatCard } from '../core/ui.js';
import { el, formatDate, normalizeText, appRole, ACCOUNT_STATUS, ROLE_LABELS, createPager, buildAvatar, infoList } from '../core/render.js';
import { content, fetchRows, openActionDialog, params, bootManagement } from '../features/management-kit.js';

let tempDialog = null;
function showTemporaryPassword(u, password) {
  if (!tempDialog) {
    tempDialog = el('dialog', null, { 'aria-label': 'Mật khẩu tạm' });
    document.body.append(tempDialog);
  }
  const code = el('code', password, { class: 'temp-password' });
  const copyBtn = el('button', 'Sao chép', { type: 'button', class: 'button secondary sm' });
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(password); copyBtn.textContent = 'Đã sao chép'; } catch { copyBtn.textContent = 'Hãy chép tay'; }
  });
  const closeBtn = el('button', 'Đã báo cho người dùng', { type: 'button', class: 'button sm' });
  closeBtn.addEventListener('click', () => { tempDialog.close(); tempDialog.replaceChildren(); });
  tempDialog.replaceChildren(el('div', null, { class: 'stack' }, [
    el('h2', 'Mật khẩu tạm đã được tạo'),
    el('p', `Báo mật khẩu tạm này cho ${u.full_name || u.email} (${u.email}${u.phone ? `, ĐT: ${u.phone}` : ''}). Mật khẩu chỉ hiện một lần; đóng hộp thoại là không xem lại được.`, { class: 'text-sm muted' }),
    el('div', null, { class: 'row' }, [code, copyBtn]),
    el('p', 'Khi đăng nhập bằng mật khẩu tạm, người dùng phải đặt mật khẩu mới trước khi làm việc khác.', { class: 'text-xs muted' }),
    el('div', null, { class: 'row-between' }, [el('span', ''), closeBtn])
  ]));
  tempDialog.showModal();
  toast('Đã đặt lại mật khẩu tạm.');
}

let resetRequests = new Set();

async function renderAdminUsers() {
  const [users, bookings, reports] = await Promise.all([
    fetchRows('User'),
    fetchRows('Booking'),
    fetchRows('Report', { target_type: 'password_reset', status: { $in: ['open', 'reviewing'] } })
  ]);
  resetRequests = new Set(reports.map(r => r.target_id));

  let qText = params.get('q') || '';
  let roleFilter = params.get('role') || 'all';
  let statusFilter = params.get('status') || 'all';

  const qInput = el('input', null, { id: 'au-q', value: qText, placeholder: 'Tìm theo họ tên hoặc email...' });
  const roleSelect = el('select', null, { id: 'au-role' }, [
    el('option', 'Tất cả vai trò', { value: 'all' }),
    el('option', 'Khách hàng', { value: 'customer' }),
    el('option', 'Chủ sân', { value: 'manager' }),
    el('option', 'Quản trị viên', { value: 'admin' })
  ]);
  roleSelect.value = roleFilter;

  const statusSelect = el('select', null, { id: 'au-status' }, [
    el('option', 'Tất cả trạng thái', { value: 'all' }),
    el('option', 'Hoạt động', { value: 'active' }),
    el('option', 'Tạm khóa', { value: 'suspended' })
  ]);
  statusSelect.value = statusFilter;

  const filterCard = el('section', null, { class: 'surface grid-3', utility: 'u-align-items-end' }, [
    el('div', null, { class: 'field-group' }, [el('label', 'Tìm kiếm tài khoản', { for: 'au-q' }), qInput]),
    el('div', null, { class: 'field-group' }, [el('label', 'Vai trò', { for: 'au-role' }), roleSelect]),
    el('div', null, { class: 'field-group' }, [el('label', 'Trạng thái', { for: 'au-status' }), statusSelect])
  ]);

  const countRole = r => users.filter(u => appRole(u) === r).length;
  const customers = countRole('customer');
  const managers = countRole('manager');
  const suspended = users.filter(u => u.status === 'suspended').length;
  const monthAgo = Date.now() - 30 * 86400000;
  const newUsers = users.filter(u => Date.parse(u.created_date) >= monthAgo).length;
  const bookers = new Set(bookings.map(b => b.customer_id)).size;
  const statsGrid = el('div', null, { class: 'grid-4' }, [
    renderStatCard({ label: 'Tổng tài khoản', value: String(users.length), hint: `${newUsers} tài khoản mới trong 30 ngày`, icon: 'Users' }),
    renderStatCard({ label: 'Khách hàng', value: String(customers), hint: `${bookers} khách đã từng đặt sân`, icon: 'Ticket', tone: 'info' }),
    renderStatCard({ label: 'Chủ sân', value: String(managers), hint: `${countRole('admin')} quản trị viên`, icon: 'Building2', tone: 'success' }),
    renderStatCard({ label: 'Tạm khóa', value: String(suspended), hint: `${resetRequests.size} yêu cầu đặt lại mật khẩu`, icon: 'Lock', tone: 'warning' })
  ]);

  const listWrap = el('div', null, { class: 'stack' });
  const pager = createPager({ noun: 'tài khoản', onChange: () => updateList(), scrollTarget: listWrap });

  function updateList() {
    let filtered = users;
    if (qText) {
      const norm = normalizeText(qText);
      filtered = filtered.filter(u => normalizeText(`${u.full_name} ${u.email}`).includes(norm));
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => appRole(u) === roleFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => (u.status || 'active') === statusFilter);
    }

    const slice = pager.slice(filtered, [qText, roleFilter, statusFilter].join('|'));

    listWrap.replaceChildren();
    if (!slice.length) {
      listWrap.append(el('div', 'Không tìm thấy tài khoản phù hợp.', { class: 'empty' }));
    } else {
      for (const u of slice) {
        const uRole = appRole(u);
        const uBookings = bookings.filter(b => uRole === 'manager' ? b.manager_id === u.id : b.customer_id === u.id).length;

        const actions = el('div', null, { class: 'admin-card-actions admin-card-actions--grid' }, [
          el('a', `${uRole === 'manager' ? 'Đơn tại sân' : 'Đơn của họ'} (${uBookings})`, {
            href: `admin-finance.html?${uRole === 'manager' ? 'managerId' : 'userId'}=${encodeURIComponent(u.id)}`,
            class: 'button secondary sm'
          })
        ]);

        if (uRole !== 'admin') {
          const handleBtn = el('button', 'Xử lý tài khoản', { type: 'button', class: 'button sm' });
          handleBtn.addEventListener('click', () => {
            const actionSelect = el('select', null, { id: 'modal-user-action' });
            actionSelect.append(el('option', 'Cảnh cáo tài khoản', { value: 'warn_user' }));
            if (u.status === 'suspended') {
              actionSelect.append(el('option', 'Khôi phục tài khoản', { value: 'restore_user', selected: true }));
            } else if (uRole === 'manager') {
              actionSelect.append(el('option', 'Tạm ngưng chủ sân', { value: 'suspend_user' }));
            } else {
              actionSelect.append(el('option', 'Tạm khóa tài khoản', { value: 'suspend_user' }));
            }

            const extra = el('div', null, { class: 'field-group' }, [
              el('label', 'Chọn thao tác quản trị', { for: 'modal-user-action' }),
              actionSelect
            ]);
            const reasonLabel = act => act === 'restore_user' ? 'Ghi chú cho người dùng (không bắt buộc)'
              : act === 'warn_user' ? 'Nội dung cảnh cáo (bắt buộc)' : 'Lý do tạm khóa (bắt buộc)';
            const syncReason = () => {
              const label = document.querySelector('label[for="action-reason"]');
              const input = document.getElementById('action-reason');
              if (label) label.textContent = reasonLabel(actionSelect.value);
              if (input) input.required = actionSelect.value !== 'restore_user';
            };
            actionSelect.addEventListener('change', syncReason);

            openActionDialog({
              title: `Xử lý tài khoản: ${u.full_name || u.email}`,
              description: `Email: ${u.email}
Vai trò hiện tại: ${ROLE_LABELS[uRole] || uRole}
Trạng thái: ${ACCOUNT_STATUS[u.status]?.label || u.status}`,
              label: reasonLabel(actionSelect.value),
              required: false,
              placeholder: 'Nhập lý do cảnh cáo, tạm khóa hoặc ghi chú khi khôi phục...',
              extraFields: extra,
              danger: u.status !== 'suspended',
              confirmLabel: 'Xác nhận',
              async onConfirm(reason) {
                const act = actionSelect.value;
                if (act !== 'restore_user' && !reason) {
                  throw new Error(act === 'warn_user' ? 'Vui lòng nhập nội dung cảnh cáo.' : 'Vui lòng nhập lý do tạm khóa.');
                }
                const res = await api.functions.invoke('adminAction', { action: act, user_id: u.id, reason });
                if (res.data?.error) throw new Error(res.data.error);
                toast('Đã cập nhật trạng thái tài khoản.');
                await renderAdminUsers();
              }
            });
            syncReason();
          });
          actions.append(handleBtn);

          const resetBtn = el('button', 'Đặt lại mật khẩu', { type: 'button', class: 'button secondary sm' });
          resetBtn.addEventListener('click', () => {
            const pending = resetRequests.has(u.id);
            openActionDialog({
              title: `Đặt lại mật khẩu: ${u.full_name || u.email}`,
              description: `${pending ? 'Người dùng này đang có yêu cầu đặt lại mật khẩu. ' : ''}Hệ thống tạo một mật khẩu tạm, đăng xuất tài khoản khỏi mọi thiết bị. Bạn báo mật khẩu tạm cho người dùng; khi đăng nhập họ phải đặt mật khẩu mới.`,
              hideReason: true,
              required: false,
              danger: true,
              confirmLabel: 'Tạo mật khẩu tạm',
              async onConfirm() {
                const res = await api.functions.invoke('adminAction', { action: 'reset_password', user_id: u.id });
                if (res.data?.error) throw new Error(res.data.error);
                showTemporaryPassword(u, res.data.temporary_password);
                await renderAdminUsers();
              }
            });
          });
          actions.append(resetBtn);

          actions.append(el('a', 'Nhắn tin', { href: `messages.html?userId=${encodeURIComponent(u.id)}`, class: 'button secondary sm' }));
        }

        listWrap.append(
          el('article', null, { class: 'surface stack-sm admin-card', 'data-memory-id': `user-${u.id}` }, [
            el('div', null, { class: 'admin-user-head' }, [
              buildAvatar(u, { size: 'md' }),
              el('div', null, { class: 'admin-user-id' }, [
                el('strong', u.full_name || 'Người dùng', { class: 'admin-user-name' }),
                el('div', null, { class: 'admin-user-badges' }, [
                  el('span', ROLE_LABELS[uRole] || uRole, { class: 'badge badge--info' }),
                  renderBadge(ACCOUNT_STATUS[u.status], u.status),
                  resetRequests.has(u.id) ? el('span', 'Yêu cầu đặt lại mật khẩu', { class: 'badge badge--warning' }) : null
                ])
              ])
            ]),
            infoList([['Email', u.email], ['Điện thoại', u.phone], ['Tham gia', formatDate(u.created_date)]], { className: 'text-sm' }),
            actions
          ])
        );
      }
    }
  }

  qInput.addEventListener('input', () => { qText = qInput.value.trim(); updateList(); });
  roleSelect.addEventListener('change', () => { roleFilter = roleSelect.value; updateList(); });
  statusSelect.addEventListener('change', () => { statusFilter = statusSelect.value; updateList(); });

  content.replaceChildren(statsGrid, filterCard, listWrap, pager.el);
  updateList();
}

bootManagement(renderAdminUsers);
