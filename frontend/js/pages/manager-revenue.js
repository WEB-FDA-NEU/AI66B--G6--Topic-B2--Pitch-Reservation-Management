import { renderStatCard, createIcon } from '../core/ui.js';
import { el, formatVnd, formatDateTime, todayLocal, infoLines } from '../core/render.js';
import { buildVisualBarChartWithTable, content, currentUser, fetchRows, mainEl, params, vietnamMonth, bootManagement } from '../features/management-kit.js';

const PAGE_STEP = 10;
const firstPageSize = () => (matchMedia('(max-width: 640px)').matches ? 5 : 10);

function buildPagedList(rows, renderRow, noun) {
  const wrap = el('div', null, { class: 'stack-sm' });
  const list = el('div', null, { class: 'stack-sm' });
  const controls = el('div', null, { class: 'list-more-row' });
  const initial = firstPageSize();
  let shown = Math.min(initial, rows.length);
  function render() {
    list.replaceChildren(...rows.slice(0, shown).map(renderRow));
    controls.replaceChildren();
    const rest = rows.length - shown;
    if (rest > 0) {
      const more = el('button', `Xem thêm (còn ${rest} ${noun})`, { type: 'button', class: 'button secondary sm' });
      more.addEventListener('click', () => { shown = Math.min(shown + PAGE_STEP, rows.length); render(); });
      controls.append(more);
    }
    if (shown > initial) {
      const less = el('button', 'Thu gọn', { type: 'button', class: 'button ghost sm' });
      less.addEventListener('click', () => {
        shown = initial;
        render();
        wrap.closest('section')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
      controls.append(less);
    }
    controls.hidden = !controls.childElementCount;
  }
  render();
  wrap.append(list, controls);
  return wrap;
}

async function renderManagerRevenue() {
  const pageHeader = mainEl.querySelector('.page-header');
  if (pageHeader) {
    const title = pageHeader.querySelector('h1');
    if (title) title.textContent = 'Doanh thu';
  }
  const [pitches, payments, refunds, wallets] = await Promise.all([
    fetchRows('Pitch', { manager_id: currentUser.id }),
    fetchRows('Payment', { manager_id: currentUser.id }),
    fetchRows('Refund', { manager_id: currentUser.id }),
    fetchRows('Wallet', { user_id: currentUser.id })
  ]);

  const requestedMonth = params.get('month');
  let selectedMonth = requestedMonth === 'all' ? '' : /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth || '') ? requestedMonth : todayLocal().slice(0, 7);
  let selectedPitchId = pitches.some(p => p.id === params.get('pitchId')) ? params.get('pitchId') : '';
  if ((requestedMonth && requestedMonth !== 'all' && selectedMonth !== requestedMonth) || (params.has('pitchId') && !selectedPitchId)) {
    const url = new URL(location.href);
    if (requestedMonth && requestedMonth !== selectedMonth) url.searchParams.set('month', selectedMonth || 'all');
    if (!selectedPitchId) url.searchParams.delete('pitchId');
    history.replaceState(null, '', url);
  }

  const monthOptions = [];
  for (let i = 0, [y, m] = todayLocal().slice(0, 7).split('-').map(Number); i < 12; i++) {
    monthOptions.push(`${y}-${String(m).padStart(2, '0')}`);
    if (--m === 0) { m = 12; y--; }
  }
  if (selectedMonth && !monthOptions.includes(selectedMonth)) monthOptions.push(selectedMonth);
  const monthInput = el('select', null, { id: 'mr-month' }, [
    el('option', 'Toàn thời gian', { value: '' }),
    ...monthOptions.map(v => el('option', `Tháng ${v.slice(5)}/${v.slice(0, 4)}`, { value: v }))
  ]);
  monthInput.value = selectedMonth;
  const pitchSelect = el('select', null, { id: 'mr-pitch' }, [
    el('option', 'Tất cả sân của tôi', { value: '' }),
    ...pitches.map(p => el('option', p.name, { value: p.id }))
  ]);
  pitchSelect.value = selectedPitchId;
  const exportCsvBtn = el('button', null, { type: 'button', class: 'button secondary revenue-export' }, [
    createIcon('Download', 16),
    el('span', 'Tải danh sách giao dịch (CSV)')
  ]);

  const filterBar = el('section', null, { class: 'surface revenue-filters', 'aria-label': 'Bộ lọc doanh thu' }, [
    el('div', null, { class: 'field-group' }, [el('label', 'Tháng báo cáo', { for: 'mr-month' }), monthInput]),
    el('div', null, { class: 'field-group' }, [el('label', 'Sân bóng', { for: 'mr-pitch' }), pitchSelect]),
    exportCsvBtn
  ]);

  const bodyWrap = el('div', null, { class: 'stack-lg' });

  function getFiltered() {
    let fPay = payments;
    let fRef = refunds;
    if (selectedPitchId) {
      fPay = fPay.filter(p => p.pitch_id === selectedPitchId);
      fRef = fRef.filter(r => r.pitch_id === selectedPitchId);
    }
    if (selectedMonth) {
      fPay = fPay.filter(p => vietnamMonth(p.paid_at || p.created_date) === selectedMonth);
      fRef = fRef.filter(r => vietnamMonth(r.created_date) === selectedMonth);
    }
    return { fPay, fRef };
  }

  exportCsvBtn.addEventListener('click', () => {
    const { fPay, fRef } = getFiltered();
    const csvCell = value => { if (typeof value === 'number' && Number.isFinite(value)) return String(value); const text = String(value ?? ''); const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? `'${text}` : text; return `"${safe.replaceAll('"', '""')}"`; };
    const lines = ['Loại giao dịch,Mã đơn,Sân,Khách hàng,Số tiền (₫),Thời gian'];
    for (const p of fPay) {
      lines.push(['Thanh toán', p.booking_code, p.pitch_name, p.customer_name, Number(p.amount_vnd || 0), formatDateTime(p.paid_at || p.created_date)].map(csvCell).join(','));
    }
    for (const r of fRef) {
      lines.push(['Hoàn tiền', r.booking_code, r.pitch_name, r.customer_name, -Number(r.amount_vnd || 0), formatDateTime(r.created_date)].map(csvCell).join(','));
    }
    const blob = new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', null, { href: url, download: `doanh-thu-${selectedMonth || 'all'}.csv` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  function renderStatsAndLists() {
    const { fPay, fRef } = getFiltered();
    const gross = fPay.reduce((s, p) => s + Number(p.amount_vnd || 0), 0);
    const refunded = fRef.reduce((s, r) => s + Number(r.amount_vnd || 0), 0);
    const net = gross - refunded;
    const walletBal = wallets[0]?.balance_vnd || 0;

    const statsGrid = el('div', null, { class: 'grid-4' }, [
      renderStatCard({
        label: 'Đã thu',
        value: formatVnd(gross),
        hint: `${fPay.length} giao dịch thành công`,
        icon: 'ReceiptText',
        tone: 'primary'
      }),
      renderStatCard({
        label: 'Đã hoàn tiền',
        value: formatVnd(refunded),
        hint: `${fRef.length} giao dịch hoàn tiền`,
        icon: 'Wallet',
        tone: 'warning'
      }),
      renderStatCard({
        label: 'Thực nhận',
        value: formatVnd(net),
        hint: selectedMonth ? `Tháng ${selectedMonth.slice(5, 7)}/${selectedMonth.slice(0, 4)}` : 'Toàn thời gian',
        icon: 'Wallet',
        tone: 'success'
      }),
      renderStatCard({
        label: 'Số dư ví',
        value: formatVnd(walletBal),
        hint: 'Tiền hiện có trong ví',
        icon: 'Wallet',
        tone: 'info'
      })
    ]);

    const months = [];
    const nowD = new Date(`${selectedMonth || todayLocal().slice(0, 7)}-01T00:00:00Z`);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth() - i, 1));
      const ym = d.toISOString().slice(0, 7);
      const mPay = payments
        .filter(p => (!selectedPitchId || p.pitch_id === selectedPitchId) && vietnamMonth(p.paid_at || p.created_date) === ym)
        .reduce((s, p) => s + Number(p.amount_vnd || 0), 0);
      const mRef = refunds
        .filter(r => (!selectedPitchId || r.pitch_id === selectedPitchId) && vietnamMonth(r.created_date) === ym)
        .reduce((s, r) => s + Number(r.amount_vnd || 0), 0);
      months.push({
        label: `Tháng ${ym.slice(5, 7)}/${ym.slice(0, 4)}`,
        shortLabel: ym.slice(5, 7) + '/' + ym.slice(2, 4),
        value: mPay - mRef,
        note: `Thu: ${formatVnd(mPay)}\nHoàn: ${formatVnd(mRef)}`
      });
    }

    const chartSection = buildVisualBarChartWithTable({
      title: selectedMonth ? `Doanh thu 6 tháng đến ${selectedMonth.slice(5, 7)}/${selectedMonth.slice(0, 4)}` : 'Biểu đồ doanh thu thực nhận 6 tháng gần nhất',
      rows: months,
      labelHeader: 'Tháng',
      valueHeader: 'Thực nhận (₫)',
      formatValue: formatVnd,
      unitNoun: 'tháng'
    });

    const listsGrid = el('div', null, { class: 'grid-2' });
    const paySection = el('section', null, { class: 'surface stack' }, [
      el('h2', `Giao dịch đã thu (${fPay.length})`)
    ]);
    if (!fPay.length) {
      paySection.append(el('div', 'Không có giao dịch thanh toán trong kỳ này.', { class: 'empty' }));
    } else {
      paySection.append(buildPagedList(fPay, p => el('div', null, { class: 'card card--compact card--subtle row-between' }, [
        el('div', null, {}, [
          el('strong', p.pitch_name || 'Sân', { class: 'text-sm' }),
          infoLines([`Mã đơn: ${p.booking_code || '—'}`, `Khách: ${p.customer_name || '—'}`, formatDateTime(p.paid_at || p.created_date)], 'text-xs muted')
        ]),
        el('strong', `+${formatVnd(p.amount_vnd)}`, { utility: 'u-color-success' })
      ]), 'giao dịch thu'));
    }

    const refSection = el('section', null, { class: 'surface stack' }, [
      el('h2', `Giao dịch hoàn tiền (${fRef.length})`)
    ]);
    if (!fRef.length) {
      refSection.append(el('div', 'Không có giao dịch hoàn tiền trong kỳ này.', { class: 'empty' }));
    } else {
      refSection.append(buildPagedList(fRef, r => el('div', null, { class: 'card card--compact card--subtle row-between' }, [
        el('div', null, {}, [
          el('strong', r.pitch_name || 'Sân', { class: 'text-sm' }),
          infoLines([`Mã đơn: ${r.booking_code || '—'}`, `Khách: ${r.customer_name || '—'}`, formatDateTime(r.created_date)], 'text-xs muted')
        ]),
        el('strong', `-${formatVnd(r.amount_vnd)}`, { utility: 'u-color-danger' })
      ]), 'giao dịch hoàn'));
    }
    listsGrid.append(paySection, refSection);

    bodyWrap.replaceChildren(statsGrid, chartSection, listsGrid);
  }

  function syncRevenueUrl() {
    const url = new URL(location.href);
    url.searchParams.set('month', selectedMonth || 'all');
    if (selectedPitchId) url.searchParams.set('pitchId', selectedPitchId);
    else url.searchParams.delete('pitchId');
    history.replaceState(null, '', url);
  }
  monthInput.addEventListener('change', () => {
    selectedMonth = monthInput.value;
    syncRevenueUrl();
    renderStatsAndLists();
  });
  pitchSelect.addEventListener('change', () => {
    selectedPitchId = pitchSelect.value;
    syncRevenueUrl();
    renderStatsAndLists();
  });

  content.replaceChildren(filterBar, bodyWrap);
  renderStatsAndLists();
}

bootManagement(renderManagerRevenue);
