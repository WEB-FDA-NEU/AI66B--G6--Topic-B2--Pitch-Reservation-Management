import { api } from '../services/api-client.js';
import { toast, clearFieldErrors, setFieldError, focusFirstInvalid } from '../core/ui.js';
import { el, todayLocal, appRole, buildAvatar, pitchAcceptsBookings, staffBackLink, infoLines } from '../core/render.js';
import { buildPitchCard, fetchReviewSummaries } from '../components/pitch-card.js';
import { $, ensureAuthenticated, params, bootCustomerPage } from '../features/customer-kit.js';

async function renderOwnerProfilePage(user) {
  const main = $('#main');
  if (!main) return;
  main.className = 'container stack-lg';
  const ownerId = params.get('id') || params.get('ownerId');

  if (!ownerId) {
    main.replaceChildren(el('h1', 'Không tìm thấy chủ sân', { class: 'empty' }));
    return;
  }

  const [pitchesRes, reviewMap, usersRes] = await Promise.all([
    api.entities.Pitch.filter({ manager_id: ownerId }),
    fetchReviewSummaries(),
    api.entities.User.filter({ id: ownerId })
  ]);

  const owner = usersRes.items[0] || null;
  const activePitches = (pitchesRes.items || []).filter(p => pitchAcceptsBookings(p));
  const listedPitches = [...activePitches, ...(pitchesRes.items || []).filter(p => !pitchAcceptsBookings(p) && p.status !== 'banned')];
  if (!owner && !activePitches.length) {
    main.replaceChildren(el('div', null, { class: 'empty stack' }, [
      el('h1', 'Không tìm thấy chủ sân'),
      el('a', 'Quay lại tìm sân', { href: 'search.html', class: 'button secondary' })
    ]));
    return;
  }
  const ownerName = owner?.full_name || activePitches[0]?.manager_name || 'Chủ sân Pitch Point';

  const reportDialog = el('dialog', null, { 'aria-label': 'Báo cáo chủ sân' });
  const reportForm = el('form', null, { class: 'stack', novalidate: true }, [
    el('h2', `Báo cáo chủ sân: ${ownerName}`),
    el('div', null, { class: 'field-group' }, [
      el('label', 'Lý do báo cáo', { for: 'owner-report-reason' }),
      el('input', null, { id: 'owner-report-reason', name: 'reason', required: true, maxlength: '500' })
    ]),
    el('div', null, { class: 'field-group' }, [
      el('label', 'Chi tiết', { for: 'owner-report-details' }),
      el('textarea', null, { id: 'owner-report-details', name: 'details', required: true, maxlength: '1000' })
    ]),
    el('div', null, { class: 'row-between' }, [
      el('button', 'Đóng', { type: 'button', class: 'button secondary' }),
      el('button', 'Gửi báo cáo', { type: 'submit', class: 'button danger' })
    ])
  ]);
  reportForm.querySelector('button[type="button"]').addEventListener('click', () => reportDialog.close());
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = reportForm.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    clearFieldErrors(reportForm);
    const u = await ensureAuthenticated();
    if (!u) return;
    if (!reportForm.elements.reason.value.trim()) setFieldError(reportForm.elements.reason, 'Vui lòng nhập lý do báo cáo.');
    if (!reportForm.elements.details.value.trim()) setFieldError(reportForm.elements.details, 'Vui lòng nhập mô tả chi tiết.');
    if (reportForm.querySelector('[aria-invalid="true"]')) { focusFirstInvalid(reportForm); return; }
    submit.disabled = true;
    try {
      await api.entities.Report.create({
      reporter_id: u.id,
      reporter_name: u.full_name,
      reporter_role: appRole(u),
      target_type: 'user',
      target_id: ownerId,
      target_name: ownerName,
      reason: reportForm.elements.reason.value.trim(),
      details: reportForm.elements.details.value.trim(),
      status: 'open'
      });
      reportForm.reset();
      reportDialog.close();
      toast('Đã gửi báo cáo chủ sân.');
    } catch (error) {
      setFieldError(reportForm.elements.reason, error.message || 'Không gửi được báo cáo.');
      reportForm.elements.reason.focus();
    } finally { submit.disabled = false; }
  });
  reportDialog.append(reportForm);

  const reportBtn = el('button', 'Báo cáo chủ sân', { 'data-needs-active': '', type: 'button', class: 'button secondary sm' });
  reportBtn.addEventListener('click', async () => {
    const u = await ensureAuthenticated();
    if (!u) return;
    reportDialog.showModal();
  });

  const ownerCard = el('section', null, { class: 'surface row-between' }, [
    el('div', null, { class: 'row', utility: 'u-gap-1rem' }, [
      buildAvatar({ id: owner?.id || ownerId, name: ownerName }, { size: 'xl', role: 'manager' }),
      el('div', null, {}, [
        el('span', 'Chủ sân đối tác', { class: 'eyebrow' }),
        el('h1', ownerName, { utility: 'u-margin-bottom-0p2rem' }),
        infoLines([`${activePitches.length} sân đang hoạt động`, owner?.phone ? `Điện thoại: ${owner.phone}` : null])
      ])
    ]),
    reportBtn
  ]);

  const resultsGrid = el('div', null, { id: 'results', class: 'grid-3' });
  if (!listedPitches.length) {
    resultsGrid.append(el('div', 'Chủ sân này hiện chưa có sân nào đang mở đặt lịch.', { class: 'empty' }));
  } else {
    for (const p of listedPitches) {
      resultsGrid.append(buildPitchCard(p, reviewMap[p.id], { dateParam: todayLocal() }));
    }
  }

  const errEl = el('p', '', { id: 'error', role: 'alert' });
  const back = staffBackLink(user, 'pitch-owner-profile.html', { href: 'search.html', label: '← Quay lại tìm sân' });
  main.replaceChildren(
    el('a', back.label, { href: back.href, class: 'text-sm font-bold text-link' }),
    ownerCard,
    el('h2', `Danh sách sân của ${ownerName}`),
    resultsGrid,
    errEl,
    reportDialog
  );
}

bootCustomerPage(user => renderOwnerProfilePage(user));
