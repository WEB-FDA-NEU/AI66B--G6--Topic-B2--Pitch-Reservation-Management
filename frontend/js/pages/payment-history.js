import '../components/site-header.js';
import '../components/site-footer.js';
import { requireAuth } from '../services/access-control.js';
import { getCustomerBalance, listCustomerTransactions } from '../services/finance-service.js';
import { formatVND } from '../render.js';

let customer;
const form = document.querySelector('#transaction-filter');

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

async function render() {
  const filters = Object.fromEntries(new FormData(form));
  const transactions = await listCustomerTransactions(customer, filters);
  const template = document.querySelector('#tpl-customer-transaction');
  const rows = transactions.map(transaction => {
    const node = template.content.cloneNode(true);
    node.querySelector('.payment-history-page__id').textContent = transaction.id;
    const date = node.querySelector('.payment-history-page__date');
    date.dateTime = transaction.createdAt;
    date.textContent = formatDate(transaction.createdAt);
    node.querySelector('.payment-history-page__pitch').textContent = transaction.booking?.snapshot?.pitchName ?? transaction.pitch?.name ?? `Sân #${transaction.pitchId}`;
    node.querySelector('.payment-history-page__type').textContent = transaction.type === 'refund' ? 'Hoàn tiền' : 'Thanh toán';
    const amount = node.querySelector('.payment-history-page__amount');
    amount.textContent = `${transaction.type === 'refund' ? '+' : '−'}${formatVND(transaction.amount)}`;
    amount.dataset.type = transaction.type;
    node.querySelector('.payment-history-page__booking-link').href = `booking-details.html?${new URLSearchParams({ bookingId: transaction.bookingId })}`;
    return node;
  });
  document.querySelector('#transaction-rows').replaceChildren(...rows);
  document.querySelector('#transaction-empty').hidden = transactions.length > 0;
  document.querySelector('#transaction-count').textContent = `${transactions.length} giao dịch`;
}

async function init() {
  customer = requireAuth();
  if (!customer) return;
  if (customer.role !== 'customer' || !['active', 'suspended'].includes(customer.status)) { location.replace('403.html'); return; }
  const balance = await getCustomerBalance(customer);
  document.querySelector('#current-balance').textContent = formatVND(balance?.amount ?? 0);
  form.addEventListener('input', render);
  form.addEventListener('reset', () => requestAnimationFrame(render));
  document.querySelector('#main-content').hidden = false;
  await render();
}

init();
