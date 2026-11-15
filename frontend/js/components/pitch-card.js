import { api } from '../services/api-client.js';
import { renderBadge, createIcon } from '../core/ui.js';
import { el, formatVnd, dateLabel, todayLocal, addDays, pitchAcceptsBookings, PITCH_STATUS, PITCH_TYPE_LABEL } from '../core/render.js';
import { page } from '../features/customer-kit.js';

function placeholderVariant(pitchId = '') {
  let hash = 0;
  for (const ch of String(pitchId)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 4;
}

const placeholder = pitch => el('div', null, { class: `pitch-card-placeholder pitch-card-placeholder--v${placeholderVariant(pitch.id)}`, 'aria-hidden': 'true' }, [el('span')]);

export function nextSlotLabel(slot) {
  if (!slot?.local_date) return '';
  const today = todayLocal();
  const when = slot.local_date === today ? 'hôm nay' : slot.local_date === addDays(today, 1) ? 'ngày mai' : dateLabel(slot.local_date);
  return `${slot.start} ${when}`;
}

export function buildPitchCardMedia(pitch, reviewSummary = {}, options = {}) {
  const { href = `pitch-detail.html?id=${encodeURIComponent(pitch.id)}`, titleTag = 'div', alwaysShowStatus = false } = options;
  const media = el('a', null, {
    href,
    class: 'pitch-card-media',
    style: `view-transition-name: pitch-${pitch.id}`,
    'aria-label': `Xem chi tiết ${pitch.name || 'sân bóng'}`
  });

  if (Array.isArray(pitch.images) && pitch.images[0]) {
    const img = el('img', null, { src: pitch.images[0], alt: '', loading: 'lazy' });
    img.addEventListener('error', () => {
      img.remove();
      media.prepend(placeholder(pitch));
    });
    media.append(img);
  } else {
    media.append(placeholder(pitch));
  }

  media.append(el(titleTag, pitch.name || 'Sân bóng', { class: 'pitch-card-media-title' }));
  const ratingText = reviewSummary.count
    ? `${Number(reviewSummary.avg || 0).toFixed(1)} (${reviewSummary.count})`
    : '';
  const ratingChip = reviewSummary.count
    ? el('span', null, { class: 'pitch-card-chip pitch-card-chip--rating', title: `Đánh giá ${ratingText}` }, [createIcon('Star', 12), el('span', ratingText)])
    : el('span', 'Chưa có đánh giá', { class: 'pitch-card-chip' });
  const chips = el('div', null, { class: 'pitch-card-chips' }, [
    el('span', null, { class: 'pitch-card-chip' }, [createIcon('Users', 12), el('span', PITCH_TYPE_LABEL[pitch.type] || pitch.type || 'Sân bóng')]),
    ratingChip
  ]);
  if (pitch.status && (alwaysShowStatus || pitch.status !== 'active')) {
    chips.append(renderBadge(PITCH_STATUS[pitch.status], pitch.status));
  } else if (pitch.manager_suspended) {
    chips.append(renderBadge({ label: 'Tạm ngưng nhận đơn', tone: 'warning' }, 'paused'));
  }
  media.append(chips);
  return media;
}

export function buildPitchCard(pitch, reviewSummary = {}, options = {}) {
  const { dateParam = '', onRemoveFavorite = null } = options;
  const article = el('article', null, { class: 'surface pitch-card', 'data-memory-id': `pitch-${pitch.id}` });
  const linkDate = pitch.available_count === 0 && pitch.next_slot?.local_date ? pitch.next_slot.local_date : dateParam;
  const detailHref = `pitch-detail.html?id=${encodeURIComponent(pitch.id)}${linkDate ? `&date=${encodeURIComponent(linkDate)}` : ''}`;
  const media = buildPitchCardMedia(pitch, reviewSummary, { href: detailHref });
  const displayPrice = pitch.price_on_date ?? pitch.base_price_vnd;

  const body = el('div', null, { class: 'pitch-card-body' });

  const meta = el('div', null, { class: 'pitch-card-meta' }, [
    el('span', null, { class: 'pitch-card-meta-item', title: pitch.address || '' }, [createIcon('MapPin', 14), el('span', pitch.address || 'Chưa có địa chỉ')])
  ]);
  body.append(meta);

  const mapWrapper = el('div', null, { hidden: true, class: 'stack-sm' });
  const mapQuery = encodeURIComponent(`${pitch.name || ''} ${pitch.address || ''} ${pitch.district || ''} ${pitch.city || ''}`.trim());

  const mapToggle = el('button', null, {
    type: 'button',
    class: 'pitch-map-toggle',
    'aria-expanded': 'false',
    'aria-label': `Xem bản đồ ${pitch.name || 'sân bóng'}`
  }, [createIcon('MapPin', 14), el('span', 'Xem bản đồ')]);

  mapToggle.addEventListener('click', () => {
    const showing = !mapWrapper.hidden;
    const labelSpan = mapToggle.querySelector('span');
    if (showing) {
      mapWrapper.hidden = true;
      mapWrapper.replaceChildren();
      if (labelSpan) labelSpan.textContent = 'Xem bản đồ';
      mapToggle.setAttribute('aria-label', `Xem bản đồ ${pitch.name || 'sân bóng'}`);
      mapToggle.setAttribute('aria-expanded', 'false');
    } else {
      mapWrapper.hidden = false;
      if (labelSpan) labelSpan.textContent = 'Ẩn bản đồ';
      mapToggle.setAttribute('aria-label', `Ẩn bản đồ ${pitch.name || 'sân bóng'}`);
      mapToggle.setAttribute('aria-expanded', 'true');
      const mapSkeleton = el('div', 'Đang tải bản đồ khu vực sân…', {
        class: 'skeleton map-embed-skeleton',
        'aria-hidden': 'true'
      });
      const iframe = el('iframe', null, {
        title: `Bản đồ ${pitch.name}`,
        src: `https://www.google.com/maps?q=${mapQuery}&output=embed`,
        loading: 'lazy',
        class: 'map-embed-frame'
      });
      iframe.addEventListener('load', () => {
        mapSkeleton.remove();
        iframe.classList.add('map-embed-frame--loaded');
      }, { once: true });
      const embedBox = el('div', null, { class: 'map-embed-wrap' }, [mapSkeleton, iframe]);
      const extLink = el('a', 'Mở trên Google Maps ↗', {
        href: `https://www.google.com/maps/search/?api=1&query=${mapQuery}`,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'text-xs font-bold',
        utility: 'u-color-brand-text'
      });
      const note = el('p', 'Vị trí trên bản đồ có thể chỉ gần đúng. Hãy đối chiếu với địa chỉ của sân.', { class: 'text-xs muted' });
      mapWrapper.replaceChildren(note, embedBox, extLink);
    }
    const grid = article.parentElement;
    if (grid) grid.classList.toggle('pitch-grid--map-open', !!grid.querySelector('.pitch-map-toggle[aria-expanded="true"]'));
  });
  body.append(mapToggle, mapWrapper);

  if (Array.isArray(pitch.facilities) && pitch.facilities.length) {
    const facList = el('ul', null, { class: 'pitch-card-facilities', 'aria-label': 'Tiện ích' });
    for (const f of pitch.facilities.slice(0, 3)) {
      facList.append(el('li', f, { class: 'pitch-card-facility-pill' }));
    }
    body.append(facList);
  }

  if (pitch.available_count != null) {
    const dayWord = page === 'index' ? 'hôm nay' : 'trong ngày đã chọn';
    const next = pitch.available_count === 0 ? nextSlotLabel(pitch.next_slot) : '';
    const text = pitch.available_count > 0
      ? `${pitch.available_count} khung giờ còn trống ${dayWord}`
      : next ? `Trống gần nhất: ${next}` : `Không còn khung giờ trống ${dayWord}`;
    const tone = pitch.available_count > 0 || next ? 'open' : 'empty';
    body.append(el('p', text, { class: `pitch-card-availability pitch-card-availability--${tone}` }));
  }

  const rightLinks = el('div', null, { class: onRemoveFavorite ? 'pitch-card-links pitch-card-links--stacked' : 'row', utility: 'u-gap-0p4rem' });
  if (onRemoveFavorite) {
    const rmBtn = el('button', 'Bỏ lưu', { 'data-needs-active': '', type: 'button', class: 'button danger-outline sm' });
    rmBtn.addEventListener('click', () => onRemoveFavorite(pitch));
    rightLinks.append(rmBtn);
  }
  const open = pitchAcceptsBookings(pitch);
  const bookLink = el('a', null, {
    href: detailHref,
    class: 'pitch-card-action-link',
    'aria-label': open ? `Xem và đặt ${pitch.name || 'sân bóng'}` : `Xem ${pitch.name || 'sân bóng'}`
  }, [el('span', open ? 'Đặt sân' : 'Xem sân')]);
  rightLinks.append(bookLink);

  const actionsRow = el('div', null, { class: 'pitch-card-actions' }, [
    el('div', null, { class: 'pitch-card-price-row' }, [
      el('p', null, { class: 'pitch-card-price' }, [
        document.createTextNode('Từ '),
        el('strong', formatVnd(displayPrice)),
        document.createTextNode(' /giờ')
      ]),
      rightLinks
    ])
  ]);
  body.append(actionsRow);

  article.append(media, body);

  if (window.matchMedia?.('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
    article.addEventListener('pointermove', (e) => {
      const rect = article.getBoundingClientRect();
      article.style.setProperty('--spot-x', `${Math.round(e.clientX - rect.left)}px`);
      article.style.setProperty('--spot-y', `${Math.round(e.clientY - rect.top)}px`);
    });
    bookLink.addEventListener('pointermove', (e) => {
      const r = bookLink.getBoundingClientRect();
      const dx = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 3.5;
      const dy = ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * 2.5;
      bookLink.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    });
    bookLink.addEventListener('pointerleave', () => {
      bookLink.style.transform = '';
    });
  }

  return article;
}


export async function fetchReviewSummaries() {
  const result = await api.entities.Review.aggregate({ groupBy: 'pitch_id', avg: ['rating'] });
  const out = {};
  for (const row of result.rows || []) {
    if (row.pitch_id) out[row.pitch_id] = { avg: Number(row.avg_rating || 0), count: Number(row.count || 0) };
  }
  return out;
}
