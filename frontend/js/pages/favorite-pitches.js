import { api } from '../services/api-client.js';
import { toast } from '../core/ui.js';
import { el, todayLocal, createPager } from '../core/render.js';
import { buildPitchCard, fetchReviewSummaries } from '../components/pitch-card.js';
import { $, ensureAuthenticated, bootCustomerPage } from '../features/customer-kit.js';

async function renderFavoritesPage() {
  const main = $('#main');
  if (!main) return;
  main.className = 'container stack-lg';
  const u = await ensureAuthenticated();
  if (!u) return;

  const header = el('header', null, { class: 'page-header row-between' }, [
    el('div', null, {}, [
      el('p', 'Danh sách đã lưu', { class: 'eyebrow' }),
      el('h1', 'Sân bóng yêu thích')
    ]),
    el('a', 'Khám phá thêm sân', { href: 'search.html', class: 'button secondary sm' })
  ]);

  const resultsGrid = el('div', null, { id: 'results', class: 'grid-3' });
  const pager = createPager({ pageSize: 9, noun: 'sân', onChange: () => renderGrid(), scrollTarget: header });
  let pitches = [];
  let reviewMap = {};

  async function loadFavorites() {
    const [favsRes, reviews] = await Promise.all([
      api.entities.Favorite.filter({ user_id: u.id }, { sort: '-created_date' }),
      fetchReviewSummaries()
    ]);
    reviewMap = reviews;
    pitches = [];
    for (const f of favsRes.items) {
      try {
        const p = await api.entities.Pitch.get(f.pitch_id);
        pitches.push({ favId: f.id, pitch: p });
      } catch { }
    }
    renderGrid();
  }

  function renderGrid() {
    const pageRows = pager.slice(pitches);
    resultsGrid.replaceChildren();
    pager.el.hidden = !pitches.length;
    if (!pitches.length) {
      resultsGrid.append(
        el('div', null, { class: 'empty', utility: 'u-grid-column-1-over-n1' }, [
          el('h2', 'Bạn chưa lưu sân yêu thích nào'),
          el('p', 'Bấm "Lưu sân yêu thích" ở trang chi tiết sân để truy cập nhanh lần sau.'),
          el('a', 'Tìm sân bóng', { href: 'search.html', class: 'button sm', utility: 'u-margin-top-0p5rem' })
        ])
      );
      return;
    }
    for (const { favId, pitch } of pageRows) {
      resultsGrid.append(
        buildPitchCard(pitch, reviewMap[pitch.id], {
          dateParam: todayLocal(),
          async onRemoveFavorite() {
            await api.entities.Favorite.delete(favId);
            toast(`Đã bỏ lưu ${pitch.name}.`);
            await loadFavorites();
            const heading = header.querySelector('h1');
            if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
          }
        })
      );
    }
  }

  main.replaceChildren(header, resultsGrid, pager.el, el('p', '', { id: 'error', role: 'alert' }));
  await loadFavorites();
}

bootCustomerPage(user => renderFavoritesPage(user));
