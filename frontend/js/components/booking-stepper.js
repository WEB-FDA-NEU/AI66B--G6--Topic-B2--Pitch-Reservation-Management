import { createIcon } from '../core/ui.js';
import { el } from '../core/render.js';
import { holdText } from '../core/config.js';

export function buildBookingStepper(currentStep = 1, { finalState = 'done', finalLabel = 'Hoàn tất' } = {}) {
  const steps = [
    { num: 1, title: 'Chọn lịch', sub: 'Ngày & giờ liền kề' },
    { num: 2, title: 'Giữ chỗ & Xác nhận', sub: `Giữ ${holdText()}, thanh toán bằng ví` },
    { num: 3, title: finalLabel, sub: finalState === 'failed' ? 'Đã hủy / Hết hạn' : finalState === 'pending' ? 'Đang chờ thanh toán' : 'Mã đơn & lịch thi đấu' }
  ];
  const ol = el('ol', null, { class: 'booking-stepper-list' });
  for (const st of steps) {
    let state = 'upcoming';
    if (st.num < currentStep) state = 'completed';
    else if (st.num === currentStep) {
      if (st.num === 3 && finalState === 'done') state = 'completed';
      else if (st.num === 3 && finalState === 'failed') state = 'failed';
      else state = 'active';
    }
    const indicator = state === 'completed'
      ? el('span', null, { class: 'booking-step-badge', 'aria-hidden': 'true' }, [createIcon('CheckCircle2', 16)])
      : el('span', String(st.num), { class: 'booking-step-badge', 'aria-hidden': 'true' });

    const li = el('li', null, {
      class: `booking-step booking-step--${state}`,
      'aria-current': st.num === currentStep ? 'step' : null
    }, [
      indicator,
      el('div', null, { class: 'booking-step-text' }, [
        el('span', st.title, { class: 'booking-step-title' }),
        el('span', st.sub, { class: 'booking-step-sub' })
      ])
    ]);
    ol.append(li);
  }
  ol.setAttribute('aria-label', 'Tiến trình đặt sân');
  return el('div', null, { class: 'booking-stepper surface' }, [ol]);
}
