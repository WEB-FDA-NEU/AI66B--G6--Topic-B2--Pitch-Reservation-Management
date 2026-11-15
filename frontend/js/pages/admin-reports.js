import { api } from '../services/api-client.js';
import { toast, renderBadge, updateLiquidIndicator, animateTabPanel } from '../core/ui.js';
import { el, formatDateTime, REPORT_STATUS, ROLE_LABELS, rememberReportsUrl, withReportsReturn, createPager, infoList } from '../core/render.js';
import { content, fetchRows, mainEl, openActionDialog, params, setStatus, bootManagement } from '../features/management-kit.js';

async function renderAdminReports() {
  const reports = await fetchRows('Report');
  let activeFilter = params.get('status') || 'active';

  const tabsWrap = el('div', null, { class: 'tabs', role: 'tablist', 'aria-label': 'Lọc báo cáo' });
  const listWrap = el('div', null, { id: 'admin-reports-panel', role: 'tabpanel', class: 'stack' });

  const tabDefs = [
    ['active', 'Đang chờ xử lý', r => ['open', 'reviewing'].includes(r.status)],
    ['open', 'Mới tiếp nhận', r => r.status === 'open'],
    ['reviewing', 'Đang xem xét', r => r.status === 'reviewing'],
    ['resolved', 'Đã xử lý', r => r.status === 'resolved'],
    ['dismissed', 'Bác bỏ', r => r.status === 'dismissed'],
    ['all', 'Tất cả', () => true]
  ];
  if (!tabDefs.some(([key]) => key === activeFilter)) {
    activeFilter = 'active';
    const url = new URL(location.href); url.searchParams.set('status', activeFilter); history.replaceState(null, '', url);
  }

  function getTargetHref(r) {
    return withReportsReturn(rawTargetHref(r));
  }

  function rawTargetHref(r) {
    if (r.target_type === 'pitch' && r.target_id) return `pitch-detail.html?id=${encodeURIComponent(r.target_id)}`;
    if (['user', 'account', 'password_reset'].includes(r.target_type) && r.target_id) return `admin-users.html?q=${encodeURIComponent(r.target_name || '')}`;
    if (r.target_type === 'message') return 'messages.html';
    return 'admin-pitch-moderation.html';
  }

  function updateView() {
    for (const [key, label, pred] of tabDefs) {
      const cnt = reports.filter(pred).length;
      const isSel = key === activeFilter;
      let btn = tabsWrap.querySelector(`#admin-report-tab-${key}`);
      if (!btn) {
        btn = el('button', `${label} (${cnt})`, {
          type: 'button',
          role: 'tab',
          'aria-controls': 'admin-reports-panel',
          id: `admin-report-tab-${key}`,
          class: 'tab-btn'
        });
        btn.addEventListener('click', () => {
          if (activeFilter === key) return;
          activeFilter = key;
          const url = new URL(location.href);
          if (key === 'active') url.searchParams.delete('status');
          else url.searchParams.set('status', key);
          history.replaceState(null, '', url);
          updateView();
          animateTabPanel(listWrap);
          btn.focus({ preventScroll: true });
        });
        tabsWrap.append(btn);
      }
      btn.textContent = `${label} (${cnt})`;
      btn.tabIndex = isSel ? 0 : -1;
      btn.classList.toggle('active', isSel);
      btn.setAttribute('aria-selected', String(isSel));
    }
    updateLiquidIndicator(tabsWrap, '.tab-btn[aria-selected="true"]');

    const pred = (tabDefs.find(t => t[0] === activeFilter) || tabDefs[0])[2];
    listWrap.setAttribute('aria-labelledby', `admin-report-tab-${activeFilter}`);
    const filtered = reports.filter(pred);
    const pageRows = pager.slice(filtered, activeFilter);
    listWrap.replaceChildren();

    if (!filtered.length) {
      listWrap.append(el('div', 'Không có báo cáo nào trong mục này.', { class: 'empty' }));
      return;
    }

    for (const r of pageRows) {
      const actions = el('div', null, { class: 'admin-card-actions' }, [
        el('a', r.target_type === 'password_reset' ? 'Mở tài khoản để đặt lại mật khẩu' : 'Xem đối tượng', { href: getTargetHref(r), class: 'button secondary sm' }),
        r.target_type === 'pitch' && r.target_name ? el('a', 'Xử lý sân', { href: withReportsReturn(`admin-pitch-moderation.html?q=${encodeURIComponent(r.target_name)}`), class: 'button secondary sm' }) : null
      ]);

      if (r.status === 'open') {
        const assignBtn = el('button', 'Nhận xử lý', { type: 'button', class: 'button secondary sm' });
        assignBtn.addEventListener('click', async () => {
          const res = await api.functions.invoke('adminAction', { action: 'assign_report', report_id: r.id });
          if (res.data?.error) {
            setStatus(res.data.error, true);
            return;
          }
          toast('Đã nhận xử lý báo cáo.');
          await renderAdminReports();
          const heading = mainEl.querySelector('h1');
          if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
        });
        actions.append(assignBtn);
      }

      if (['open', 'reviewing'].includes(r.status)) {
        const resolveBtn = el('button', 'Kết luận báo cáo', { type: 'button', class: 'button sm' });
        resolveBtn.addEventListener('click', () => {
          const stateSelect = el('select', null, { id: 'modal-report-state' }, [
            el('option', 'Đã xử lý vi phạm', { value: 'resolved' }),
            el('option', 'Bác bỏ báo cáo', { value: 'dismissed' })
          ]);
          const extra = el('div', null, { class: 'field-group' }, [
            el('label', 'Kết quả xử lý', { for: 'modal-report-state' }),
            stateSelect
          ]);
          openActionDialog({
            title: `Kết luận báo cáo: ${r.target_name || r.reason}`,
            description: `Người gửi: ${r.reporter_name || 'Người dùng'}
Lý do: ${r.reason || ''}`,
            label: 'Nội dung kết luận gửi cho người báo cáo (bắt buộc)',
            required: true,
            placeholder: 'Nhập kết luận xử lý cụ thể...',
            extraFields: extra,
            async onConfirm(decision) {
              const res = await api.functions.invoke('adminAction', {
                action: 'resolve_report',
                report_id: r.id,
                status: stateSelect.value,
                decision
              });
              if (res.data?.error) throw new Error(res.data.error);
              toast('Đã lưu kết luận báo cáo và gửi thông báo cho người gửi.');
              await renderAdminReports();
            }
          });
        });
        actions.append(resolveBtn);
      }

      listWrap.append(
        el('article', null, { class: 'surface stack-sm admin-card' }, [
          el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
            renderBadge(REPORT_STATUS[r.status], r.status),
            el('span', r.target_type === 'pitch' ? 'Sân bóng' : r.target_type === 'user' ? 'Tài khoản' : r.target_type === 'account' ? 'Khiếu nại tạm khóa' : r.target_type === 'password_reset' ? 'Đặt lại mật khẩu' : 'Khác', { class: ['account', 'password_reset'].includes(r.target_type) ? 'badge badge--warning' : 'badge badge--muted' }),
            el('span', formatDateTime(r.created_date), { class: 'text-xs muted' })
          ]),
          el('h2', r.reason || 'Báo cáo', { utility: 'u-font-size-1p1rem' }),
          infoList([
            ['Đối tượng', r.target_name || '—', { strong: true }],
            ['Người gửi', `${r.reporter_name || '—'} (${ROLE_LABELS[r.reporter_role] || r.reporter_role || 'Người dùng'})`]
          ], { className: 'text-sm' }),
          r.details ? el('p', r.details, { class: 'text-sm muted report-details' }) : null,
          r.decision
            ? el('div', `Kết luận của quản trị viên: ${r.decision}`, { class: 'alert alert--info text-sm' })
            : null,
          actions.childElementCount ? actions : null
        ])
      );
    }
  }

  const pager = createPager({ noun: 'báo cáo', onChange: () => updateView(), scrollTarget: tabsWrap });
  listWrap.addEventListener('click', e => { if (e.target.closest('a[href]')) rememberReportsUrl(); });
  content.replaceChildren(tabsWrap, listWrap, pager.el);
  updateView();
}

bootManagement(renderAdminReports);
