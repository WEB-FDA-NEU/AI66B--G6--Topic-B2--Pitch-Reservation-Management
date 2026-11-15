import { el, formatVnd, todayLocal, nowLocalTime, SLOT_STATE } from '../core/render.js';

export function selectableHoursForDate(dateValue) {
  const hours = Array.from({ length: 16 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);
  if (dateValue === todayLocal()) {
    const currentHour = nowLocalTime();
    return hours.filter(h => h > currentHour);
  }
  return hours;
}


export function buildContiguousSlotPicker({ slots, initialStarts = [], onSelectionChange }) {
  const wrap = el('div', null, { class: 'stack' });
  const slotError = el('p', '', { role: 'status', class: 'slot-hint text-sm muted' });
  const showSlotError = message => { slotError.textContent = message; };

  const legend = el('div', null, { class: 'slot-legend' }, [
    el('span', null, { class: 'slot-legend-item' }, [
      el('span', null, { class: 'slot-legend-dot', utility: 'u-background-success' }),
      el('span', 'Còn trống')
    ]),
    el('span', null, { class: 'slot-legend-item' }, [
      el('span', null, { class: 'slot-legend-dot', utility: 'u-background-primary' }),
      el('span', 'Đang chọn')
    ]),
    el('span', null, { class: 'slot-legend-item' }, [
      el('span', null, { class: 'slot-legend-dot', utility: 'u-background-warning' }),
      el('span', 'Đã có người đặt')
    ]),
    el('span', null, { class: 'slot-legend-item' }, [
      el('span', null, { class: 'slot-legend-dot', utility: 'u-background-danger' }),
      el('span', 'Chủ sân khóa')
    ]),
    el('span', null, { class: 'slot-legend-item' }, [
      el('span', null, { class: 'slot-legend-dot', utility: 'u-background-muted-foreground' }),
      el('span', 'Ngoài giờ / Đã qua')
    ])
  ]);
  wrap.append(legend);

  const pastSlots = slots.filter(s => s.state === 'past');
  const activeSlots = slots.filter(s => s.state !== 'past');

  if (pastSlots.length > 0) {
    const details = el('details', null, { class: 'card card--compact card--subtle' });
    const summary = el('summary', `Xem ${pastSlots.length} khung giờ đã qua trong hôm nay`, {
      class: 'text-sm font-bold muted',
      utility: 'u-cursor-pointer'
    });
    const pastGrid = el('div', null, { class: 'slot-grid', utility: 'u-margin-top-0p75rem' });
    for (const s of pastSlots) {
      pastGrid.append(
        el('button', null, {
          type: 'button',
          class: 'slot-btn slot-btn--past',
          disabled: true
        }, [
          el('strong', `${s.start} – ${s.end}`, { class: 'text-sm' }),
          el('span', formatVnd(s.price_vnd), { class: 'text-xs muted' }),
          el('span', SLOT_STATE.past.label, { class: 'text-xs muted' })
        ])
      );
    }
    details.append(summary, pastGrid);
    wrap.append(details);
  }

  const grid = el('div', null, { id: 'slots', class: 'slot-groups' });
  const PERIODS = [
    { key: 'morning', label: 'Buổi sáng', range: 'trước 12:00', test: h => h < 12 },
    { key: 'afternoon', label: 'Buổi chiều', range: '12:00 – 17:00', test: h => h >= 12 && h < 17 },
    { key: 'evening', label: 'Buổi tối', range: 'từ 17:00, giờ cao điểm', test: h => h >= 17 }
  ];
  const periodGrids = new Map();
  for (const period of PERIODS) {
    const items = activeSlots.filter(sl => period.test(Number(String(sl.start).slice(0, 2))));
    if (!items.length) continue;
    const free = items.filter(sl => sl.state === 'available').length;
    const headingId = `slot-period-${period.key}`;
    const periodGrid = el('div', null, { class: 'slot-grid', role: 'group', 'aria-labelledby': headingId });
    const section = el('section', null, { class: `slot-period slot-period--${period.key}` }, [
      el('div', null, { class: 'slot-period-head' }, [
        el('h3', period.label, { id: headingId, class: 'slot-period-title' }),
        el('span', period.range, { class: 'slot-period-range' }),
        el('span', free ? `${free} còn trống` : 'Hết chỗ', { class: `slot-period-count ${free ? '' : 'slot-period-count--full'}`.trim() })
      ]),
      periodGrid
    ]);
    grid.append(section);
    for (const sl of items) periodGrids.set(sl.start, periodGrid);
  }
  let selected = [];
  const btnMap = new Map();

  function syncUi() {
    for (const [start, btn] of btnMap.entries()) {
      const selIdx = selected.findIndex(x => x.start === start);
      const isSel = selIdx >= 0;
      const wasSel = btn.classList.contains('selected');
      btn.setAttribute('aria-pressed', String(isSel));
      btn.classList.toggle('selected', isSel);
      btn.style.setProperty('--wave-index', isSel ? String(selIdx) : '0');
      if (isSel && !wasSel) {
        btn.classList.remove('slot-btn--wave');
        void btn.offsetWidth;
        btn.classList.add('slot-btn--wave');
      } else if (!isSel) {
        btn.classList.remove('slot-btn--wave');
      }
      const stateLabel = btn.disabled ? null : btn.querySelector('[data-slot-state]');
      if (stateLabel) stateLabel.textContent = isSel ? 'Đang chọn' : 'Còn trống';
    }
    onSelectionChange(selected);
  }

  for (const slot of activeSlots) {
    const stateMeta = SLOT_STATE[slot.state] || SLOT_STATE.closed;
    const isAvail = slot.state === 'available';
    const stateClass = !isAvail ? `slot-btn--${slot.state}` : '';
    const btn = el('button', null, {
      type: 'button',
      class: `slot-btn ${stateClass}`.trim(),
      disabled: !isAvail,
      'aria-pressed': 'false',
      'data-start': slot.start
    }, [
      el('strong', `${slot.start} – ${slot.end}`, { class: 'text-sm' }),
      el('span', formatVnd(slot.price_vnd), { class: 'text-xs muted' }),
      el('span', stateMeta.label, { class: 'text-xs font-bold', 'data-slot-state': '' })
    ]);

    btn.addEventListener('click', () => {
      if (!isAvail) return;
      const idx = selected.findIndex(s => s.start === slot.start);
      if (idx === 0) {
        selected.shift();
        showSlotError('');
      } else if (idx === selected.length - 1 && idx >= 0) {
        selected.pop();
        showSlotError('');
      } else if (idx > 0) {
        selected = selected.slice(0, idx);
        showSlotError('');
      } else if (selected.length === 0) {
        selected = [slot];
        showSlotError('');
      } else if (selected[selected.length - 1].end === slot.start) {
        selected.push(slot);
        showSlotError('');
      } else if (slot.end === selected[0].start) {
        selected.unshift(slot);
        showSlotError('');
      } else {
        selected = [slot];
        showSlotError(`Đã chọn lại từ ${slot.start}. Các khung giờ trong một đơn cần liền kề nhau.`);
      }
      syncUi();
    });

    btnMap.set(slot.start, btn);
    (periodGrids.get(slot.start) || grid).append(btn);
  }

  if (!activeSlots.length) {
    grid.append(el('div', slots.length ? 'Tất cả khung giờ hôm nay đã qua. Vui lòng chọn ngày tiếp theo.' : 'Không có khung giờ mở cửa trong ngày này.', {
      class: 'empty'
    }));
  }

  wrap.append(grid, slotError);

  if (initialStarts.length) {
    const sorted = [...initialStarts].sort();
    const candidate = [];
    for (const st of sorted) {
      const found = activeSlots.find(s => s.start === st && s.state === 'available');
      if (found && (candidate.length === 0 || candidate[candidate.length - 1].end === found.start)) {
        candidate.push(found);
      }
    }
    if (candidate.length) {
      selected = candidate;
      syncUi();
    }
  } else {
    onSelectionChange([]);
  }

  return wrap;
}
