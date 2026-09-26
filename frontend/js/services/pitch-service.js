import { initializeState, loadState } from './storage-service.js';

const PITCH_TYPES = new Set(['5-a-side', '7-a-side', '11-a-side']);
const SORT_OPTIONS = new Set(['recommended', 'rating-desc', 'price-asc', 'price-desc']);

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeSearchText(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi');
}

function normalizePitchId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeDate(value) {
  const date = normalizeText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(`${date}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return '';
  const [year, month, day] = date.split('-').map(Number);
  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day
    ? date
    : '';
}

function normalizeTime(value) {
  const time = normalizeText(value);
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '';
}

function matchesSchedule(pitch, date, time) {
  if (date) {
    const weekday = new Date(`${date}T00:00:00`).getDay();
    if (Array.isArray(pitch.openWeekdays) && !pitch.openWeekdays.includes(weekday)) return false;
  }
  if (!time) return true;
  return !pitch.operatingHours
    || (time >= pitch.operatingHours.open && time < pitch.operatingHours.close);
}

export function normalizePitchSearch(input = {}) {
  const pitchType = normalizeText(input.pitchType);
  const sort = normalizeText(input.sort);
  return {
    q: normalizeText(input.q),
    location: normalizeText(input.location),
    date: normalizeDate(input.date),
    time: normalizeTime(input.time),
    pitchType: PITCH_TYPES.has(pitchType) ? pitchType : '',
    sort: SORT_OPTIONS.has(sort) ? sort : 'recommended',
  };
}

export async function preparePitchCatalog() {
  await initializeState();
  return loadState()?.pitches ?? [];
}

export function listPublicPitches() {
  return (loadState()?.pitches ?? []).filter(pitch => pitch.status === 'active');
}

export function listFeaturedPitches(limit = 4) {
  return listPublicPitches()
    .filter(pitch => pitch.featured)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function searchPitches(input = {}) {
  const filters = normalizePitchSearch(input);
  const query = normalizeSearchText(filters.q);
  const location = normalizeSearchText(filters.location);
  const matches = listPublicPitches().filter(pitch => {
    const searchableText = normalizeSearchText(
      [pitch.name, pitch.location, pitch.district, pitch.typeLabel].join(' '),
    );
    const matchesQuery = !query || searchableText.includes(query);
    const matchesLocation = !location || normalizeSearchText(pitch.district) === location;
    const matchesType = !filters.pitchType || pitch.type === filters.pitchType;
    return matchesQuery
      && matchesLocation
      && matchesType
      && matchesSchedule(pitch, filters.date, filters.time);
  });

  if (filters.sort === 'rating-desc') return [...matches].sort((a, b) => b.rating - a.rating);
  if (filters.sort === 'price-asc') return [...matches].sort((a, b) => a.price - b.price);
  if (filters.sort === 'price-desc') return [...matches].sort((a, b) => b.price - a.price);
  return [...matches].sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
}

export function getPitchById(pitchId) {
  const id = normalizePitchId(pitchId);
  if (!id) return null;
  return (loadState()?.pitches ?? []).find(pitch => pitch.id === id) ?? null;
}

export function formatPitchPrice(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ / giờ`;
}
