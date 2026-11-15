import { api } from '../services/api-client.js';
import { toast } from '../core/ui.js';
import { el, formatVnd, formatDate, todayLocal, hourSelect, infoLines } from '../core/render.js';
import { content, currentUser, fetchRows, openActionDialog, params, setStatus, bootManagement } from '../features/management-kit.js';

let scheduleDirty = false;


let beforeUnloadAttached = false;

function ensureScheduleDirtyGuard() {
  if (beforeUnloadAttached) return;
  beforeUnloadAttached = true;
  window.addEventListener('beforeunload', (e) => {
    if (scheduleDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  document.addEventListener('click', (e) => {
    if (!scheduleDirty) return;
    const anchor = e.target.closest('a[href]');
    if (!anchor || anchor.target === '_blank' || anchor.getAttribute('href')?.startsWith('#')) return;
    e.preventDefault();
    openActionDialog({
      title: 'Rời trang khi chưa lưu lịch tuần?',
      confirmLabel: 'Rời trang',
      description: 'Bạn có thay đổi lịch hoạt động theo tuần chưa được lưu. Nếu rời trang ngay bây giờ, các thay đổi vừa chỉnh sẽ bị mất.',
      label: 'Ghi chú (không bắt buộc)',
      required: false,
      hideReason: true,
      placeholder: 'Bấm Xác nhận để rời trang không lưu...',
      async onConfirm() {
        scheduleDirty = false;
        location.href = anchor.href;
      }
    });
  });
}


async function renderPitchAvailability() {
  ensureScheduleDirtyGuard();
  const pitchId = params.get('id') || params.get('pitchId');
  const myPitches = await fetchRows('Pitch', { manager_id: currentUser.id });

  if (!pitchId) {
    if (myPitches.length) {
      location.replace(`pitch-availability.html?id=${encodeURIComponent(myPitches[0].id)}`);
      return;
    }
    content.replaceChildren(el('div', 'Bạn chưa có sân nào để cấu hình lịch.', { class: 'empty' }));
    return;
  }

  const pitch = await api.entities.Pitch.get(pitchId);
  if (pitch.manager_id !== currentUser.id) {
    location.replace('403.html');
    return;
  }

  const [allSchedules, overrides, bookings] = await Promise.all([
    fetchRows('PitchSchedule', { pitch_id: pitchId }),
    fetchRows('AvailabilityOverride', { pitch_id: pitchId }, '-local_date'),
    fetchRows('Booking', { pitch_id: pitchId })
  ]);

  scheduleDirty = false;

  const switcherRow = el('div', null, { class: 'row-between' }, [
    el('div', null, { class: 'row' }, [
      el('a', '← Sân của tôi', { href: 'manager-pitches.html', class: 'button secondary sm' }),
      el('span', `Đang cấu hình: ${pitch.name}`, { class: 'font-bold' })
    ]),
    el('div', null, { class: 'row' }, [
      el('a', 'Xem đơn của sân', { href: `manager-bookings.html?id=${encodeURIComponent(pitchId)}`, class: 'button secondary sm' }),
      el('a', 'Xem trang đặt sân', { href: `pitch-detail.html?id=${encodeURIComponent(pitchId)}`, class: 'button ghost sm' })
    ])
  ]);

  const dirtyBanner = el('div', 'Bạn có thay đổi lịch tuần chưa lưu. Hãy bấm "Lưu lịch tuần" trước khi rời trang hoặc thêm ngoại lệ theo ngày.', {
    class: 'alert alert--warning font-bold',
    hidden: true
  });

  function markDirty() {
    scheduleDirty = true;
    dirtyBanner.hidden = false;
  }

  const weekdayOrder = [
    [1, 'Thứ hai'],
    [2, 'Thứ ba'],
    [3, 'Thứ tư'],
    [4, 'Thứ năm'],
    [5, 'Thứ sáu'],
    [6, 'Thứ bảy'],
    [0, 'Chủ nhật']
  ];

  const scheduleForm = el('form', null, { class: 'surface stack', novalidate: true });
  scheduleForm.append(
    el('div', null, { class: 'row-between' }, [
      el('div', null, {}, [
        el('h2', 'Lịch hoạt động & giá theo tuần'),
        el('p', 'Bật/tắt các ngày mở cửa trong tuần và thiết lập khung giờ, đơn giá mỗi giờ.', { class: 'text-sm muted' })
      ]),
      el('button', 'Lưu lịch tuần', { type: 'submit', class: 'button' })
    ]),
    dirtyBanner
  );

  const tableWrap = el('div', null, { class: 'table-scroll' });
  const table = el('table', null, { class: 'data-table schedule-table' });
  table.append(
    el('thead', null, {}, [
      el('tr', null, {}, [
        el('th', 'Ngày trong tuần'),
        el('th', 'Trạng thái'),
        el('th', 'Giờ mở cửa'),
        el('th', 'Giờ đóng cửa'),
        el('th', 'Giá mỗi giờ (₫)')
      ])
    ])
  );
  const tbody = el('tbody');
  const controls = [];

  for (const [dayNum, dayName] of weekdayOrder) {
    const existing = allSchedules.find(s => Number(s.weekday) === dayNum);
    const isOpen = !!existing || (!allSchedules.length && !pitch.schedule_configured);

    const enabled = el('input', null, { type: 'checkbox', 'aria-label': `Mở cửa ${dayName}`, class: 'checkbox-lg' });
    enabled.checked = isOpen;
    const statusText = el('span', isOpen ? 'Mở cửa' : 'Đóng cửa', { class: 'text-sm font-bold' });

    const start = hourSelect({ 'aria-label': `Giờ mở cửa ${dayName}`, disabled: !isOpen }, existing?.local_start || pitch.open_time || '06:00');
    const end = hourSelect({ 'aria-label': `Giờ đóng cửa ${dayName}`, disabled: !isOpen }, existing?.local_end || pitch.close_time || '22:00');
    const price = el('input', null, {
      type: 'number',
      'aria-label': `Giá mỗi giờ ${dayName}`,
      min: '50000',
      step: '10000',
      value: String(existing?.price_vnd ?? pitch.base_price_vnd ?? 250000),
      disabled: !isOpen
    });

    const row = el('tr', null, { class: isOpen ? '' : 'is-closed' }, [
      el('td', dayName, { class: 'font-bold sched-day', 'data-label': 'Ngày trong tuần' }),
      el('td', null, { class: 'sched-status', 'data-label': 'Trạng thái' }, [el('label', null, { class: 'checkbox-label' }, [enabled, statusText])]),
      el('td', null, { class: 'sched-start', 'data-label': 'Giờ mở cửa', 'data-short': 'Mở cửa' }, [start]),
      el('td', null, { class: 'sched-end', 'data-label': 'Giờ đóng cửa', 'data-short': 'Đóng cửa' }, [end]),
      el('td', null, { class: 'sched-price', 'data-label': 'Giá mỗi giờ (₫)', 'data-short': 'Giá mỗi giờ' }, [
        el('div', null, { class: 'sched-price-field' }, [price, el('span', '₫/giờ', { class: 'sched-price-unit', 'aria-hidden': 'true' })])
      ])
    ]);

    const setOpen = (checked) => {
      enabled.checked = checked;
      statusText.textContent = checked ? 'Mở cửa' : 'Đóng cửa';
      start.disabled = !checked;
      end.disabled = !checked;
      price.disabled = !checked;
      row.classList.toggle('is-closed', !checked);
    };
    enabled.addEventListener('change', () => { setOpen(enabled.checked); markDirty(); });
    start.addEventListener('change', markDirty);
    end.addEventListener('change', markDirty);
    price.addEventListener('input', markDirty);

    tbody.append(row);
    controls.push({ day: dayNum, dayName, existing, enabled, start, end, price, setOpen });
  }

  table.append(tbody);
  tableWrap.append(table);

  // Chép giờ và giá của Thứ hai sang các ngày khác.
  const copyBtn = el('button', 'Áp dụng giờ & giá của Thứ hai cho cả tuần', { type: 'button', class: 'button secondary sm' });
  copyBtn.addEventListener('click', () => {
    const [mon, ...rest] = controls;
    for (const c of rest) {
      c.setOpen(mon.enabled.checked);
      c.start.value = mon.start.value;
      c.end.value = mon.end.value;
      c.price.value = mon.price.value;
    }
    markDirty();
    toast('Đã chép giờ và giá của Thứ hai cho các ngày còn lại. Nhớ bấm "Lưu lịch tuần".');
  });

  scheduleForm.append(
    el('div', null, { class: 'schedule-tools' }, [copyBtn]),
    tableWrap,
    el('div', null, { class: 'schedule-footer' }, [el('button', 'Lưu lịch tuần', { type: 'submit', class: 'button' })])
  );

  scheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');
    for (const c of controls) {
      if (c.enabled.checked) {
        const roundHour = v => /^\d\d:00$/.test(v || '') && v >= '06:00' && v <= '22:00';
        if (!roundHour(c.start.value) || !roundHour(c.end.value)) {
          setStatus(`${c.dayName}: Chọn giờ tròn từ 06:00 đến 22:00.`, true);
          (roundHour(c.start.value) ? c.end : c.start).focus();
          return;
        }
        if (c.start.value >= c.end.value) {
          setStatus(`${c.dayName}: Giờ đóng cửa phải sau giờ mở cửa.`, true);
          c.end.focus();
          return;
        }
        if (c.price.value === '' || !Number.isFinite(Number(c.price.value)) || Number(c.price.value) < 50000) {
          setStatus(`${c.dayName}: Giá mỗi giờ phải từ 50.000 ₫.`, true);
          c.price.focus();
          return;
        }
      }
    }

    try {
      for (const c of controls) {
        const payload = {
          pitch_id: pitchId,
          manager_id: pitch.manager_id,
          weekday: c.day,
          local_start: c.start.value,
          local_end: c.end.value,
          price_vnd: Number(c.price.value)
        };
        if (c.enabled.checked) {
          if (c.existing) await api.entities.PitchSchedule.update(c.existing.id, payload);
          else await api.entities.PitchSchedule.create(payload);
        } else if (c.existing) {
          await api.entities.PitchSchedule.delete(c.existing.id);
        }
      }
      await api.entities.Pitch.update(pitchId, { schedule_configured: true });
      scheduleDirty = false;
      dirtyBanner.hidden = true;
      toast('Đã lưu lịch hoạt động theo tuần.');
      await renderPitchAvailability();
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  const overrideSection = el('section', null, { class: 'surface stack' });
  const ovDate = el('input', null, { id: 'ov-date', type: 'date', min: todayLocal(), value: todayLocal(), required: true });
  const ovStart = hourSelect({ id: 'ov-start', required: true }, '18:00');
  const ovEnd = hourSelect({ id: 'ov-end', required: true }, '20:00');
  const ovStatus = el('select', null, { id: 'ov-status' }, [
    el('option', 'Khóa khung giờ (Bảo trì / Giải nội bộ)', { value: 'blocked' }),
    el('option', 'Mở riêng khung giờ ngoài lịch tuần', { value: 'open' })
  ]);
  const ovReason = el('input', null, { id: 'ov-reason', placeholder: 'VD: Bảo trì mặt cỏ, tổ chức giải phong trào...' });

  const ovForm = el('form', null, { class: 'stack', novalidate: true }, [
    el('h2', 'Ngoại lệ theo ngày (Khóa sân / Mở giờ riêng)'),
    el('p', 'Áp dụng cho một ngày cụ thể mà không làm thay đổi lịch cố định hằng tuần.', { class: 'text-sm muted' }),
    el('div', null, { class: 'grid-4', utility: 'u-align-items-end' }, [
      el('div', null, { class: 'field-group' }, [el('label', 'Ngày áp dụng', { for: 'ov-date' }), ovDate]),
      el('div', null, { class: 'field-group' }, [el('label', 'Từ giờ', { for: 'ov-start' }), ovStart]),
      el('div', null, { class: 'field-group' }, [el('label', 'Đến giờ', { for: 'ov-end' }), ovEnd]),
      el('div', null, { class: 'field-group' }, [el('label', 'Loại ngoại lệ', { for: 'ov-status' }), ovStatus])
    ]),
    el('div', null, { class: 'row-between', utility: 'u-align-items-end' }, [
      el('div', null, { class: 'field-group', utility: 'u-flex-1' }, [el('label', 'Ghi chú / Lý do', { for: 'ov-reason' }), ovReason]),
      el('button', '+ Thêm ngoại lệ', { type: 'submit', class: 'button secondary' })
    ])
  ]);

  ovForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (ovForm.dataset.busy === 'true') return;
    setStatus('');
    if (scheduleDirty) {
      setStatus('Vui lòng bấm "Lưu lịch tuần" trước khi thêm ngoại lệ theo ngày.', true);
      return;
    }
    if (!ovDate.value || ovStart.value >= ovEnd.value) {
      setStatus('Giờ kết thúc phải sau giờ bắt đầu.', true);
      return;
    }
    ovForm.dataset.busy = 'true';
    const submit = ovForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      if (['blocked', 'unavailable'].includes(ovStatus.value)) {
        const existingBookings = await fetchRows('Booking', { pitch_id: pitchId, local_date: ovDate.value });
        const blockedStart = Date.parse(`${ovDate.value}T${ovStart.value}:00+07:00`);
        const blockedEnd = Date.parse(`${ovDate.value}T${ovEnd.value}:00+07:00`);
        const conflicts = existingBookings.filter(b => b.status === 'confirmed' && Date.parse(b.starts_at) < blockedEnd && Date.parse(b.ends_at) > blockedStart);
        if (conflicts.length) throw new Error(`Có ${conflicts.length} đơn đã xác nhận trùng khung giờ. Hãy xử lý các đơn trước khi khóa sân.`);
      }
      await api.entities.AvailabilityOverride.create({
        pitch_id: pitchId,
        local_date: ovDate.value,
        start_time: ovStart.value,
        end_time: ovEnd.value,
        status: ovStatus.value,
        reason: ovReason.value.trim()
      });
      toast('Đã thêm ngoại lệ lịch sân.');
      await renderPitchAvailability();
    } catch (err) {
      setStatus(err.message || 'Không thể lưu ngoại lệ.', true);
    } finally {
      ovForm.dataset.busy = 'false';
      submit.disabled = false;
    }
  });

  const ovList = el('div', null, { class: 'stack-sm' });
  if (!overrides.length) {
    ovList.append(el('p', 'Chưa có ngoại lệ theo ngày nào.', { class: 'text-sm muted' }));
  } else {
    for (const item of overrides) {
      const delBtn = el('button', 'Xóa', { type: 'button', class: 'button danger-outline sm' });
      delBtn.addEventListener('click', () => {
        openActionDialog({
          title: 'Xóa ngoại lệ lịch sân',
          danger: true,
          confirmLabel: 'Xóa',
          description: `Xác nhận xóa ngoại lệ ngày ${formatDate(item.local_date)} (${item.start_time} – ${item.end_time})?`,
          required: false,
          hideReason: true,
          placeholder: 'Ghi chú (không bắt buộc)...',
          async onConfirm() {
            await api.entities.AvailabilityOverride.delete(item.id);
            toast('Đã xóa ngoại lệ.');
            await renderPitchAvailability();
          }
        });
      });
      ovList.append(
        el('div', null, { class: 'card card--compact card--subtle row-between' }, [
          el('div', null, {}, [
            el('div', null, { class: 'row', utility: 'u-gap-0p4rem' }, [
              el('strong', `${formatDate(item.local_date)}, ${item.start_time} – ${item.end_time}`),
              el('span', item.status === 'open' ? 'Mở riêng' : 'Khóa sân', {
                class: `badge ${item.status === 'open' ? 'badge--success' : 'badge--danger'}`
              })
            ]),
            item.reason ? el('div', item.reason, { class: 'text-xs muted' }) : null
          ]),
          delBtn
        ])
      );
    }
  }
  overrideSection.append(ovForm, ovList);

  const todayConfirmed = bookings.filter(b => b.local_date === todayLocal() && ['confirmed', 'pending'].includes(b.status));
  const todayBox = el('section', null, { class: 'surface stack' }, [
    el('h2', `Đơn đặt sân hôm nay (${todayConfirmed.length})`)
  ]);
  if (!todayConfirmed.length) {
    todayBox.append(el('p', 'Hôm nay chưa có đơn đặt sân nào trên sân này.', { class: 'text-sm muted' }));
  } else {
    for (const b of todayConfirmed) {
      todayBox.append(
        el('div', null, { class: 'card card--compact card--subtle row-between' }, [
          el('div', null, {}, [
            el('strong', b.slot_label || b.start_time),
            infoLines([`Khách: ${b.customer_name || 'Khách hàng'}`, `Mã đơn: ${b.code}`, formatVnd(b.amount_vnd)], 'text-xs muted')
          ]),
          el('a', 'Chi tiết', { href: `booking-details.html?id=${encodeURIComponent(b.id)}`, class: 'button secondary sm' })
        ])
      );
    }
  }

  content.replaceChildren(switcherRow, scheduleForm, overrideSection, todayBox);
}

bootManagement(renderPitchAvailability);
