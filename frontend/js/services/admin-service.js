import { initializeState, loadState, updateState } from './storage-service.js';
import { recordActivity } from './content-audit-service.js';

const REPORT_STATUSES = new Set(['submitted', 'under-review', 'resolved', 'dismissed']);

function normalize(value) {
  return String(value ?? '').trim().toLocaleLowerCase('vi');
}

function requireReason(value) {
  const reason = String(value ?? '').trim();
  if (reason.length < 8) throw new Error('Lý do cần có ít nhất 8 ký tự.');
  return reason;
}

function cloneRecords(records) {
  return records.map(record => structuredClone(record));
}

export async function listCustomers(filters = {}) {
  const state = await initializeState();
  const query = normalize(filters.query);
  return cloneRecords(state.users
    .filter(user => user.role === 'customer')
    .filter(user => !filters.status || user.status === filters.status)
    .filter(user => !query || [user.id, user.displayName, user.email]
      .some(value => normalize(value).includes(query))))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function listManagers(filters = {}) {
  const state = await initializeState();
  const query = normalize(filters.query);
  return cloneRecords(state.users
    .filter(user => user.role === 'manager')
    .filter(user => !filters.status || user.status === filters.status)
    .filter(user => !query || [user.id, user.displayName, user.email]
      .some(value => normalize(value).includes(query))))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function getAccount(accountId, role) {
  const state = await initializeState();
  const account = state.users.find(user => user.id === accountId && user.role === role);
  return account ? structuredClone(account) : null;
}

export async function applyCustomerAction(input, actor) {
  const allowedActions = new Set(['warn', 'suspend', 'restore']);
  if (!allowedActions.has(input.action)) throw new Error('Hành động quản trị không hợp lệ.');
  if (!input.confirmed) throw new Error('Cần xác nhận đã rà soát căn cứ xử lý.');
  const reason = requireReason(input.reason);
  await initializeState();
  let updated;

  updateState(state => {
    const customer = state.users.find(user => user.id === input.userId && user.role === 'customer');
    if (!customer) throw new Error('Không tìm thấy người dùng.');
    customer.adminMeta ??= {};

    if (input.action === 'suspend') {
      if (customer.status !== 'active') throw new Error('Chỉ tài khoản đang hoạt động mới có thể bị đình chỉ.');
      customer.status = 'suspended';
      customer.adminMeta.suspensionReason = reason;
      customer.adminMeta.suspendedAt = new Date().toISOString();
    } else if (input.action === 'restore') {
      if (customer.status !== 'suspended') throw new Error('Chỉ tài khoản đang đình chỉ mới có thể được khôi phục.');
      customer.status = 'active';
      customer.adminMeta.restoredAt = new Date().toISOString();
      delete customer.adminMeta.suspensionReason;
    } else {
      customer.adminMeta.warningCount = Number(customer.adminMeta.warningCount ?? 0) + 1;
      customer.adminMeta.lastWarningReason = reason;
      customer.adminMeta.warnedAt = new Date().toISOString();
    }
    updated = customer;
  });

  await recordActivity({
    actorId: actor.id,
    actorName: actor.displayName,
    actionType: `user-${input.action}`,
    entityType: 'user',
    entityId: input.userId,
    reason,
  });
  return structuredClone(updated);
}

export async function warnManager(input, actor) {
  if (!input.confirmed) throw new Error('Cần xác nhận đã rà soát căn cứ xử lý.');
  const reason = requireReason(input.reason);
  await initializeState();
  let updated;
  updateState(state => {
    const manager = state.users.find(user => user.id === input.managerId && user.role === 'manager');
    if (!manager) throw new Error('Không tìm thấy quản lý sân.');
    manager.adminMeta ??= {};
    manager.adminMeta.warningCount = Number(manager.adminMeta.warningCount ?? 0) + 1;
    manager.adminMeta.lastWarningReason = reason;
    manager.adminMeta.warnedAt = new Date().toISOString();
    updated = manager;
  });
  await recordActivity({
    actorId: actor.id,
    actorName: actor.displayName,
    actionType: 'manager-warning',
    entityType: 'manager',
    entityId: input.managerId,
    reason,
  });
  return structuredClone(updated);
}

export async function listReports(filters = {}) {
  const state = await initializeState();
  const query = normalize(filters.query);
  return cloneRecords((state.reports ?? [])
    .filter(report => !filters.status || report.status === filters.status)
    .filter(report => !filters.priority || report.priority === filters.priority)
    .filter(report => !filters.targetType || report.targetType === filters.targetType)
    .filter(report => !query || [report.id, report.summary, report.reporterName, report.targetId]
      .some(value => normalize(value).includes(query))))
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

export async function getReport(reportId) {
  const state = await initializeState();
  const report = (state.reports ?? []).find(item => item.id === reportId);
  return report ? structuredClone(report) : null;
}

export async function updateReportStatus(input, actor) {
  if (!REPORT_STATUSES.has(input.status)) throw new Error('Trạng thái báo cáo không hợp lệ.');
  if (!input.confirmed) throw new Error('Cần xác nhận đã rà soát báo cáo.');
  const reason = requireReason(input.reason);
  await initializeState();
  let updated;
  updateState(state => {
    const report = (state.reports ?? []).find(item => item.id === input.reportId);
    if (!report) throw new Error('Không tìm thấy báo cáo.');
    if (['resolved', 'dismissed'].includes(report.status)) throw new Error('Báo cáo này đã kết thúc xử lý.');
    if (report.status === 'submitted' && input.status !== 'under-review') {
      throw new Error('Báo cáo phải được đưa vào rà soát trước khi kết luận.');
    }
    if (report.status === 'under-review' && input.status === 'submitted') {
      throw new Error('Không thể đưa báo cáo quay lại trạng thái đã gửi.');
    }
    report.status = input.status;
    report.notes ??= [];
    report.notes.push({
      authorId: actor.id,
      authorName: actor.displayName,
      createdAt: new Date().toISOString(),
      text: reason,
    });
    if (['resolved', 'dismissed'].includes(input.status)) report.resolvedAt = new Date().toISOString();
    updated = report;
  });
  await recordActivity({
    actorId: actor.id,
    actorName: actor.displayName,
    actionType: `report-${input.status}`,
    entityType: 'report',
    entityId: input.reportId,
    reason,
  });
  return structuredClone(updated);
}

export async function getDashboardSummary() {
  const state = await initializeState();
  const customers = state.users.filter(user => user.role === 'customer');
  const managers = state.users.filter(user => user.role === 'manager');
  const reports = state.reports ?? [];
  return {
    customers: {
      total: customers.length,
      active: customers.filter(user => user.status === 'active').length,
      suspended: customers.filter(user => user.status === 'suspended').length,
    },
    managers: {
      total: managers.length,
      active: managers.filter(user => user.status === 'active').length,
      suspended: managers.filter(user => user.status === 'suspended').length,
    },
    reports: {
      total: reports.length,
      pending: reports.filter(report => ['submitted', 'under-review'].includes(report.status)).length,
      resolved: reports.filter(report => ['resolved', 'dismissed'].includes(report.status)).length,
    },
    pitches: structuredClone(state.settings?.admin?.dashboardPitchSummary ?? {}),
  };
}
