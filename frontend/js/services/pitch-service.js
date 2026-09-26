import { initializeState, loadState, updateState } from './storage-service.js';

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

function requireManager(user) {
  if (!user || user.role !== 'manager' || user.status !== 'active') {
    throw new Error('Tài khoản không được phép quản lý sân.');
  }
}

function requireAdmin(user) {
  if (!user || user.role !== 'admin' || user.status !== 'active') {
    throw new Error('Tài khoản không được phép kiểm duyệt sân.');
  }
}

function normalizePitchInput(input) {
  const name = normalizeText(input.name);
  const location = normalizeText(input.location);
  const district = normalizeText(input.district);
  const type = normalizeText(input.type);
  const price = Number(input.price);
  const description = normalizeText(input.description);
  const services = Array.isArray(input.services)
    ? input.services.map(normalizeText).filter(Boolean)
    : normalizeText(input.services).split(',').map(item => item.trim()).filter(Boolean);
  if (name.length < 3 || location.length < 5 || !district || !PITCH_TYPES.has(type)) {
    throw new Error('Thông tin tên, địa chỉ, khu vực hoặc loại sân chưa hợp lệ.');
  }
  if (!Number.isFinite(price) || price <= 0) throw new Error('Giá sân phải lớn hơn 0.');
  if (description.length < 20) throw new Error('Mô tả sân cần có ít nhất 20 ký tự.');
  return { name, location, district, type, price, description, services };
}

function typeLabel(type) {
  return ({ '5-a-side': 'Sân 5 người', '7-a-side': 'Sân 7 người', '11-a-side': 'Sân 11 người' })[type];
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

export function getOwnerProfile(ownerId) {
  const pitches = (loadState()?.pitches ?? []).filter(pitch => pitch.ownerProfileId === ownerId);
  if (!pitches.length) return null;
  const manager = loadState()?.users.find(user => user.id === pitches[0].ownerId);
  const rating = pitches.reduce((sum, pitch) => sum + pitch.rating, 0) / pitches.length;
  return {
    id: ownerId,
    managerId: pitches[0].ownerId,
    name: pitches[0].ownerName,
    managerName: manager?.displayName ?? pitches[0].ownerName,
    status: manager?.status ?? 'active',
    rating,
    pitchCount: pitches.length,
    description: `Đơn vị vận hành ${pitches.length} sân bóng tại Hà Nội trên Pitch Point.`,
    pitches,
  };
}

export function listManagerPitches(user) {
  requireManager(user);
  return (loadState()?.pitches ?? []).filter(pitch => pitch.ownerId === user.id);
}

export function getManagedPitch(user, pitchId) {
  requireManager(user);
  const id = normalizePitchId(pitchId);
  return (loadState()?.pitches ?? []).find(pitch => pitch.id === id && pitch.ownerId === user.id) ?? null;
}

export function createPitch(user, input) {
  requireManager(user);
  const values = normalizePitchInput(input);
  let created;
  updateState(state => {
    const nextId = state.pitches.reduce((largest, pitch) => Math.max(largest, pitch.id), 0) + 1;
    created = {
      id: nextId,
      ownerId: user.id,
      ownerProfileId: `O${user.id.slice(1)}`,
      managerId: user.id,
      ownerName: user.displayName,
      ...values,
      typeLabel: typeLabel(values.type),
      surface: normalizeText(input.surface) || 'Cỏ nhân tạo',
      rating: 0,
      reviewCount: 0,
      badge: 'Mới',
      image: 'img/placeholder.svg',
      featured: false,
      status: 'active',
      availableSlotsToday: 0,
      operatingHours: { open: '06:00', close: '22:00', label: '06:00 – 22:00' },
      openWeekdays: [0, 1, 2, 3, 4, 5, 6],
      createdAt: new Date().toISOString(),
    };
    state.pitches.push(created);
  });
  return structuredClone(created);
}

export function updatePitch(user, pitchId, input) {
  const pitch = getManagedPitch(user, pitchId);
  if (!pitch) throw new Error('Không tìm thấy sân thuộc quyền quản lý.');
  if (['suspended', 'permanently-suspended'].includes(pitch.status)) {
    throw new Error('Sân bị đình chỉ không thể chỉnh sửa.');
  }
  const values = normalizePitchInput(input);
  let updated;
  updateState(state => {
    const target = state.pitches.find(item => item.id === pitch.id);
    Object.assign(target, values, {
      typeLabel: typeLabel(values.type),
      surface: normalizeText(input.surface) || target.surface,
      updatedAt: new Date().toISOString(),
    });
    updated = target;
  });
  return structuredClone(updated);
}

export function setPitchActive(user, pitchId, active) {
  const pitch = getManagedPitch(user, pitchId);
  if (!pitch) throw new Error('Không tìm thấy sân thuộc quyền quản lý.');
  if (!['active', 'deactivated'].includes(pitch.status)) {
    throw new Error('Chỉ sân đang hoạt động hoặc đã tạm ngừng mới được thay đổi trạng thái.');
  }
  updateState(state => {
    const target = state.pitches.find(item => item.id === pitch.id);
    target.status = active ? 'active' : 'deactivated';
    target.availableSlotsToday = active ? Math.max(1, target.availableSlotsToday) : 0;
    target.updatedAt = new Date().toISOString();
  });
  return getManagedPitch(user, pitch.id);
}

export function listPitchesForModeration(admin, filters = {}) {
  requireAdmin(admin);
  const query = normalizeSearchText(filters.query);
  return (loadState()?.pitches ?? []).filter(pitch => {
    const matchesStatus = !filters.status || pitch.status === filters.status;
    const matchesQuery = !query || normalizeSearchText([pitch.id, pitch.name, pitch.ownerName].join(' ')).includes(query);
    return matchesStatus && matchesQuery;
  });
}

export function listReviewedPitchReports(admin, pitchId) {
  requireAdmin(admin);
  const id = normalizePitchId(pitchId);
  return structuredClone((loadState()?.reports ?? []).filter(report => (
    report.targetType === 'pitch'
    && String(report.targetId) === String(id)
    && report.status === 'under-review'
  )));
}

export function moderatePitch(admin, input) {
  requireAdmin(admin);
  const pitchId = normalizePitchId(input.pitchId);
  const action = normalizeText(input.action);
  const reason = normalizeText(input.reason);
  if (reason.length < 8 || !input.confirmed) throw new Error('Cần lý do hợp lệ và xác nhận quyết định.');
  const allowed = new Set(['suspend-temporary', 'suspend-permanent', 'restore']);
  if (!allowed.has(action)) throw new Error('Hành động kiểm duyệt không hợp lệ.');
  const state = loadState();
  const pitch = state?.pitches.find(item => item.id === pitchId);
  if (!pitch) throw new Error('Không tìm thấy sân bóng.');
  if (!input.reviewedReportId) throw new Error('Cần báo cáo đã được rà soát trước khi áp dụng xử lý.');
  const report = state.reports?.find(item => (
    item.id === input.reviewedReportId
    && item.status === 'under-review'
    && item.targetType === 'pitch'
    && String(item.targetId) === String(pitch.id)
  ));
  if (!report) throw new Error('Báo cáo chưa ở trạng thái đang rà soát.');
  const affectedBooking = state.bookings.some(booking => (
    booking.pitchId === pitch.id && booking.status === 'Confirmed'
  ));
  if (action.startsWith('suspend') && affectedBooking) {
    throw new Error('Sân còn lịch đã xác nhận; cần xử lý huỷ và hoàn tiền tại S32 trước khi đình chỉ.');
  }
  if (action === 'restore' && pitch.status !== 'suspended') {
    throw new Error('Chỉ sân đình chỉ tạm thời mới được khôi phục.');
  }
  if (action !== 'restore' && ['suspended', 'permanently-suspended'].includes(pitch.status)) {
    throw new Error('Sân đã ở trạng thái đình chỉ.');
  }

  let updated;
  updateState(current => {
    const target = current.pitches.find(item => item.id === pitch.id);
    target.status = action === 'restore'
      ? 'active'
      : action === 'suspend-permanent' ? 'permanently-suspended' : 'suspended';
    target.availableSlotsToday = target.status === 'active' ? Math.max(1, target.availableSlotsToday) : 0;
    target.moderationHistory ??= [];
    target.moderationHistory.push({
      action,
      reason,
      reviewedReportId: input.reviewedReportId,
      actorId: admin.id,
      createdAt: new Date().toISOString(),
    });
    const reviewedReport = current.reports.find(item => item.id === input.reviewedReportId);
    reviewedReport.status = 'resolved';
    reviewedReport.resolvedAt = new Date().toISOString();
    reviewedReport.notes ??= [];
    reviewedReport.notes.push({
      authorId: admin.id,
      authorName: admin.displayName,
      createdAt: new Date().toISOString(),
      text: `Đã áp dụng quyết định ${action} cho sân #${pitch.id}: ${reason}`,
    });
    updated = target;
  });
  return structuredClone(updated);
}

export function formatPitchPrice(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ / giờ`;
}
