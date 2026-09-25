import { MOCK_OWNERS } from '../data/owners.js';
import { MOCK_PITCHES, formatPitchPrice } from '../data/pitches.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const pitchIdParam = new URLSearchParams(location.search).get('pitchId');
const main = document.getElementById('main-content') || document.getElementById('detail');
const getEl = id => document.getElementById(id);

function loadPitch() {
  if (!pitchIdParam) { location.href = '404.html'; return; }
  const pitch = MOCK_PITCHES.find(p => String(p.id) === pitchIdParam);
  if (!pitch) { location.href = '404.html'; return; }

  document.title = pitch.name + ' — Pitch Point';
  if(getEl('title')) getEl('title').textContent = pitch.name;
  if(getEl('pitch-location')) getEl('pitch-location').textContent = pitch.location;
  if(getEl('pitch-type')) getEl('pitch-type').textContent = pitch.typeLabel;
  if(getEl('pitch-price')) getEl('pitch-price').textContent = formatPitchPrice(pitch.price);
  
  if (getEl('pitch-badge')) {
    if (pitch.badge) {
      getEl('pitch-badge').textContent = pitch.badge;
    } else {
      getEl('pitch-badge').hidden = true;
    }
  }
  
  if(getEl('pitch-rating')) getEl('pitch-rating').textContent = '★ ' + pitch.rating.toFixed(1) + ' / 5.0';
  
  const imgElement = getEl('pitch-image');
  if(imgElement) {
    imgElement.src = pitch.image || 'img/placeholder.svg';
    imgElement.alt = 'Hình ảnh sân ' + pitch.name;
  }

  const ownerLink = getEl('pitch-owner-link');
  const ownerName = getEl('pitch-owner-name');
  if (ownerLink) {
    if (pitch.ownerId) {
      ownerLink.href = 'pitch-owner-profile.html?ownerId=' + pitch.ownerId;
      const owner = MOCK_OWNERS.find(o => o.id === pitch.ownerId);
      if (owner && ownerName) ownerName.textContent = owner.name;
    } else {
      ownerLink.hidden = true;
    }
  }

  const bookingPitchId = getEl('booking-pitch-id');
  if (bookingPitchId) bookingPitchId.value = pitch.id;

  if(main) main.hidden = false;
}
loadPitch();
