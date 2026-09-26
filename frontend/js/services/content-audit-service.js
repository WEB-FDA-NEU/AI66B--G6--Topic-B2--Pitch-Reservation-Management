import { initializeState, updateState } from './storage-service.js';

const CONTENT_TYPES = new Set(['banner', 'announcement']);
const CONTENT_STATUSES = new Set(['draft', 'scheduled', 'published', 'unpublished']);

function nextId(records, prefix) {
  const largest = records.reduce((current, record) => {
    if (!record.id?.startsWith(prefix)) return current;
    return Math.max(current, Number(record.id.slice(prefix.length)) || 0);
  }, 0);
  return `${prefix}${String(largest + 1).padStart(3, '0')}`;
}

function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${fieldName} không được để trống.`);
  return text;
}

function requireReason(value) {
  const reason = String(value ?? '').trim();
  if (reason.length < 8) throw new Error('Lý do cần có ít nhất 8 ký tự.');
  return reason;
}

export async function recordActivity(input) {
  await initializeState();
  let created;
  updateState(state => {
    const activities = state.activities ??= [];
    created = {
      id: nextId(activities, 'A'),
      actorId: requireText(input.actorId, 'Người thực hiện'),
      actorName: requireText(input.actorName, 'Tên người thực hiện'),
      actionType: requireText(input.actionType, 'Loại hành động'),
      entityType: requireText(input.entityType, 'Loại đối tượng'),
      entityId: requireText(input.entityId, 'Mã đối tượng'),
      result: input.result === 'failed' ? 'failed' : 'success',
      reason: requireText(input.reason, 'Lý do'),
      createdAt: new Date().toISOString(),
    };
    activities.push(created);
  });
  return structuredClone(created);
}

export async function listActivities(filters = {}) {
  const state = await initializeState();
  const query = String(filters.query ?? '').trim().toLocaleLowerCase('vi');
  return (state.activities ?? [])
    .filter(activity => !filters.entityType || activity.entityType === filters.entityType)
    .filter(activity => !filters.result || activity.result === filters.result)
    .filter(activity => !filters.activityId || activity.id === filters.activityId)
    .filter(activity => !filters.entityId || activity.entityId === filters.entityId)
    .filter(activity => !query || [activity.id, activity.actorName, activity.actionType, activity.entityId, activity.reason]
      .some(value => String(value).toLocaleLowerCase('vi').includes(query)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(activity => structuredClone(activity));
}

export async function listContents(filters = {}) {
  const state = await initializeState();
  const query = String(filters.query ?? '').trim().toLocaleLowerCase('vi');
  return (state.contents ?? [])
    .filter(item => !filters.contentType || item.contentType === filters.contentType)
    .filter(item => !filters.status || item.status === filters.status)
    .filter(item => !query || [item.id, item.title, item.body]
      .some(value => String(value).toLocaleLowerCase('vi').includes(query)))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(item => structuredClone(item));
}

export async function getContent(contentId) {
  const state = await initializeState();
  const item = (state.contents ?? []).find(content => content.id === contentId);
  return item ? structuredClone(item) : null;
}

export async function saveContent(input, actor) {
  await initializeState();
  if (!CONTENT_TYPES.has(input.contentType)) throw new Error('Loại nội dung không hợp lệ.');
  if (!CONTENT_STATUSES.has(input.status)) throw new Error('Trạng thái nội dung không hợp lệ.');

  const auditReason = requireReason(input.auditReason);
  const startsAt = requireText(input.startsAt, 'Ngày bắt đầu');
  const endsAt = requireText(input.endsAt, 'Ngày kết thúc');
  if (new Date(endsAt) < new Date(startsAt)) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');

  let saved;
  updateState(state => {
    const contents = state.contents ??= [];
    const existingIndex = input.id ? contents.findIndex(item => item.id === input.id) : -1;
    const now = new Date().toISOString();
    const record = {
      id: existingIndex >= 0 ? contents[existingIndex].id : nextId(contents, 'CT'),
      contentType: input.contentType,
      title: requireText(input.title, 'Tiêu đề'),
      body: requireText(input.body, 'Nội dung'),
      audience: requireText(input.audience, 'Đối tượng'),
      status: input.status,
      startsAt,
      endsAt,
      createdAt: existingIndex >= 0 ? contents[existingIndex].createdAt : now,
      updatedAt: now,
    };
    if (existingIndex >= 0) contents[existingIndex] = record;
    else contents.push(record);
    saved = record;
  });

  await recordActivity({
    actorId: actor.id,
    actorName: actor.displayName,
    actionType: input.id ? 'content-updated' : 'content-created',
    entityType: 'content',
    entityId: saved.id,
    reason: auditReason,
  });
  return structuredClone(saved);
}

export async function changeContentStatus(contentId, status, reason, actor) {
  if (!CONTENT_STATUSES.has(status)) throw new Error('Trạng thái nội dung không hợp lệ.');
  const auditReason = requireReason(reason);
  await initializeState();
  let updated;
  updateState(state => {
    const item = (state.contents ?? []).find(content => content.id === contentId);
    if (!item) throw new Error('Không tìm thấy nội dung.');
    item.status = status;
    item.updatedAt = new Date().toISOString();
    updated = item;
  });
  await recordActivity({
    actorId: actor.id,
    actorName: actor.displayName,
    actionType: `content-${status}`,
    entityType: 'content',
    entityId: contentId,
    reason: auditReason,
  });
  return structuredClone(updated);
}

export async function deleteDraft(contentId, reason, actor) {
  const auditReason = requireReason(reason);
  await initializeState();
  updateState(state => {
    const index = (state.contents ?? []).findIndex(content => content.id === contentId);
    if (index < 0) throw new Error('Không tìm thấy nội dung.');
    if (state.contents[index].status !== 'draft') throw new Error('Chỉ có thể xóa nội dung ở trạng thái bản nháp.');
    state.contents.splice(index, 1);
  });
  await recordActivity({
    actorId: actor.id,
    actorName: actor.displayName,
    actionType: 'content-deleted',
    entityType: 'content',
    entityId: contentId,
    reason: auditReason,
  });
}

export async function getAdminSettings() {
  const state = await initializeState();
  return structuredClone(state.settings?.admin ?? {});
}

export async function updateAdminSettings(input, actor) {
  await initializeState();
  const allowedPageSizes = new Set([10, 20, 50]);
  const allowedActivityDisplays = new Set(['compact', 'detailed']);
  const allowedPriorities = new Set(['low', 'medium', 'high']);
  const settings = {
    tablePageSize: allowedPageSizes.has(Number(input.tablePageSize)) ? Number(input.tablePageSize) : 10,
    activityDisplay: allowedActivityDisplays.has(input.activityDisplay) ? input.activityDisplay : 'compact',
    defaultReportPriority: allowedPriorities.has(input.defaultReportPriority) ? input.defaultReportPriority : 'medium',
    requireDecisionReason: Boolean(input.requireDecisionReason),
  };
  updateState(state => {
    state.settings ??= {};
    settings.dashboardPitchSummary = state.settings.admin?.dashboardPitchSummary ?? {
      active: 0,
      temporarilySuspended: 0,
      permanentlySuspended: 0,
    };
    state.settings.admin = settings;
  });
  await recordActivity({
    actorId: actor.id,
    actorName: actor.displayName,
    actionType: 'admin-settings-updated',
    entityType: 'settings',
    entityId: 'admin',
    reason: 'Cập nhật tùy chọn quản trị hệ thống.',
  });
  return structuredClone(settings);
}
