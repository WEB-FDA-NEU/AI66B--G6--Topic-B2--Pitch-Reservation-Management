import { el, formatDateTime, normalizeText, ACTION_LABELS, createPager, infoList } from '../core/render.js';
import { content, fetchRows, bootManagement } from '../features/management-kit.js';

async function renderAdminActivityLog() {
  const events = await fetchRows('AuditEvent');
  let qText = '';
  let actionFilter = 'all';

  const qInput = el('input', null, { id: 'al-q', placeholder: 'Tìm theo người thực hiện, đối tượng hoặc lý do...' });
  const actSelect = el('select', null, { id: 'al-action' }, [
    el('option', 'Tất cả thao tác', { value: 'all' }),
    ...Object.entries(ACTION_LABELS).map(([k, v]) => el('option', v, { value: k }))
  ]);

  const filterBar = el('section', null, { class: 'surface grid-2' }, [
    el('div', null, { class: 'field-group' }, [el('label', 'Tìm kiếm nhật ký', { for: 'al-q' }), qInput]),
    el('div', null, { class: 'field-group' }, [el('label', 'Loại thao tác', { for: 'al-action' }), actSelect])
  ]);

  const listWrap = el('div', null, { class: 'stack' });
  const pager = createPager({ noun: 'bản ghi', onChange: () => updateList(), scrollTarget: listWrap });

  function updateList() {
    let filtered = events;
    if (qText) {
      const norm = normalizeText(qText);
      filtered = filtered.filter(e => normalizeText(`${e.actor_name} ${e.actor_email} ${e.target_name} ${e.target_email} ${e.reason} ${ACTION_LABELS[e.action] || e.action}`).includes(norm));
    }
    if (actionFilter !== 'all') {
      filtered = filtered.filter(e => e.action === actionFilter);
    }

    const pageRows = pager.slice(filtered, `${qText}|${actionFilter}`);
    listWrap.replaceChildren();
    if (!filtered.length) {
      listWrap.append(el('div', 'Không có bản ghi nhật ký hoạt động nào khớp với bộ lọc.', { class: 'empty' }));
      return;
    }

    for (const e of pageRows) {
      listWrap.append(
        el('article', null, { class: 'surface stack-sm' }, [
          el('div', null, { class: 'row-between' }, [
            el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
              el('span', ACTION_LABELS[e.action] || e.action || 'Hoạt động', { class: 'badge badge--info' }),
              e.entity_type ? el('span', e.entity_type, { class: 'badge badge--muted' }) : null
            ]),
            el('span', formatDateTime(e.created_date), { class: 'text-xs muted' })
          ]),
          infoList([
            ['Người làm', e.actor_name || 'Quản trị viên', { strong: true }],
            ['Email', e.actor_email],
            ['Đối tượng', (e.target_name || e.target_email || e.entity_id) ? (e.target_name || 'Không có tên') : null],
            ['Email đối tượng', e.target_email],
            ['Lý do', e.reason]
          ], { className: 'text-sm' })
        ])
      );
    }
  }

  qInput.addEventListener('input', () => { qText = qInput.value.trim(); updateList(); });
  actSelect.addEventListener('change', () => { actionFilter = actSelect.value; updateList(); });

  content.replaceChildren(filterBar, listWrap, pager.el);
  updateList();
}

bootManagement(renderAdminActivityLog);
