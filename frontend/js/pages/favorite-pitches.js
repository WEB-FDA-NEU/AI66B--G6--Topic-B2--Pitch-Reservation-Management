import { MOCK_PITCHES, formatPitchPrice } from "../data/pitches.js";
import "../components/site-header.js";
import "../components/site-footer.js";

const main = document.getElementById("main-content");
const getEl = id => document.getElementById(id);

function getFavorites() {
  return JSON.parse(localStorage.getItem("app_favorites") || "[1, 3, 4, 7]");
}

function removeFavorite(id) {
  let favs = getFavorites();
  favs = favs.filter(favId => favId !== id);
  localStorage.setItem("app_favorites", JSON.stringify(favs));
  renderList();
}

function renderList() {
  const container = getEl("favorite-list");
  const countEl = getEl("favorite-count");
  const template = getEl("tpl-card");
  const emptyTemplate = getEl("tpl-empty-state");
  
  if (!container || !template || !emptyTemplate) return;

  const favoriteIds = getFavorites();
  const favoritePitches = MOCK_PITCHES.filter(p => favoriteIds.includes(p.id));

  if (countEl) {
    countEl.textContent = `${favoritePitches.length} sân bóng`;
  }

  if (favoritePitches.length === 0) {
    container.replaceChildren(emptyTemplate.content.cloneNode(true));
    return;
  }

  const cards = favoritePitches.map(pitch => {
    const node = template.content.cloneNode(true);
    const link = node.querySelector(".card__link");
    const image = node.querySelector(".card__img");
    const favoriteButton = node.querySelector(".card__favorite");
    const rating = node.querySelector(".card__rating");
    
    link.href = `pitch-detail.html?pitchId=${pitch.id}`;
    link.setAttribute("aria-label", `Xem chi tiết ${pitch.name}`);
    
    image.src = pitch.image || "img/placeholder.svg";
    image.alt = `Hình ảnh minh họa ${pitch.name}`;
    
    node.querySelector(".card__title").textContent = pitch.name;
    node.querySelector(".card__meta").textContent = pitch.location;
    node.querySelector(".card__type").textContent = pitch.typeLabel;
    node.querySelector(".card__price").textContent = formatPitchPrice(pitch.price);
    
    rating.textContent = `★ ${pitch.rating.toFixed(1)}`;
    rating.setAttribute("aria-label", `${pitch.rating.toFixed(1)} trên 5 sao`);
    
    if (pitch.badge) {
      node.querySelector(".card__badge").textContent = pitch.badge;
    } else {
      node.querySelector(".card__badge").hidden = true;
    }
    
    favoriteButton.classList.add("is-active");
    
    favoriteButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm(`Bạn muốn gỡ "${pitch.name}" khỏi danh sách yêu thích?`)) {
        removeFavorite(pitch.id);
      }
    });

    return node;
  });

  container.replaceChildren(...cards);
}

function loadFavorites() {
  renderList();
  if (main) main.hidden = false;
}

loadFavorites();
