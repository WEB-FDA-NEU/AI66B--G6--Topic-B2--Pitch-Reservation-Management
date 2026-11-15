import { renderBadge, renderStatCard } from '../core/ui.js';
import { el, formatVnd, formatDate, formatDateTime, todayLocal, addDays, REPORT_STATUS, ACTION_LABELS } from '../core/render.js';
import { buildVisualBarChartWithTable, content, fetchRows, mainEl, bootManagement } from '../features/management-kit.js';

async function renderAdminDashboard() {
  const pageHeader = mainEl.querySelector('.page-header');
  if (pageHeader) {
    const title = pageHeader.querySelector('h1');
    if (title) title.textContent = 'Bảng điều khiển hệ thống';
  }
  const [users, pitches, bookings, payments, refunds, reports, auditEvents] = await Promise.all([
    fetchRows('User'),
    fetchRows('Pitch'),
    fetchRows('Booking'),
    fetchRows('Payment'),
    fetchRows('Refund'),
    fetchRows('Report'),
    fetchRows('AuditEvent')
  ]);

  const today = todayLocal();
  const todayBookings = bookings.filter(b => b.local_date === today);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount_vnd || 0), 0);
  const totalRefunded = refunds.reduce((s, r) => s + Number(r.amount_vnd || 0), 0);
  const activeReports = reports.filter(r => ['open', 'reviewing'].includes(r.status));

  const suspendedUsers = users.filter(u => u.status === 'suspended');
  const suspendedPitches = pitches.filter(p => ['suspended', 'banned'].includes(p.status));

  const statsGrid = el('div', null, { class: 'grid-4' }, [
    renderStatCard({
      label: 'Người dùng',
      value: String(users.length),
      hint: `${suspendedUsers.length} tài khoản đang tạm ngưng`,
      icon: 'Users',
      tone: 'primary',
      progress: suspendedUsers.length ? ((users.length - suspendedUsers.length) / users.length) * 100 : null
    }),
    renderStatCard({
      label: 'Sân bóng',
      value: String(pitches.length),
      hint: `${suspendedPitches.length} sân bị tạm ngưng`,
      icon: 'Building2',
      tone: 'info',
      progress: suspendedPitches.length ? ((pitches.length - suspendedPitches.length) / pitches.length) * 100 : null
    }),
    renderStatCard({
      label: 'Đơn hôm nay',
      value: String(todayBookings.length),
      hint: `${bookings.length} đơn trong hệ thống`,
      icon: 'ReceiptText',
      tone: 'success'
    }),
    renderStatCard({
      label: 'Doanh thu',
      value: formatVnd(totalPaid - totalRefunded),
      hint: 'Tổng thu sau khi trừ hoàn tiền',
      icon: 'Wallet',
      tone: 'warning'
    })
  ]);

  const dayRows = [];
  for (let i = -5; i <= 2; i++) {
    const d = addDays(today, i);
    const dayB = bookings.filter(b => b.local_date === d && ['confirmed', 'completed'].includes(b.status));
    const dayRev = dayB.reduce((s, b) => s + Number(b.amount_vnd || 0), 0);
    dayRows.push({
      label: formatDate(d),
      shortLabel: d.slice(8, 10) + '/' + d.slice(5, 7),
      value: dayRev,
      note: `${dayB.length} đơn hợp lệ`
    });
  }

  const chartSection = buildVisualBarChartWithTable({
    title: 'Giá trị đặt sân theo ngày',
    subtitle: 'Đơn đã thanh toán, theo ngày đá.',
    rows: dayRows,
    labelHeader: 'Ngày thi đấu',
    valueHeader: 'Tổng giá trị đơn (₫)',
    formatValue: formatVnd,
    unitNoun: 'ngày'
  });

  const bottomGrid = el('div', null, { class: 'grid-2' });

  const reportsBox = el('section', null, { class: 'surface stack' }, [
    el('div', null, { class: 'row-between' }, [
      el('h2', `Báo cáo cần xử lý (${activeReports.length})`),
      el('a', 'Mở trang báo cáo →', { href: 'admin-reports.html', class: 'text-xs font-bold text-link' })
    ])
  ]);
  if (!activeReports.length) {
    reportsBox.append(el('div', 'Không có báo cáo nào đang tồn đọng.', { class: 'empty' }));
  } else {
    for (const r of activeReports.slice(0, 5)) {
      reportsBox.append(
        el('div', null, { class: 'card card--compact card--subtle row-between' }, [
          el('div', null, {}, [
            el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
              renderBadge(REPORT_STATUS[r.status], r.status),
              el('strong', r.target_name || 'Đối tượng báo cáo', { class: 'text-sm' })
            ]),
            el('div', r.reason || '', { class: 'text-xs muted' })
          ]),
          el('a', 'Xử lý', { href: 'admin-reports.html', class: 'button secondary sm' })
        ])
      );
    }
  }

  const auditBox = el('section', null, { class: 'surface stack' }, [
    el('div', null, { class: 'row-between' }, [
      el('h2', 'Nhật ký hoạt động gần đây'),
      el('a', 'Xem toàn bộ →', { href: 'admin-activity-log.html', class: 'text-xs font-bold text-link' })
    ])
  ]);
  if (!auditEvents.length) {
    auditBox.append(el('div', 'Chưa có thao tác quản trị nào được ghi nhận.', { class: 'empty' }));
  } else {
    for (const e of auditEvents.slice(0, 5)) {
      auditBox.append(
        el('div', null, { class: 'card card--compact card--subtle stack-sm' }, [
          el('div', null, { class: 'row-between' }, [
            el('strong', ACTION_LABELS[e.action] || e.action || 'Thao tác quản trị', { class: 'text-sm' }),
            el('span', formatDateTime(e.created_date), { class: 'text-xs muted' })
          ]),
          el('div', `${e.actor_name || 'Admin'} → ${e.entity_type || 'Đối tượng'} ${e.target_name ? `(${e.target_name})` : ''}`, { class: 'text-xs muted' }),
          e.reason ? el('div', `Lý do: ${e.reason}`, { class: 'text-xs' }) : null
        ])
      );
    }
  }

  bottomGrid.append(reportsBox, auditBox);
  content.replaceChildren(statsGrid, chartSection, bottomGrid);
}

bootManagement(renderAdminDashboard);
