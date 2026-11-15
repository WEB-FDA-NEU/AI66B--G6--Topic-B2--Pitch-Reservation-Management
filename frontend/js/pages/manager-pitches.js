import { el, formatVnd, fullAddress, quoteNote } from '../core/render.js';
import { buildPitchCardMedia, fetchReviewSummaries } from '../components/pitch-card.js';
import { content, currentUser, fetchRows, mainEl, bootManagement } from '../features/management-kit.js';

function statusNote(p) {
  if (p.status === 'paused') return el('div', `Đang tạm dừng nhận đơn mới${p.pause_reason ? `: ${quoteNote(p.pause_reason)}` : ''}. Mở lại trong trang Chỉnh sửa.`, { class: 'alert alert--warning text-sm' });
  if (p.status === 'suspended') return el('div', `Quản trị viên đang tạm ngưng sân này${p.suspension?.reason ? `. Lý do: ${p.suspension.reason}` : ''}. Sân sẽ được xem xét mở lại khi vấn đề được khắc phục.`, { class: 'alert alert--danger text-sm' });
  if (p.status === 'banned') return el('div', `Sân đã bị ngưng vĩnh viễn${p.suspension?.reason ? `. Lý do: ${p.suspension.reason}` : ''}.`, { class: 'alert alert--danger text-sm' });
  return null;
}

async function renderManagerPitches() {
  const pageHeader = mainEl.querySelector('.page-header');
  if (pageHeader) {
    const title = pageHeader.querySelector('h1');
    if (title) title.textContent = 'Danh sách sân đang quản lý';
  }
  const [pitches, bookings, reviewSummaries] = await Promise.all([
    fetchRows('Pitch', { manager_id: currentUser.id }),
    fetchRows('Booking', { manager_id: currentUser.id }),
    fetchReviewSummaries().catch(() => ({}))
  ]);

  const topBar = el('div', null, { class: 'row-between' }, [
    el('span'),
    el('a', '+ Thêm sân mới', { href: 'add-pitch.html', class: 'button' })
  ]);

  const list = el('div', null, { class: 'grid-2' });
  if (!pitches.length) {
    list.append(
      el('div', null, { class: 'empty', utility: 'u-grid-column-1-over-n1' }, [
        el('h2', 'Bạn chưa có sân bóng nào'),
        el('p', 'Hãy tạo sân bóng đầu tiên để thiết lập lịch mở cửa và nhận đơn đặt sân.'),
        el('a', '+ Thêm sân mới', { href: 'add-pitch.html', class: 'button sm', utility: 'u-margin-top-0p5rem' })
      ])
    );
  } else {
    for (const p of pitches) {
      const pBookings = bookings.filter(b => b.pitch_id === p.id && ['confirmed', 'completed'].includes(b.status));
      list.append(
        el('article', null, { class: 'surface pitch-card' }, [
          buildPitchCardMedia(p, reviewSummaries[p.id] || {}, { titleTag: 'h2', alwaysShowStatus: true }),
          el('div', null, { class: 'pitch-card-body' }, [
          el('div', null, { class: 'row-between' }, [
            el('p', fullAddress(p), { class: 'text-sm muted' }),
            el('strong', `${formatVnd(p.base_price_vnd)}/giờ`, { utility: 'u-color-brand-text' })
          ]),
          el('div', `Đã có ${pBookings.length} đơn xác nhận / hoàn tất`, { class: 'text-xs font-bold muted' }),
          statusNote(p),
          el('div', null, { class: 'row', utility: 'u-margin-top-auto u-padding-top-0p5rem u-border-top-1px-solid-border' }, [
            p.status === 'banned' ? null : el('a', 'Lịch & giá', { href: `pitch-availability.html?id=${encodeURIComponent(p.id)}`, class: 'button sm' }),
            el('a', 'Đơn đặt sân', { href: `manager-bookings.html?id=${encodeURIComponent(p.id)}`, class: 'button secondary sm' }),
            el('a', p.status === 'banned' ? 'Xem lý do' : p.status === 'paused' ? 'Chỉnh sửa / mở lại' : 'Chỉnh sửa', { href: `edit-pitch.html?id=${encodeURIComponent(p.id)}`, class: 'button secondary sm' }),
            el('a', 'Xem sân', { href: `pitch-detail.html?id=${encodeURIComponent(p.id)}`, class: 'button ghost sm' })
          ])
          ])
        ])
      );
    }
  }

  content.replaceChildren(topBar, list);
}

bootManagement(renderManagerPitches);
