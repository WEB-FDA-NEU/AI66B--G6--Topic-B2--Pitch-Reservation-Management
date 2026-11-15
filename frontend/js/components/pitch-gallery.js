import { el } from '../core/render.js';
import { createIcon } from '../core/ui.js';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function placeholder() {
  return el('div', null, { class: 'pitch-card-placeholder', 'aria-hidden': 'true' }, [el('span')]);
}

export function buildPitchGallery({ images = [], name = 'Sân bóng' }) {
  const photos = images.map(src => String(src || '').trim()).filter(Boolean);
  if (!photos.length) return [placeholder()];

  const photo = (src, index) => {
    const img = el('img', null, {
      src,
      alt: photos.length > 1 ? `${name} — ảnh ${index + 1}/${photos.length}` : name,
      class: 'pitch-card-photo',
      loading: index === 0 ? 'eager' : 'lazy',
      decoding: 'async',
      draggable: 'false'
    });
    img.addEventListener('error', () => img.replaceWith(placeholder()), { once: true });
    return img;
  };

  if (photos.length === 1) return [photo(photos[0], 0)];

  const track = el('ul', null, { class: 'pitch-gallery-track', tabindex: '0', 'aria-label': `Ảnh sân, dùng phím mũi tên trái phải để xem ${photos.length} ảnh` },
    photos.map((src, i) => el('li', null, { class: 'pitch-gallery-slide' }, [photo(src, i)])));
  const counter = el('span', `1/${photos.length}`, { class: 'pitch-gallery-counter', 'aria-live': 'polite' });
  const prev = el('button', null, { type: 'button', class: 'pitch-gallery-nav pitch-gallery-nav--prev', 'aria-label': 'Ảnh trước' }, [createIcon('ChevronLeft', 20)]);
  const next = el('button', null, { type: 'button', class: 'pitch-gallery-nav pitch-gallery-nav--next', 'aria-label': 'Ảnh sau' }, [createIcon('ChevronRight', 20)]);
  const dots = photos.map((_, i) => el('button', null, { type: 'button', class: 'pitch-gallery-dot', 'aria-label': `Xem ảnh ${i + 1}` }));
  const dotRow = el('div', null, { class: 'pitch-gallery-dots' }, dots);

  let current = 0;
  const show = (index) => {
    current = Math.max(0, Math.min(photos.length - 1, index));
    counter.textContent = `${current + 1}/${photos.length}`;
    prev.disabled = current === 0;
    next.disabled = current === photos.length - 1;
    dots.forEach((d, i) => d.setAttribute('aria-current', i === current ? 'true' : 'false'));
  };
  const goTo = (index) => {
    const target = Math.max(0, Math.min(photos.length - 1, index));
    track.scrollTo({ left: target * track.clientWidth, behavior: reduceMotion() ? 'auto' : 'smooth' });
    show(target);
  };

  prev.addEventListener('click', () => goTo(current - 1));
  next.addEventListener('click', () => goTo(current + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
  });
  let frame = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (index !== current) show(index);
    });
  }, { passive: true });

  show(0);
  return [track, counter, prev, next, dotRow];
}
