import { renderBadge, renderStatCard } from '../core/ui.js';
import { el, formatVnd, formatDate, formatDateTime, todayLocal, BOOKING_STATUS, PITCH_STATUS, PITCH_TYPE_LABEL, infoLines } from '../core/render.js';
import { holdText } from '../core/config.js';
import { content, currentUser, fetchRows, mainEl, vietnamMonth, bootManagement } from '../features/management-kit.js';

async function renderManagerDashboard() {
  const [pitches, bookings, payments, refunds, wallets, reviews] = await Promise.all([
    fetchRows('Pitch', { manager_id: currentUser.id }),
    fetchRows('Booking', { manager_id: currentUser.id }),
    fetchRows('Payment', { manager_id: currentUser.id }),
    fetchRows('Refund', { manager_id: currentUser.id }),
    fetchRows('Wallet', { user_id: currentUser.id }),
    fetchRows('Review', {})
  ]);

  const myPitchIds = new Set(pitches.map(p => p.id));
  const myReviews = reviews.filter(r => myPitchIds.has(r.pitch_id));
  const activePitches = pitches.filter(p => p.status === 'active');
  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && Date.parse(b.ends_at) > Date.now())
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const activeHolds = bookings.filter(b => b.status === 'pending' && Date.parse(b.hold_expires_at) > Date.now());

  const currentMonth = todayLocal().slice(0, 7);
  const monthPaid = payments
    .filter(p => vietnamMonth(p.paid_at || p.created_date) === currentMonth)
    .reduce((s, p) => s + Number(p.amount_vnd || 0), 0);
  const monthRefunded = refunds
    .filter(r => vietnamMonth(r.created_date) === currentMonth)
    .reduce((s, r) => s + Number(r.amount_vnd || 0), 0);
  const walletBalance = wallets[0]?.balance_vnd || 0;

  const pageHeader = mainEl.querySelector('.page-header');
  if (pageHeader) {
    const title = pageHeader.querySelector('h1');
    const description = pageHeader.querySelector('p');
    if (title) title.textContent = `Xin chào ${currentUser.full_name || currentUser.email || ''}`.trim();
    if (description) description.textContent = 'Tổng quan hoạt động của các sân bạn quản lý: đơn sắp tới, giữ chỗ đang mở, doanh thu và đánh giá.';
  }
  const latestReviews = [...myReviews].sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || ''))).slice(0, 8);
  const averageRating = latestReviews.length ? latestReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / latestReviews.length : 0;

  const statsGrid = el('div', null, { class: 'grid-4' }, [
    renderStatCard({
      label: 'Sân đang hoạt động',
      value: String(activePitches.length),
      hint: !pitches.length ? 'Chưa có sân nào' : activePitches.length === pitches.length
        ? `Cả ${pitches.length} sân đang nhận đơn`
        : `${pitches.length - activePitches.length}/${pitches.length} sân đang tạm dừng hoặc tạm ngưng`,
      icon: 'Building2',
      tone: 'primary',
      progress: pitches.length && activePitches.length < pitches.length ? (activePitches.length / pitches.length) * 100 : null
    }),
    renderStatCard({
      label: 'Đơn sắp tới',
      value: String(upcomingBookings.length),
      hint: `${activeHolds.length} đơn đang giữ chỗ ${holdText()}`,
      icon: 'Ticket',
      tone: 'info'
    }),
    renderStatCard({
      label: 'Doanh thu tháng này',
      value: formatVnd(monthPaid - monthRefunded),
      hint: `Số dư ví: ${formatVnd(walletBalance)}`,
      icon: 'Wallet',
      tone: 'success'
    }),
    renderStatCard({
      label: 'Đánh giá gần đây',
      value: latestReviews.length ? `${averageRating.toFixed(1)}/5` : '—',
      hint: latestReviews.length ? `${latestReviews.length} đánh giá mới nhất` : 'Khách đánh giá sau khi trận đá xong',
      icon: 'Star',
      tone: 'warning',
      progress: latestReviews.length ? (averageRating / 5) * 100 : null
    })
  ]);

  const twoCols = el('div', null, { class: 'manager-overview-grid' });

  const upcomingBox = el('section', null, { class: 'surface stack overview-panel' }, [
    el('h2', 'Đơn sắp diễn ra')
  ]);
  if (!upcomingBookings.length) {
    upcomingBox.append(el('div', 'Chưa có đơn sắp tới. Khi khách đặt sân, các đơn sắp diễn ra sẽ xuất hiện ở đây.', { class: 'empty' }));
  } else {
    for (const b of upcomingBookings.slice(0, UPCOMING_LIMIT)) {
      upcomingBox.append(
        el('div', null, { class: 'card card--compact card--subtle row-between' }, [
          el('div', null, {}, [
            el('strong', b.pitch_name, { class: 'text-sm' }),
            infoLines([`Mã đơn: ${b.code}`, `${formatDate(b.local_date)}, ${b.slot_label || b.start_time}`, `Khách: ${b.customer_name || '—'}`], 'text-xs muted')
          ]),
          el('a', 'Chi tiết', { href: `booking-details.html?id=${encodeURIComponent(b.id)}`, class: 'button secondary sm' })
        ])
      );
    }
  }
  upcomingBox.append(el('div', null, { class: 'overview-panel-footer' }, [
    el('a', upcomingBookings.length > UPCOMING_LIMIT ? `Xem tất cả ${upcomingBookings.length} đơn sắp tới →` : 'Xem tất cả đơn →', { href: 'manager-bookings.html', class: 'text-link text-sm font-bold link-button' })
  ]));

  const rightStack = el('div', null, { class: 'stack overview-side' });
  const holdsBox = el('section', null, { class: 'surface stack' }, [
    el('h2', `Giữ chỗ đang chờ thanh toán (${activeHolds.length})`)
  ]);
  if (!activeHolds.length) {
    holdsBox.append(el('p', 'Hiện không có đơn nào đang giữ chỗ tạm thời.', { class: 'text-sm muted' }));
  } else {
    for (const h of activeHolds) {
      holdsBox.append(
        el('div', null, { class: 'card card--compact card--subtle row-between' }, [
          el('div', null, {}, [
            el('strong', `${h.pitch_name} (${h.slot_label})`, { class: 'text-sm' }),
            el('div', `Hết hạn lúc: ${formatDateTime(h.hold_expires_at)}`, { class: 'text-xs muted' })
          ]),
          renderBadge(BOOKING_STATUS.pending)
        ])
      );
    }
  }

  const pitchesQuickBox = el('section', null, { class: 'surface stack' }, [
    el('div', null, { class: 'row-between' }, [
      el('h2', 'Sân bóng của bạn'),
      el('a', 'Thêm sân mới', { href: 'add-pitch.html', class: 'button secondary sm' })
    ])
  ]);
  if (!pitches.length) {
    pitchesQuickBox.append(el('div', 'Bạn chưa tạo sân nào.', { class: 'empty' }));
  } else {
    const upcomingByPitch = new Map();
    for (const b of upcomingBookings) upcomingByPitch.set(b.pitch_id, (upcomingByPitch.get(b.pitch_id) || 0) + 1);
    const holdsByPitch = new Map();
    for (const b of activeHolds) holdsByPitch.set(b.pitch_id, (holdsByPitch.get(b.pitch_id) || 0) + 1);
    for (const p of pitches) {
      const upcomingCount = upcomingByPitch.get(p.id) || 0;
      const holdCount = holdsByPitch.get(p.id) || 0;
      const signal = upcomingCount || holdCount
        ? el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
          upcomingCount ? el('span', `${upcomingCount} đơn sắp tới`, { class: 'badge badge--info pitch-booking-signal' }) : null,
          holdCount ? el('span', `${holdCount} đang giữ chỗ`, { class: 'badge badge--warning pitch-booking-signal' }) : null
        ])
        : el('span', 'Chưa có đơn sắp tới', { class: 'text-xs muted' });
      pitchesQuickBox.append(
        el('div', null, { class: `card card--compact card--subtle row-between${upcomingCount || holdCount ? ' pitch-row--has-bookings' : ''}` }, [
          el('div', null, { class: 'pitch-quick-info' }, [
            el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
              el('strong', p.name, { class: 'text-sm' }),
              p.status !== 'active' ? renderBadge(PITCH_STATUS[p.status], p.status) : null
            ]),
            infoLines([PITCH_TYPE_LABEL[p.type] || p.type, `${formatVnd(p.base_price_vnd)}/giờ`], 'text-xs muted'),
            signal
          ]),
          el('div', null, { class: 'row' }, [
            p.status === 'banned' ? null : el('a', 'Lịch & giá', { href: `pitch-availability.html?id=${encodeURIComponent(p.id)}`, class: 'button secondary sm' }),
            el('a', upcomingCount ? `Xem đơn (${upcomingCount})` : 'Xem đơn', { href: `manager-bookings.html?id=${encodeURIComponent(p.id)}`, class: `button sm${upcomingCount ? '' : ' secondary'}` })
          ])
        ])
      );
    }
  }

  const pitchNames = new Map(pitches.map(p => [p.id, p.name]));
  const allReviewsSorted = [...myReviews].sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || '')));
  const reviewCard = review => el('div', null, { class: 'card card--compact card--subtle stack-sm' }, [
    el('div', null, { class: 'row-between', utility: 'u-gap-0p4rem' }, [
      el('strong', review.customer_name || 'Khách hàng', { class: 'text-sm' }),
      el('span', `★ ${Number(review.rating || 0)}/5`, { class: 'badge badge--warning' })
    ]),
    el('p', review.body || 'Không có nội dung', { class: 'text-xs muted' }),
    infoLines([pitchNames.get(review.pitch_id) || 'Sân bóng', formatDate(String(review.created_date || '').slice(0, 10))], 'text-xs muted')
  ]);

  const reviewsDialog = el('dialog', null, { class: 'reviews-dialog', 'aria-labelledby': 'reviews-dialog-title' });
  function openAllReviews() {
    const pitchFilter = el('select', null, { id: 'reviews-pitch-filter' }, [
      el('option', 'Tất cả sân', { value: '' }),
      ...pitches.map(p => el('option', p.name, { value: p.id }))
    ]);
    const list = el('div', null, { class: 'stack-sm reviews-dialog-list' });
    const summary = el('p', '', { class: 'text-sm muted' });
    const renderList = () => {
      const rows = pitchFilter.value ? allReviewsSorted.filter(r => r.pitch_id === pitchFilter.value) : allReviewsSorted;
      const avg = rows.length ? rows.reduce((s, r) => s + Number(r.rating || 0), 0) / rows.length : 0;
      summary.textContent = rows.length ? `${rows.length} đánh giá, điểm trung bình ${avg.toFixed(1)}/5` : '';
      list.replaceChildren(...(rows.length
        ? rows.map(reviewCard)
        : [el('p', 'Sân này chưa có đánh giá nào.', { class: 'empty' })]));
    };
    pitchFilter.addEventListener('change', renderList);
    const closeBtn = el('button', 'Đóng', { type: 'button', class: 'button secondary' });
    closeBtn.addEventListener('click', () => reviewsDialog.close());
    reviewsDialog.replaceChildren(el('div', null, { class: 'stack' }, [
      // Focus tiêu đề để iOS không tự mở ô chọn sân.
      el('h2', 'Tất cả đánh giá', { id: 'reviews-dialog-title', tabindex: '-1', autofocus: '' }),
      el('div', null, { class: 'field-group' }, [el('label', 'Lọc theo sân', { for: 'reviews-pitch-filter' }), pitchFilter]),
      summary,
      list,
      el('div', null, { class: 'reviews-dialog-actions' }, [closeBtn])
    ]));
    renderList();
    reviewsDialog.showModal();
  }

  const reviewsBox = el('section', null, { class: 'surface stack overview-panel' }, [el('h2', 'Đánh giá mới nhất')]);
  if (!latestReviews.length) {
    reviewsBox.append(el('p', 'Chưa có đánh giá. Khách chỉ đánh giá được sau khi đơn hoàn thành.', { class: 'text-sm muted' }));
  } else {
    for (const review of latestReviews.slice(0, REVIEW_LIMIT)) reviewsBox.append(reviewCard(review));
    const allBtn = el('button', `Xem tất cả ${allReviewsSorted.length} đánh giá →`, { type: 'button', class: 'text-link text-sm font-bold link-button' });
    allBtn.addEventListener('click', openAllReviews);
    reviewsBox.append(el('div', null, { class: 'overview-panel-footer' }, [allBtn]));
  }
  rightStack.append(holdsBox, reviewsBox);
  twoCols.append(upcomingBox, rightStack);
  content.replaceChildren(statsGrid, twoCols, pitchesQuickBox, reviewsDialog);
}

const UPCOMING_LIMIT = 5;
const REVIEW_LIMIT = 3;

bootManagement(renderManagerDashboard);
