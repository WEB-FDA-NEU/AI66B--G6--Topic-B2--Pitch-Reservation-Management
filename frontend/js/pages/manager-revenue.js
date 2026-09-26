import '../components/site-header.js';
import '../components/site-footer.js';
import { requireRole, ROLES } from '../services/access-control.js';
import { listManagerPitches } from '../services/pitch-service.js';
import { getManagerRevenueSummary, listManagerTransactions, prepareFinanceData } from '../services/finance-service.js';
import { formatVND } from '../render.js';

let manager;
const form = document.querySelector('#revenue-filter');

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

async function render() {
  const filters = Object.fromEntries(new FormData(form));
  const [summary, transactions] = await Promise.all([
    getManagerRevenueSummary(manager, filters),
    listManagerTransactions(manager, filters),
  ]);
  document.querySelector('#manager-balance').textContent = formatVND(summary.currentBalance);
  document.querySelector('#gross-revenue').textContent = formatVND(summary.grossRevenue);
  document.querySelector('#refund-volume').textContent = formatVND(summary.refunded);
  document.querySelector('#net-revenue').textContent = formatVND(summary.netRevenue);
  const template = document.querySelector('#tpl-manager-transaction');
  const rows = transactions.map(transaction => {
    const node = template.content.cloneNode(true);
    node.querySelector('.manager-revenue-page__id').textContent = transaction.id;
    node.querySelector('.manager-revenue-page__pitch').textContent = transaction.pitch?.name ?? `Sân #${transaction.pitchId}`;
    node.querySelector('.manager-revenue-page__customer').textContent = transaction.customer?.displayName ?? transaction.customerId;
    const date = node.querySelector('.manager-revenue-page__date');
    date.dateTime = transaction.createdAt;
    date.textContent = formatDate(transaction.createdAt);
    node.querySelector('.manager-revenue-page__type').textContent = transaction.type === 'refund' ? 'Hoàn tiền' : 'Thanh toán';
    const amount = node.querySelector('.manager-revenue-page__amount');
    amount.textContent = `${transaction.type === 'refund' ? '−' : '+'}${formatVND(transaction.amount)}`;
    amount.dataset.type = transaction.type;
    node.querySelector('.manager-revenue-page__booking-link').href = `manager-bookings.html?${new URLSearchParams({ pitchId: String(transaction.pitchId), bookingId: transaction.bookingId })}`;
    return node;
  });
  document.querySelector('#revenue-rows').replaceChildren(...rows);
  document.querySelector('#revenue-empty').hidden = transactions.length > 0;
  document.querySelector('#revenue-count').textContent = `${transactions.length} giao dịch`;
}

async function init() {
  await prepareFinanceData();
  manager = requireRole([ROLES.MANAGER]);
  if (!manager) return;
  const pitches = listManagerPitches(manager);
  const pitchFilter = document.querySelector('#pitch-filter');
  pitches.forEach(pitch => {
    const option = document.createElement('option');
    option.value = String(pitch.id);
    option.textContent = pitch.name;
    pitchFilter.append(option);
  });
  const requestedPitchId = new URLSearchParams(location.search).get('pitchId');
  if (pitches.some(pitch => String(pitch.id) === requestedPitchId)) pitchFilter.value = requestedPitchId;
  form.addEventListener('input', render);
  form.addEventListener('reset', () => requestAnimationFrame(render));
  document.querySelector('#main-content').hidden = false;
  await render();
}

init();
