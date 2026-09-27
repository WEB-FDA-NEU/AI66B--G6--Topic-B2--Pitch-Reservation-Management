import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { FINANCE_RESULT_CODES, getAdminFinanceSummary, getRefundEligibility, listAdminFinancialRecords, prepareFinanceData, processSimulatedRefund } from '../services/finance-service.js';
import { formatVND } from '../render.js';

const resultMessages = {
  [FINANCE_RESULT_CODES.ALREADY_REFUNDED]: 'Lượt đặt này đã được hoàn tiền trước đó.',
  [FINANCE_RESULT_CODES.REFUND_NOT_ELIGIBLE]: 'Lượt đặt không đủ điều kiện hoàn tiền.',
  [FINANCE_RESULT_CODES.PAYMENT_NOT_FOUND]: 'Không tìm thấy khoản thanh toán tương ứng.',
};

let admin;
let records = [];
let selectedRecord = null;
const form = document.querySelector('#finance-filter-form');
const panel = document.querySelector('#finance-panel');

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function setDetail(record) {
  const values = [
    ['Mã giao dịch', record.id], ['Mã đặt sân', record.bookingId],
    ['Loại', record.type === 'refund' ? 'Hoàn tiền' : 'Thanh toán'], ['Trạng thái', 'Hoàn tất'],
    ['Số tiền', formatVND(record.amount)], ['Sân', record.pitch?.name ?? `#${record.pitchId}`],
    ['Khách hàng', `${record.customer?.displayName ?? record.customerId} (${record.customerId})`],
    ['Chủ sân', `${record.manager?.displayName ?? record.managerId} (${record.managerId})`],
    ['Thời điểm', formatDate(record.createdAt)],
  ];
  const detail = document.querySelector('#finance-detail');
  detail.replaceChildren(...values.map(([term, value]) => {
    const wrapper = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = value;
    wrapper.append(dt, dd);
    return wrapper;
  }));
}

async function openPanel(record) {
  selectedRecord = record;
  setDetail(record);
  const eligibility = await getRefundEligibility(admin, record.bookingId);
  const refundForm = document.querySelector('#refund-form');
  refundForm.hidden = record.type !== 'payment' || !eligibility.eligible;
  document.querySelector('#refund-feedback').textContent = record.type === 'payment' && !eligibility.eligible
    ? resultMessages[eligibility.code] ?? 'Khoản thanh toán không thể hoàn tiền.'
    : '';
  document.querySelector('#activity-link').href = `admin-activity-log.html?${new URLSearchParams({ entityType: 'booking', entityId: record.bookingId })}`;
  panel.hidden = false;
  document.querySelector('#panel-close').focus();
}

async function render() {
  const filters = Object.fromEntries(new FormData(form));
  records = await listAdminFinancialRecords(admin, filters);
  const template = document.querySelector('#tpl-admin-transaction');
  const rows = records.map(record => {
    const node = template.content.cloneNode(true);
    node.querySelector('.admin-finance-page__id').textContent = record.id;
    node.querySelector('.admin-finance-page__booking').textContent = record.bookingId;
    node.querySelector('.admin-finance-page__pitch').textContent = record.pitch?.name ?? `#${record.pitchId}`;
    node.querySelector('.admin-finance-page__customer').textContent = record.customer?.displayName ?? record.customerId;
    node.querySelector('.admin-finance-page__type').textContent = record.type === 'refund' ? 'Hoàn tiền' : 'Thanh toán';
    node.querySelector('.admin-finance-page__amount').textContent = formatVND(record.amount);
    const date = node.querySelector('.admin-finance-page__date');
    date.dateTime = record.createdAt;
    date.textContent = formatDate(record.createdAt);
    node.querySelector('.admin-finance-page__open').addEventListener('click', () => openPanel(record));
    return node;
  });
  document.querySelector('#finance-rows').replaceChildren(...rows);
  document.querySelector('#finance-empty').hidden = records.length > 0;
  document.querySelector('#finance-count').textContent = `${records.length} bản ghi`;
}

async function refreshSummary() {
  const summary = await getAdminFinanceSummary(admin);
  document.querySelector('#payment-volume').textContent = formatVND(summary.paymentVolume);
  document.querySelector('#refund-volume').textContent = formatVND(summary.refundVolume);
  document.querySelector('#net-volume').textContent = formatVND(summary.netVolume);
  document.querySelector('#transaction-total').textContent = String(summary.paymentCount + summary.refundCount);
}

async function refund(event) {
  event.preventDefault();
  if (!selectedRecord || !document.querySelector('#refund-confirmed').checked) return;
  const reason = document.querySelector('#refund-reason').value;
  const result = await processSimulatedRefund(admin, selectedRecord.bookingId, reason);
  const feedback = document.querySelector('#refund-feedback');
  if (!result.ok) { feedback.textContent = resultMessages[result.code] ?? 'Không thể hoàn tiền.'; return; }
  feedback.textContent = `Đã hoàn ${formatVND(result.transaction.amount)} và ghi nhận giao dịch ${result.transaction.id}.`;
  document.querySelector('#refund-form').hidden = true;
  await Promise.all([refreshSummary(), render()]);
}

async function init() {
  await prepareFinanceData();
  admin = requireRole([ROLES.ADMIN]);
  if (!admin) return;
  const params = new URLSearchParams(location.search);
  const initialFilters = {
    bookingId: params.get('bookingId') || '', transactionId: params.get('transactionId') || '', pitchId: params.get('pitchId') || '',
  };
  form.addEventListener('input', render);
  form.addEventListener('reset', () => requestAnimationFrame(render));
  document.querySelector('#panel-close').addEventListener('click', () => { panel.hidden = true; });
  document.querySelector('#refund-form').addEventListener('submit', refund);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') panel.hidden = true; });
  document.querySelector('#main-content').hidden = false;
  await refreshSummary();
  records = await listAdminFinancialRecords(admin, initialFilters);
  if (Object.values(initialFilters).some(Boolean)) {
    const target = records[0];
    if (!target) {
      location.replace('404.html');
      return;
    }
    await openPanel(target);
    document.querySelector('#finance-count').textContent = `${records.length} bản ghi theo tham chiếu`;
    const template = document.querySelector('#tpl-admin-transaction');
    document.querySelector('#finance-rows').replaceChildren(...records.map(record => {
      const node = template.content.cloneNode(true);
      node.querySelector('.admin-finance-page__id').textContent = record.id;
      node.querySelector('.admin-finance-page__booking').textContent = record.bookingId;
      node.querySelector('.admin-finance-page__pitch').textContent = record.pitch?.name ?? `#${record.pitchId}`;
      node.querySelector('.admin-finance-page__customer').textContent = record.customer?.displayName ?? record.customerId;
      node.querySelector('.admin-finance-page__type').textContent = record.type === 'refund' ? 'Hoàn tiền' : 'Thanh toán';
      node.querySelector('.admin-finance-page__amount').textContent = formatVND(record.amount);
      const date = node.querySelector('.admin-finance-page__date'); date.dateTime = record.createdAt; date.textContent = formatDate(record.createdAt);
      node.querySelector('.admin-finance-page__open').addEventListener('click', () => openPanel(record));
      return node;
    }));
    document.querySelector('#finance-empty').hidden = records.length > 0;
  } else await render();
}

init();
