import { MOCK_PITCHES, formatPitchPrice } from "../data/pitches.js";
import "../components/site-header.js";
import "../components/site-footer.js";

const elements = {
  form: document.getElementById("quick-search-form"),
  dateButton: document.getElementById("date-picker-button"),
  datePanel: document.getElementById("date-picker-panel"),
  dateValue: document.getElementById("date-picker-value"),
  dateInput: document.getElementById("search-date"),
  calendarMonth: document.getElementById("calendar-month"),
  calendarDays: document.getElementById("calendar-days"),
  timeButton: document.getElementById("time-picker-button"),
  timePanel: document.getElementById("time-picker-panel"),
  timeValue: document.getElementById("time-picker-value"),
  timeInput: document.getElementById("search-time"),
  results: document.getElementById("results"),
  resultSummary: document.getElementById("result-summary"),
  messageBubble: document.querySelector(".message-bubble"),
  quickSearch: document.getElementById("quick-search"),
};

let selectedDate = null;
let selectedTime = "";

function togglePanel(panel, button) {
  const isExpanded = button.getAttribute("aria-expanded") === "true";
  
  if (elements.datePanel) elements.datePanel.hidden = true;
  if (elements.timePanel) elements.timePanel.hidden = true;
  if (elements.dateButton) elements.dateButton.setAttribute("aria-expanded", "false");
  if (elements.timeButton) elements.timeButton.setAttribute("aria-expanded", "false");

  if (!isExpanded) {
    if (panel) panel.hidden = false;
    if (button) button.setAttribute("aria-expanded", "true");
  }
}

function getFavorites() {
  return JSON.parse(localStorage.getItem('app_favorites') || '[1, 3, 4, 7]');
}
function toggleFavorite(id, btn) {
  let favs = getFavorites();
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id);
    btn.classList.remove('is-active');
  } else {
    favs.push(id);
    btn.classList.add('is-active');
  }
  localStorage.setItem('app_favorites', JSON.stringify(favs));
}

function renderPitches() {
  const grid = elements.results;
  const template = document.getElementById("tpl-card");
  if (!grid || !template) return;

  const favs = getFavorites();

  const cards = MOCK_PITCHES.slice(0, 4).map(pitch => {
    const node = template.content.cloneNode(true);
    const link = node.querySelector(".card__link");
    const image = node.querySelector(".card__img");
    const rating = node.querySelector(".card__rating");
    const favoriteButton = node.querySelector(".card__favorite");

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

    const badge = node.querySelector(".card__badge");
    if (pitch.badge) badge.textContent = pitch.badge;
    else badge.hidden = true;

    if (favs.includes(pitch.id)) {
      favoriteButton.classList.add('is-active');
    }
    
    favoriteButton.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFavorite(pitch.id, favoriteButton);
    });

    return node;
  });

  grid.replaceChildren(...cards);
  
  if (elements.resultSummary) {
    elements.resultSummary.textContent = "Các sân bóng được đánh giá cao nhất trong tuần.";
  }
  grid.removeAttribute("aria-busy");
}

function init() {
  if (elements.dateButton) {
    elements.dateButton.addEventListener("click", () => togglePanel(elements.datePanel, elements.dateButton));
  }
  if (elements.timeButton) {
    elements.timeButton.addEventListener("click", () => togglePanel(elements.timePanel, elements.timeButton));
  }
  
  if (elements.form) {
    elements.form.addEventListener("submit", (e) => {
      if (!elements.dateInput.value) {
        e.preventDefault();
        alert("Vui lòng chọn ngày đá!");
      }
    });
  }

  document.addEventListener("click", (e) => {
    const isClickInside = e.target.closest(".picker");
    if (!isClickInside) {
      if (elements.datePanel) elements.datePanel.hidden = true;
      if (elements.timePanel) elements.timePanel.hidden = true;
      if (elements.dateButton) elements.dateButton.setAttribute("aria-expanded", "false");
      if (elements.timeButton) elements.timeButton.setAttribute("aria-expanded", "false");
    }
  });

  renderPitches();
}

init();
