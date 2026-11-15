import { api } from '../services/api-client.js';
import { buildBallIcon } from '../components/pitch-scene.js';
import { translateLink } from '../core/links.js';
import { createIcon, createPitchDiagramSvg } from '../core/ui.js';
import { el, formatDate, todayLocal } from '../core/render.js';
import { holdText, noticeText } from '../core/config.js';
import { buildPitchCard, fetchReviewSummaries } from '../components/pitch-card.js';
import { createSearchFormElement } from '../components/search-form.js';
import { $, bootCustomerPage } from '../features/customer-kit.js';

async function renderHomePage() {
  const main = $('#main');
  if (!main) return;
  main.className = 'container stack-xl page-flow';

  const hero = el('section', null, { class: 'hero hero-gradient home-hero surface' }, [
    el('div', null, { class: 'home-hero-light', 'aria-hidden': 'true' }),
    createPitchDiagramSvg(),
    el('div', null, { class: 'hero-grid' }, [
      el('div', null, {}, [
        el('span', null, { class: 'hero-badge-pill' }, [
          createIcon('Sparkles', 14),
          el('span', 'Đặt sân bóng theo giờ')
        ]),
        el('h1', 'Tìm sân bóng, chọn giờ phù hợp'),
        el('p', `Xem lịch trống của các sân, giữ chỗ ${holdText()} để thanh toán và theo dõi mọi đơn đặt sân ở một nơi.`, { class: 'hero-description' }),
        el('div', null, { class: 'hero-policy-grid' }, [
          el('span', null, { class: 'hero-policy-item' }, [createIcon('CalendarCheck', 16), el('span', `Giữ chỗ ${holdText()}`)]),
          el('span', null, { class: 'hero-policy-item' }, [createIcon('Star', 16), el('span', 'Đánh giá sau đơn hoàn tất')]),
          el('span', null, { class: 'hero-policy-item' }, [createIcon('Megaphone', 16), el('span', `Hủy trước ${noticeText()} được hoàn tiền`)])
        ])
      ])
    ])
  ]);

  const searchSection = el('section', null, { class: 'stack-sm motion-reveal', 'aria-labelledby': 'home-search-heading' }, [
    el('h2', 'Tìm sân theo nhu cầu của bạn', { id: 'home-search-heading', utility: 'u-font-size-1p25rem' })
  ]);
  const searchForm = createSearchFormElement({ date: '' }, { advanced: false });
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(searchForm);
    const q = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (String(v).trim()) q.set(k, String(v).trim());
    }
    location.href = `search.html?${q.toString()}`;
  });
  searchSection.append(searchForm);

  // Hiện khung trang ngay, chèn dữ liệu khi API trả về.
  const pitchesSection = el('section', null, { class: 'stack' });
  pitchesSection.append(
    el('div', null, { class: 'row-between' }, [
      el('div', null, {}, [
        el('h2', 'Sân gợi ý'),
        el('p', 'Các sân đang nhận đặt lịch.', { class: 'muted text-sm' })
      ]),
      el('a', 'Xem tất cả sân →', { href: 'search.html', class: 'button secondary sm' })
    ])
  );
  const resultsGrid = el('div', null, { id: 'results', class: 'grid-3', 'aria-busy': 'true' });
  for (let i = 0; i < 3; i++) {
    resultsGrid.append(el('div', null, { class: 'pitch-card pitch-card--skeleton', 'aria-hidden': 'true' }, [
      el('div', null, { class: 'skeleton-block skeleton-media' }),
      el('div', null, { class: 'pitch-card-body' }, [
        el('div', null, { class: 'skeleton-block skeleton-line', style: 'width:70%' }),
        el('div', null, { class: 'skeleton-block skeleton-line', style: 'width:45%' }),
        el('div', null, { class: 'skeleton-block skeleton-line', style: 'width:55%' })
      ])
    ]));
  }
  pitchesSection.append(resultsGrid);
  const errEl = el('p', '', { id: 'error', role: 'alert' });
  main.replaceChildren(hero, searchSection, pitchesSection, errEl);
  document.documentElement.classList.remove('page-initializing');

  const [pitchRes, reviewMap, contentItems] = await Promise.all([
    api.functions.invoke('searchPitches', { date: todayLocal() }),
    fetchReviewSummaries(),
    api.entities.ContentItem.list('-published_at', 20)
  ]);

  const publishedContent = contentItems.filter(c => c.status === 'published');
  const banners = publishedContent.filter(c => c.type === 'banner');
  const allAnnouncements = publishedContent.filter(c => c.type !== 'banner');
  const topAnnouncement = allAnnouncements.find(a => !isAnnouncementDismissed(a.id)) || null;
  const announcements = allAnnouncements.filter(a => a !== topAnnouncement);

  const bannerSection = el('div', null, { class: 'stack motion-reveal' });
  for (const b of banners.slice(0, 2)) {
    const card = el('section', null, { class: 'surface row-between' }, [
      el('div', null, { class: 'stack-sm' }, [
        el('span', null, { class: 'eyebrow promo-eyebrow' }, [buildBallIcon('ball-icon promo-ball'), document.createTextNode('Chương trình nổi bật')]),
        el('h2', b.title || 'Thông tin nổi bật'),
        el('p', b.body || '', { class: 'muted' })
      ]),
      b.cta_link
        ? el('a', b.cta_label || 'Khám phá ngay', { href: translateLink(b.cta_link), class: 'button' })
        : null
    ]);
    bannerSection.append(card);
  }

  resultsGrid.replaceChildren();
  resultsGrid.removeAttribute('aria-busy');
  const pitches = pitchRes.data?.results || [];
  if (!pitches.length) {
    resultsGrid.append(el('div', 'Hiện chưa có sân nào đang hoạt động.', { class: 'empty' }));
  } else {
    for (const p of pitches.slice(0, 6)) {
      resultsGrid.append(buildPitchCard(p, reviewMap[p.id], { dateParam: todayLocal() }));
    }
  }

  const announcementSection = el('section', null, { class: 'stack' });
  if (announcements.length) {
    announcementSection.append(
      el('div', null, {}, [
        el('h2', topAnnouncement ? 'Thông báo khác từ Pitch Point' : 'Thông báo từ Pitch Point')
      ])
    );
    const annGrid = el('div', null, { class: 'grid-2 announcement-grid' });
    for (const a of announcements.slice(0, 4)) {
      annGrid.append(
        el('article', null, { class: 'surface stack-sm' }, [
          el('div', null, { class: 'row-between' }, [
            el('span', 'Thông báo', { class: 'badge badge--info' }),
            el('span', formatDate(a.published_at || a.created_date), { class: 'text-xs muted' })
          ]),
          el('h3', a.title || 'Thông báo'),
          el('p', a.body || '', { class: 'text-sm muted' }),
          a.cta_link
            ? el('a', a.cta_label || 'Xem chi tiết →', { href: translateLink(a.cta_link), class: 'text-sm font-bold' })
            : null
        ])
      );
    }
    announcementSection.append(annGrid);
  }

  const topBanner = topAnnouncement ? buildAnnouncementBanner(topAnnouncement) : null;
  if (topBanner) hero.before(topBanner);
  if (bannerSection.childElementCount) searchSection.after(bannerSection);
  if (announcementSection.childElementCount) pitchesSection.after(announcementSection);
}

const DISMISSED_KEY = 'pitch-point:dismissed-announcements';

function readDismissed() {
  try {
    const list = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function isAnnouncementDismissed(id) {
  return readDismissed().includes(id);
}

function dismissAnnouncement(id) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...readDismissed().filter(x => x !== id), id].slice(-20)));
  } catch {
  }
}

function buildAnnouncementBanner(a) {
  const closeBtn = el('button', null, { type: 'button', class: 'home-announcement-close', 'aria-label': 'Ẩn thông báo này' }, [createIcon('X', 18)]);
  const banner = el('section', null, { class: 'alert alert--info home-announcement', 'aria-labelledby': 'home-announcement-title' }, [
    el('span', null, { class: 'home-announcement-icon', 'aria-hidden': 'true' }, [createIcon('Megaphone', 20)]),
    el('div', null, { class: 'home-announcement-body' }, [
      el('p', `Thông báo ngày ${formatDate(a.published_at || a.created_date)}`, { class: 'home-announcement-meta' }),
      el('p', a.title || 'Thông báo', { id: 'home-announcement-title', class: 'home-announcement-title' }),
      a.body ? el('p', a.body, { class: 'home-announcement-text' }) : null,
      a.cta_link
        ? el('a', a.cta_label || 'Xem chi tiết →', { href: translateLink(a.cta_link), class: 'home-announcement-link' })
        : null
    ]),
    closeBtn
  ]);
  closeBtn.addEventListener('click', () => {
    dismissAnnouncement(a.id);
    banner.remove();
    document.querySelector('#main form input, #main form select')?.focus();
  });
  return banner;
}

bootCustomerPage(user => renderHomePage(user));
