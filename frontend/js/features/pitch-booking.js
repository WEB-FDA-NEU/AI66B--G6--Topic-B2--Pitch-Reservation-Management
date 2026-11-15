import { api } from '../services/api-client.js';
import { BOOKING_ADVANCE_DAYS, bookingDaysText, holdText, noticeText } from '../core/config.js';
import { toast, clearFieldErrors, setFieldError, focusFirstInvalid, renderBadge, createIcon, updateLiquidIndicator, replaceChildrenPreservingIndicator, animateTabPanel, animateFormattedValue } from '../core/ui.js';
import { el, formatVnd, formatDate, dateLabel, todayLocal, addDays, fullAddress, appRole, bookingCanReschedule, bookingCanCancel, pitchClosedNotice, PITCH_STATUS, PITCH_TYPE_LABEL, staffBackLink } from '../core/render.js';
import { buildBookingStepper } from '../components/booking-stepper.js';
import { buildContiguousSlotPicker } from '../components/slot-picker.js';
import { buildPitchGallery } from '../components/pitch-gallery.js';
import { $, ensureAuthenticated, getCurrentUser, page, params, say, validBookingDate } from './customer-kit.js';

export async function resolveDefaultPitchDate(pitchId, requestedDate) {
  if (validBookingDate(requestedDate)) return { date: requestedDate, autoAdvanced: false };
  const today = todayLocal();
  const res = await api.functions.invoke('nextAvailableDate', { pitch_id: pitchId });
  const next = res.data?.local_date;
  if (next && next !== today) return { date: next, autoAdvanced: true };
  return { date: today, autoAdvanced: false };
}


export async function renderPitchDetailOrSchedulePage(user) {
  const main = $('#main');
  if (!main) return;
  main.className = 'container stack-lg';

  let pitchId = params.get('id') || params.get('pitchId');
  const rescheduleBookingId = page === 'booking-schedule' ? params.get('rescheduleBookingId') : null;

  let rescheduleFrom = null;
  if (rescheduleBookingId) {
    const u = await ensureAuthenticated();
    if (!u) return;
    let original = null;
    try { original = await api.entities.Booking.get(rescheduleBookingId); } catch { }
    const owned = original && original.customer_id === u.id;
    const reason = !owned
      ? 'Không tìm thấy đơn cần đổi lịch trong tài khoản của bạn.'
      : bookingCanReschedule(original) ? ''
        : original.reschedule_from_id || Number(original.reschedule_count || 0) >= 1
          ? `Đơn này đã được đổi lịch một lần nên không đổi thêm được. Bạn vẫn có thể hủy đơn nếu còn trước giờ đá ít nhất ${noticeText()}.`
          : original.status === 'confirmed' && !bookingCanCancel(original)
            ? `Đơn chỉ đổi lịch được khi còn ít nhất ${noticeText()} trước giờ đá.`
            : 'Chỉ đơn đã thanh toán và chưa diễn ra mới đổi lịch được.';
    if (reason) {
      main.replaceChildren(el('section', null, { class: 'surface stack' }, [
        el('span', 'Không thể đổi lịch', { class: 'badge badge--warning' }),
        el('h1', 'Đơn này chưa đổi lịch được'),
        el('p', reason, { class: 'muted' }),
        el('div', null, { class: 'row' }, [
          owned ? el('a', 'Xem chi tiết đơn', { href: `booking-details.html?id=${encodeURIComponent(original.id)}`, class: 'button' }) : null,
          el('a', 'Về lịch sử đặt sân', { href: 'booking-history.html', class: owned ? 'button secondary' : 'button' })
        ])
      ]));
      return;
    }
    rescheduleFrom = original;
    pitchId = original.pitch_id;
  }

  if (!pitchId) {
    main.replaceChildren(
      el('section', null, { class: 'surface stack' }, [
        el('h1', 'Chưa chọn sân bóng'),
        el('p', 'Vui lòng chọn một sân bóng từ danh sách tìm kiếm để xem lịch trống và đặt giờ.', { class: 'muted' }),
        el('a', 'Tìm sân bóng', { href: 'search.html', class: 'button' })
      ])
    );
    return;
  }

  const [pitch, schedules, reviewsRes, favsRes] = await Promise.all([
    api.entities.Pitch.get(pitchId),
    api.entities.PitchSchedule.filter({ pitch_id: pitchId }),
    api.entities.Review.filter({ pitch_id: pitchId }, { sort: '-created_date' }),
    user ? api.entities.Favorite.filter({ user_id: user.id, pitch_id: pitchId }) : Promise.resolve({ items: [] })
  ]);

  const { date: initialDate, autoAdvanced } = await resolveDefaultPitchDate(pitchId, params.get('date'));
  let currentDate = initialDate;
  const invalidRequestedDate = params.has('date') && !validBookingDate(params.get('date'));
  if (invalidRequestedDate) {
    const url = new URL(location.href);
    url.searchParams.set('date', initialDate);
    history.replaceState(null, '', url);
  }
  let currentFavorite = favsRes.items[0] || null;

  const back = page === 'booking-schedule'
    ? { href: `pitch-detail.html?id=${encodeURIComponent(pitchId)}&date=${encodeURIComponent(currentDate)}`, label: `← Quay lại chi tiết ${pitch.name}` }
    : staffBackLink(user, 'pitch-detail.html', { href: 'search.html', label: '← Quay lại tìm sân' });
  const backLink = rescheduleFrom
    ? el('a', '← Quay lại đơn', { href: `booking-details.html?id=${encodeURIComponent(rescheduleFrom.id)}`, class: 'text-sm font-bold text-link' })
    : el('a', back.label, { href: back.href, class: 'text-sm font-bold text-link' });
  const rescheduleNotice = rescheduleFrom
    ? el('div', null, { id: 'reschedule-notice', class: 'alert alert--info stack-sm', role: 'status' }, [
      el('strong', `Đổi lịch đơn ${rescheduleFrom.code}`),
      el('p', `Lịch hiện tại: ${formatDate(rescheduleFrom.local_date)}, ${rescheduleFrom.slot_label || rescheduleFrom.start_time}, ${formatVnd(rescheduleFrom.amount_vnd)}. Hãy chọn khung giờ mới của sân này.`, { class: 'text-sm' }),
      el('p', 'Đơn cũ chỉ được hủy và hoàn tiền vào ví khi bạn thanh toán xong đơn mới. Nếu bạn dừng giữa chừng, đơn cũ vẫn giữ nguyên. Mỗi đơn chỉ được đổi lịch 1 lần.', { class: 'text-xs muted' })
    ])
    : null;

  const errEl = el('p', '', { id: 'error', role: 'alert' });

  const reviews = reviewsRes.items || [];
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const pitchInfoSection = el('section', null, { id: 'pitch', class: 'surface stack pitch-detail-surface' });
  const detailBanner = el('div', null, { class: 'pitch-detail-banner' });
  const pitchPhotos = Array.isArray(pitch.images) ? pitch.images.filter(Boolean) : [];
  if (pitchPhotos.length) detailBanner.classList.add('pitch-detail-banner--photos');
  detailBanner.append(...buildPitchGallery({ images: pitchPhotos, name: pitch.name || 'Sân bóng' }));
  pitchInfoSection.append(detailBanner);

  const topBadges = el('div', null, { class: 'row-between' }, [
    el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
      renderBadge(PITCH_STATUS[pitch.status], pitch.status),
      el('span', PITCH_TYPE_LABEL[pitch.type] || pitch.type, { class: 'badge badge--info' }),
      el('span', '60 phút / khung giờ', { class: 'badge badge--muted' })
    ]),
    avgRating
      ? el('span', `★ ${avgRating} (${reviews.length} đánh giá)`, { class: 'badge badge--warning' })
      : el('span', 'Chưa có đánh giá', { class: 'badge badge--muted' })
  ]);

  const titleRow = el('div', null, { class: 'row-between' }, [
    el('div', null, {}, [
      el('h1', pitch.name),
      el('p', fullAddress(pitch) || 'Đang cập nhật địa chỉ', { class: 'muted' })
    ]),
    el('div', null, { utility: 'u-text-align-right' }, [
      el('div', 'Giá cơ bản từ', { class: 'text-xs muted' }),
      el('strong', `${formatVnd(pitch.base_price_vnd)}/giờ`, { utility: 'u-font-size-1p4rem u-color-brand-text' })
    ])
  ]);

  const openingHoursText = el('span', '06:00 – 22:00');
  function updateOpeningHoursForDate(dateVal) {
    const weekday = new Date(`${dateVal}T00:00:00Z`).getUTCDay();
    const windows = (schedules.items || []).filter(s => Number(s.weekday) === weekday)
      .sort((a, b) => String(a.local_start).localeCompare(String(b.local_start)));
    if (windows.length) {
      openingHoursText.replaceChildren(...windows.map(w => el('span', `${w.local_start} – ${w.local_end} (${formatVnd(w.price_vnd)}/giờ)`, { class: 'opening-window' })));
    } else if (!schedules.items.length && !pitch.schedule_configured) {
      openingHoursText.textContent = `${pitch.open_time || '06:00'} – ${pitch.close_time || '22:00'} (${formatVnd(pitch.base_price_vnd)}/giờ)`;
    } else {
      openingHoursText.textContent = 'Đóng cửa theo lịch tuần';
    }
  }
  updateOpeningHoursForDate(currentDate);

  const metaGrid = el('div', null, { class: 'grid-3' }, [
    el('div', null, { class: 'card card--compact card--subtle' }, [
      el('div', 'Giờ mở cửa ngày đang chọn', { class: 'text-xs muted' }),
      openingHoursText
    ]),
    el('div', null, { class: 'card card--compact card--subtle' }, [
      el('div', 'Chủ sân quản lý', { class: 'text-xs muted' }),
      el('a', pitch.manager_name || 'Xem hồ sơ chủ sân', {
        href: `pitch-owner-profile.html?id=${encodeURIComponent(pitch.manager_id)}`,
        class: 'font-bold text-sm text-link'
      })
    ]),
    el('div', null, { class: 'card card--compact card--subtle' }, [
      el('div', 'Chính sách hủy & giữ chỗ', { class: 'text-xs muted' }),
      el('span', `Giữ chỗ ${holdText()}, hủy trước ${noticeText()} hoàn 100%`, { class: 'text-sm font-bold' })
    ])
  ]);

  const facAndRules = el('div', null, { class: 'grid-2' });
  const facBox = el('div', null, { class: 'stack-sm' }, [
    el('h2', 'Tiện ích tại sân'),
    el('div', null, { class: 'row', utility: 'u-gap-0p4rem' },
      (pitch.facilities?.length ? pitch.facilities : ['Đèn chiếu sáng', 'Bãi đỗ xe']).map(f => el('span', f, { class: 'badge badge--muted' }))
    )
  ]);
  const rulesBox = pitch.rules?.trim() ? el('div', null, { class: 'stack-sm' }, [
    el('h2', 'Nội quy sân'),
    el('p', pitch.rules, { class: 'text-sm muted' })
  ]) : null;
  facAndRules.append(facBox, ...(rulesBox ? [rulesBox] : []));

  const favBtn = el('button', null, { 'data-needs-active': '', type: 'button', class: 'button secondary sm favorite-action', 'aria-pressed': String(!!currentFavorite) });
  const updateFavoriteButton = () => {
    const heart = createIcon('Heart', 16);
    if (currentFavorite) heart.setAttribute('fill', 'currentColor');
    favBtn.replaceChildren(heart, document.createTextNode(currentFavorite ? ' Đã lưu yêu thích' : ' Lưu sân yêu thích'));
    favBtn.setAttribute('aria-pressed', String(!!currentFavorite));
  };
  updateFavoriteButton();
  favBtn.addEventListener('click', async () => {
    if (favBtn.disabled) return;
    favBtn.disabled = true;
    try {
    const u = await getCurrentUser();
    if (!u) {
      const next = new URL(location.href);
      next.searchParams.set('date', currentDate);
      location.href = `login.html?returnTo=${encodeURIComponent(next.pathname.split('/').pop() + next.search)}`;
      return;
    }
    if (currentFavorite) {
      await api.entities.Favorite.delete(currentFavorite.id);
      currentFavorite = null;
      updateFavoriteButton();
      toast('Đã bỏ lưu sân khỏi danh sách yêu thích.');
    } else {
      currentFavorite = await api.entities.Favorite.create({ user_id: u.id, pitch_id: pitchId });
      updateFavoriteButton();
      toast('Đã lưu sân vào danh sách yêu thích.');
    }
    } catch (err) {
      say(err.message || 'Không thể cập nhật sân yêu thích.');
    } finally {
      favBtn.disabled = false;
    }
  });

  const msgOwnerBtn = el('button', 'Nhắn chủ sân', { 'data-needs-active': '', id: 'message-owner', type: 'button', class: 'button secondary sm' });
  msgOwnerBtn.addEventListener('click', async () => {
    const u = await ensureAuthenticated();
    if (!u) return;
    if (appRole(u) !== 'customer') {
      say('Chỉ tài khoản khách hàng có thể tạo hội thoại đặt sân với chủ sân.');
      return;
    }
    try {
      const existing = await api.entities.Conversation.filter({ customer_id: u.id, manager_id: pitch.manager_id, pitch_id: pitchId });
      const conv = existing.items[0];
      location.href = conv ? `messages.html?conversationId=${encodeURIComponent(conv.id)}` : `messages.html?pitchId=${encodeURIComponent(pitchId)}`;
    } catch (e) {
      say(e.message);
    }
  });

  const reportDialog = el('dialog', null, { id: 'report-pitch-dialog', 'aria-label': 'Báo cáo sân' });
  const reportForm = el('form', null, { id: 'report-form', class: 'stack', novalidate: true }, [
    el('h2', `Báo cáo sân: ${pitch.name}`),
    el('p', 'Báo cáo thông tin sai lệch hoặc vi phạm của sân bóng tới quản trị viên.', { class: 'text-sm muted' }),
    el('div', null, { class: 'field-group' }, [
      el('label', 'Lý do báo cáo', { for: 'report-reason' }),
      el('input', null, { id: 'report-reason', name: 'reason', required: true, maxlength: '500', placeholder: 'VD: Sai giá niêm yết, sân đóng cửa không báo trước...' })
    ]),
    el('div', null, { class: 'field-group' }, [
      el('label', 'Mô tả chi tiết', { for: 'report-details' }),
      el('textarea', null, { id: 'report-details', name: 'details', required: true, maxlength: '1000', placeholder: 'Mô tả cụ thể sự việc...' })
    ]),
    el('div', null, { class: 'row-between' }, [
      el('button', 'Đóng', { type: 'button', class: 'button secondary' }),
      el('button', 'Gửi báo cáo', { type: 'submit', class: 'button danger' })
    ])
  ]);
  reportForm.querySelector('button[type="button"]').addEventListener('click', () => reportDialog.close());
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (reportForm.dataset.busy === 'true') return;
    reportForm.dataset.busy = 'true';
    const submit = reportForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
    clearFieldErrors(reportForm);
    const u = await ensureAuthenticated();
    if (!u) return;
    const reasonIn = reportForm.elements.reason;
    const detailsIn = reportForm.elements.details;
    if (!reasonIn.value.trim()) setFieldError(reasonIn, 'Vui lòng nhập lý do báo cáo.');
    if (!detailsIn.value.trim()) setFieldError(detailsIn, 'Vui lòng nhập mô tả chi tiết.');
    if (reportForm.querySelector('[aria-invalid="true"]')) {
      focusFirstInvalid(reportForm);
      return;
    }
    await api.entities.Report.create({
      reporter_id: u.id,
      reporter_name: u.full_name,
      reporter_role: appRole(u),
      target_type: 'pitch',
      target_id: pitchId,
      target_name: pitch.name,
      reason: reasonIn.value.trim(),
      details: detailsIn.value.trim(),
      status: 'open'
    });
    reportForm.reset();
    reportDialog.close();
    toast('Đã gửi báo cáo sân bóng tới quản trị viên.');
    } catch (err) {
      setFieldError(reportForm.elements.reason, err.message || 'Không gửi được báo cáo.');
      reportForm.elements.reason.focus();
    } finally {
      reportForm.dataset.busy = 'false';
      if (submit) submit.disabled = false;
    }
  });
  reportDialog.append(reportForm);

  const openReportBtn = el('button', 'Báo cáo sân', { 'data-needs-active': '', type: 'button', class: 'button ghost sm' });
  openReportBtn.addEventListener('click', async () => {
    const u = await ensureAuthenticated();
    if (!u) return;
    reportDialog.showModal();
  });

  const actionToolbar = el('div', null, { class: 'row', utility: 'u-border-top-1px-solid-border u-padding-top-0p75rem' }, [
    favBtn,
    msgOwnerBtn,
    openReportBtn
  ]);

  pitchInfoSection.append(topBadges, titleRow, metaGrid, facAndRules, actionToolbar);

  const bookingStepper = buildBookingStepper(1);
  const bookingSection = el('section', null, { class: 'split-layout' });
  const slotColumn = el('div', null, { class: 'surface stack' });

  const slotHeader = el('div', null, { class: 'row-between' }, [
    el('div', null, {}, [
      el('p', 'Lịch trống', { class: 'eyebrow' }),
      el('h2', 'Chọn ngày và khung giờ liền kề')
    ]),
    el('div', null, { class: 'field-group', utility: 'u-min-width-10p5rem' }, [
      el('label', 'Chọn ngày', { for: 'date', class: 'text-xs' }),
      el('input', null, {
        id: 'date',
        type: 'date',
        required: true,
        min: todayLocal(),
        max: addDays(todayLocal(), BOOKING_ADVANCE_DAYS),
        value: currentDate
      })
    ])
  ]);
  slotColumn.append(slotHeader);

  if (invalidRequestedDate) {
    slotColumn.append(el('div', `Ngày trong đường dẫn không hợp lệ. Đang hiển thị ${formatDate(currentDate)}.`, { class: 'alert alert--info text-sm', role: 'status' }));
  }

  if (autoAdvanced) {
    slotColumn.append(
      el('div', `Hôm nay đã hết khung giờ trống nên hệ thống tự động chuyển sang ngày gần nhất còn sân (${formatDate(currentDate)}).`, {
        class: 'alert alert--info text-sm'
      })
    );
  }

  const dateStrip = el('div', null, {
    class: 'date-strip',
    tabindex: '0',
    role: 'region',
    'aria-label': `Chọn ngày trong ${bookingDaysText()} tới`
  });

  const slotContainer = el('div', null, { class: 'stack' });
  slotColumn.append(dateStrip, slotContainer);

  const summarySidebar = el('aside', null, { class: 'surface stack', utility: 'u-position-sticky u-top-5p25rem' });
  const selectionText = el('p', 'Chưa chọn khung giờ nào.', { id: 'selection', class: 'font-bold' });
  const selectionAmount = el('div', '0 ₫', { class: 'stat-value', utility: 'u-color-brand-text' });
  const bookingError = el('p', '', { class: 'field-error', role: 'alert' });
  const isGuest = !user;
  const isStaff = !!user && appRole(user) !== 'customer';
  const bookBtn = el('button', isGuest ? 'Đăng nhập để đặt sân' : rescheduleFrom ? `Giữ khung giờ mới (${holdText()})` : `Giữ chỗ ngay (${holdText()})`, { 'data-needs-active': '', id: 'book', type: 'button', class: 'button full', disabled: !isGuest, hidden: isStaff });
  const setBookEnabled = on => { bookBtn.disabled = isGuest ? false : !on; };
  const roleNotice = isGuest
    ? el('div', null, { id: 'login-notice', class: 'alert alert--info stack-sm', role: 'status' }, [
      el('strong', 'Đăng nhập để đặt sân'),
      el('p', 'Đăng nhập hoặc tạo tài khoản để giữ chỗ và thanh toán. Khung giờ bạn đã chọn vẫn được giữ lại.', { class: 'text-sm' })
    ])
    : isStaff
      ? el('div', null, { id: 'role-notice', class: 'alert alert--info stack-sm', role: 'status' }, [
        el('strong', 'Chỉ khách hàng mới đặt được sân'),
        el('p', appRole(user) === 'manager'
          ? 'Bạn đang dùng tài khoản chủ sân nên chỉ xem được lịch trống của sân này.'
          : 'Bạn đang dùng tài khoản quản trị viên nên chỉ xem được lịch trống của sân này.', { class: 'text-sm' })
      ])
      : null;

  summarySidebar.append(...[
    el('h3', 'Tóm tắt lựa chọn'),
    el('div', null, { class: 'card card--compact card--subtle stack-sm' }, [
      el('div', pitch.name, { class: 'font-bold text-sm' }),
      el('div', `Ngày: ${formatDate(currentDate)}`, { id: 'summary-date-label', class: 'text-xs muted' }),
      selectionText,
      el('div', null, { utility: 'u-border-top-1px-solid-border u-padding-top-0p5rem u-margin-top-0p25rem' }, [
        el('div', 'Tạm tính', { class: 'text-xs muted' }),
        selectionAmount
      ])
    ]),
    bookingError,
    roleNotice,
    bookBtn,
    isStaff ? null : el('p', rescheduleFrom
      ? `Khung giờ mới được giữ riêng cho bạn trong ${holdText()}. Khi thanh toán, ${formatVnd(rescheduleFrom.amount_vnd)} của đơn cũ được hoàn vào ví trước.`
      : `Khi bấm "Giữ chỗ ngay", khung giờ được giữ riêng cho bạn trong ${holdText()} để kiểm tra và thanh toán.`, { class: 'text-xs muted' })
  ].filter(Boolean));

  bookingSection.append(slotColumn, summarySidebar);

  const stickyTime = el('span', '', { class: 'booking-bar-time' });
  const stickyTotal = el('strong', '0 ₫', { class: 'booking-bar-total' });
  const stickyBtn = el('button', isGuest ? 'Đăng nhập để đặt' : 'Giữ chỗ', { 'data-needs-active': '', type: 'button', class: 'button' });
  const stickyBar = el('div', null, { class: 'booking-bar', hidden: true, role: 'region', 'aria-label': 'Tóm tắt đặt sân' }, [
    el('div', null, { class: 'booking-bar-info' }, [stickyTime, stickyTotal]),
    stickyBtn
  ]);
  stickyBtn.addEventListener('click', () => {
    if (bookBtn.disabled) return;
    bookBtn.click();
  });
  document.body.append(stickyBar);
  function syncStickyBar() {
    const hasSel = selectedSlots.length > 0;
    stickyBar.hidden = !hasSel || isStaff;
    document.body.classList.toggle('has-booking-bar', hasSel && !isStaff);
    stickyBtn.disabled = bookBtn.disabled;
    if (hasSel) {
      stickyTime.textContent = `${selectedSlots[0].start} – ${selectedSlots[selectedSlots.length - 1].end} (${selectedSlots.length} giờ)`;
      const total = formatVnd(selectedSlots.reduce((sum, s) => sum + Number(s.price_vnd || 0), 0));
      if (!stickyTotal._countRaf) stickyTotal.textContent = total;
      stickyTotal.dataset.rawNumber = String(selectedSlots.reduce((sum, s) => sum + Number(s.price_vnd || 0), 0));
    }
  }
  new MutationObserver(syncStickyBar).observe(bookBtn, { attributes: true, attributeFilter: ['disabled'] });

  let selectedSlots = [];
  let availabilityRequest = 0;
  const dateInputEl = slotHeader.querySelector('#date');

  async function loadAvailability(dateVal, preselectedStarts = []) {
    const request = ++availabilityRequest;
    const isDateSwitch = slotContainer.childElementCount > 0 && currentDate !== dateVal;
    currentDate = dateVal;
    selectedSlots = [];
    setBookEnabled(false);
    selectionText.textContent = 'Đang tải khung giờ…';
    selectionAmount.textContent = '0 ₫';
    syncStickyBar();
    dateInputEl.value = currentDate;
    dateInputEl.dispatchEvent(new Event('input', { bubbles: true }));
    updateOpeningHoursForDate(currentDate);
    const summaryDateEl = summarySidebar.querySelector('#summary-date-label');
    if (summaryDateEl) summaryDateEl.textContent = `Ngày: ${formatDate(currentDate)}`;

    const existingPills = [...dateStrip.querySelectorAll('.date-pill')];
    if (existingPills.length) {
      for (const p of existingPills) {
        const isAct = p.dataset.date === currentDate;
        p.classList.toggle('active', isAct);
        p.setAttribute('aria-pressed', String(isAct));
      }
      updateLiquidIndicator(dateStrip, '.date-pill[aria-pressed="true"]');
    }

    if (!slotContainer.childElementCount) {
      slotContainer.replaceChildren(el('div', null, { class: 'skeleton', utility: 'u-min-height-18rem' }));
    } else {
      slotContainer.classList.add('slot-container--loading');
    }

    let res;
    try {
      res = await api.functions.invoke('getAvailability', { pitch_id: pitchId, local_date: dateVal });
      if (request !== availabilityRequest) return;
      if (res.data?.error) throw new Error(res.data.error);
    } catch (error) {
      if (request !== availabilityRequest) return;
      slotContainer.classList.remove('slot-container--loading');
      selectionText.textContent = 'Chưa tải được khung giờ.';
      slotContainer.replaceChildren(el('p', 'Không tải được lịch. Hãy chọn lại ngày để thử lại.', { role: 'alert' }));
      say(error.message || 'Không tải được khung giờ.');
      return;
    }
    slotContainer.classList.remove('slot-container--loading');

    const selectableDates = res.data?.selectable_dates || Array.from({ length: BOOKING_ADVANCE_DAYS + 1 }, (_, i) => addDays(todayLocal(), i));
    const currentDatesKey = existingPills.map(p => p.dataset.date).join(',');
    if (currentDatesKey !== selectableDates.join(',')) {
      replaceChildrenPreservingIndicator(dateStrip);
      for (const d of selectableDates) {
        const active = d === currentDate;
        const pill = el('button', null, {
          type: 'button',
          'data-date': d,
          class: `date-pill ${active ? 'active' : ''}`.trim(),
          'aria-pressed': String(active)
        }, [
          el('div', d === todayLocal() ? 'Hôm nay' : dateLabel(d).split(',')[0], { class: 'text-xs' }),
          el('div', d.slice(8, 10) + '/' + d.slice(5, 7))
        ]);
        pill.addEventListener('click', async () => {
          if (d === currentDate) return;
          await loadAvailability(d);
          dateStrip.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
        });
        dateStrip.append(pill);
      }
    }
    updateLiquidIndicator(dateStrip, '.date-pill[aria-pressed="true"]');

    const picker = buildContiguousSlotPicker({
      slots: res.data?.slots || [],
      initialStarts: preselectedStarts,
      onSelectionChange(sel) {
        bookingError.textContent = '';
        selectedSlots = sel;
        if (!sel.length) {
          selectionText.textContent = 'Chưa chọn khung giờ nào.';
          animateFormattedValue(selectionAmount, '0 ₫', { duration: 260 });
          animateFormattedValue(stickyTotal, '0 ₫', { duration: 260 });
          setBookEnabled(false);
        } else {
          const total = sel.reduce((sum, s) => sum + Number(s.price_vnd || 0), 0);
          const formatted = formatVnd(total);
          selectionText.textContent = `${sel[0].start} – ${sel[sel.length - 1].end} (${sel.length} giờ liền kề)`;
          animateFormattedValue(selectionAmount, formatted, { duration: 280 });
          animateFormattedValue(stickyTotal, formatted, { duration: 280 });
          setBookEnabled(true);
        }
        syncStickyBar();
      }
    });
    slotContainer.replaceChildren(picker);
    if (isDateSwitch) animateTabPanel(slotContainer);
  }

  dateInputEl.addEventListener('change', () => {
    if (dateInputEl.value) loadAvailability(dateInputEl.value);
  });

  bookBtn.addEventListener('click', async () => {
    if (isStaff || bookBtn.disabled || (!selectedSlots.length && !isGuest)) return;
    bookBtn.disabled = true;
    bookingError.textContent = '';
    const starts = selectedSlots.map(s => s.start);
    sessionStorage.setItem('pitch-point:template-selection', JSON.stringify({
      id: pitchId,
      date: currentDate,
      starts
    }));
    const u = await getCurrentUser();
    if (!u || !selectedSlots.length) {
      const next = new URL(location.href);
      next.searchParams.set('date', currentDate);
      location.href = `login.html?returnTo=${encodeURIComponent(next.pathname.split('/').pop() + next.search)}`;
      return;
    }
    if (appRole(u) !== 'customer') {
      bookingError.textContent = 'Chỉ tài khoản khách hàng mới có thể đặt sân. Vui lòng đăng nhập bằng tài khoản khách hàng.';
      toast(bookingError.textContent);
      bookBtn.disabled = false;
      return;
    }
    try {
      bookBtn.disabled = true;
      sessionStorage.removeItem('pitch-point:template-selection');
      const r = await api.functions.invoke('createHold', {
        pitch_id: pitchId,
        local_date: currentDate,
        start_times: starts,
        start_time: starts[0],
        ...(rescheduleFrom ? { reschedule_from_id: rescheduleFrom.id } : {})
      });
      if (r.data?.error) throw new Error(r.data.error);
      location.href = `booking-confirmation.html?id=${encodeURIComponent(r.data.booking.id)}`;
    } catch (e) {
      await loadAvailability(currentDate, starts);
      bookingError.textContent = e.message || 'Không thể giữ chỗ. Vui lòng chọn lại.';
      toast(bookingError.textContent);
      if (/đang giữ|giữ chỗ.*khác/i.test(bookingError.textContent)) {
        bookingError.append(document.createTextNode(' '), el('a', 'Xem đơn đang giữ', { href: 'booking-confirmation.html' }));
      }
      if (matchMedia('(max-width: 1023px)').matches) bookingError.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  });

  let initialStarts = [];
  const rawTimes = params.get('times') || params.get('time') || '';
  if (rawTimes) {
    initialStarts = rawTimes.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    try {
      const saved = JSON.parse(sessionStorage.getItem('pitch-point:template-selection') || 'null');
      if (saved && saved.id === pitchId && saved.date === currentDate && Array.isArray(saved.starts)) {
        initialStarts = saved.starts;
        sessionStorage.removeItem('pitch-point:template-selection');
      }
    } catch { }
  }

  const reviewsSection = el('section', null, { class: 'surface stack' }, [
    el('div', null, { class: 'row-between' }, [
      el('h2', `Đánh giá từ khách đã đặt sân (${reviews.length})`),
      avgRating ? el('span', `Trung bình ★ ${avgRating}/5`, { class: 'badge badge--warning' }) : null
    ])
  ]);
  if (!reviews.length) {
    reviewsSection.append(el('p', 'Chưa có đánh giá nào cho sân này. Hãy đặt sân và hoàn tất trận đấu để là người đầu tiên đánh giá!', { class: 'muted text-sm' }));
  } else {
    const revGrid = el('div', null, { class: 'grid-2' });
    for (const r of reviews) {
      revGrid.append(
        el('article', null, { class: 'card card--compact card--subtle stack-sm' }, [
          el('div', null, { class: 'row-between' }, [
            el('strong', r.customer_name || 'Khách hàng', { class: 'text-sm' }),
            el('span', `${'★'.repeat(Math.max(0, Math.min(5, Math.floor(Number(r.rating) || 0))))} (${r.rating}/5)`, { class: 'badge badge--warning' })
          ]),
          el('p', r.body || 'Sân chất lượng tốt.', { class: 'text-sm' }),
          el('span', formatDate(r.created_date), { class: 'text-xs muted' })
        ])
      );
    }
    reviewsSection.append(revGrid);
  }

  const closedNotice = pitchClosedNotice(pitch);
  if (closedNotice) {
    const noticeEl = el('div', null, { class: `alert alert--${closedNotice.tone} stack-sm pitch-closed-notice`, role: 'status' }, [
      el('strong', closedNotice.title),
      el('p', closedNotice.body, { class: 'text-sm' })
    ]);
    pitchInfoSection.insertBefore(noticeEl, topBadges);
    const closedSection = el('section', null, { class: 'surface stack-sm', 'aria-labelledby': 'closed-heading' }, [
      el('h2', 'Chưa thể đặt sân này', { id: 'closed-heading' }),
      el('p', closedNotice.body, { class: 'text-sm muted' }),
      el('div', null, { class: 'row' }, [
        el('a', 'Tìm sân khác còn trống', { href: 'search.html', class: 'button sm' }),
        user ? el('a', 'Xem đơn của tôi', { href: 'booking-history.html', class: 'button secondary sm' }) : null
      ])
    ]);
    main.replaceChildren(backLink, errEl, pitchInfoSection, closedSection, reviewsSection, reportDialog);
    return;
  }
  main.replaceChildren(backLink, errEl, ...(rescheduleNotice ? [rescheduleNotice] : []), pitchInfoSection, bookingStepper, bookingSection, reviewsSection, reportDialog);
  await loadAvailability(currentDate, initialStarts);
}
