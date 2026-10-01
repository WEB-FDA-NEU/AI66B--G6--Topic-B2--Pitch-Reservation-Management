
import { MOCK_PITCHES } from './pitches.js';

export const MOCK_BOOKINGS = [
  { id: 'BK-2026-0001', pitchId: 1, customerName: 'Nguyễn Văn A', customerPhone: '0901234567', date: '2026-10-02', time: '18:00', amount: 440000, status: 'confirmed', paymentStatus: 'paid', reviewed: false, createdAt: '2026-09-20T10:00:00' },
  { id: 'BK-2026-0002', pitchId: 2, customerName: 'Nguyễn Văn A', customerPhone: '0901234567', date: '2026-09-18', time: '08:00', amount: 320000, status: 'completed', paymentStatus: 'paid', reviewed: false, createdAt: '2026-09-10T09:00:00' },
  { id: 'BK-2026-0003', pitchId: 3, customerName: 'Nguyễn Văn A', customerPhone: '0901234567', date: '2026-09-12', time: '20:00', amount: 520000, status: 'completed', paymentStatus: 'paid', reviewed: true, createdAt: '2026-09-05T09:00:00' },
  { id: 'BK-2026-0004', pitchId: 4, customerName: 'Nguyễn Văn A', customerPhone: '0901234567', date: '2026-09-08', time: '16:00', amount: 920000, status: 'cancelled', paymentStatus: 'refunded', reviewed: false, createdAt: '2026-09-01T09:00:00' },
  { id: 'BK-2026-0005', pitchId: 5, customerName: 'Nguyễn Văn A', customerPhone: '0901234567', date: '2026-10-05', time: '06:00', amount: 340000, status: 'rescheduled', paymentStatus: 'paid', reviewed: false, createdAt: '2026-09-22T09:00:00' },
  { id: 'BK-2026-0006', pitchId: 6, customerName: 'Nguyễn Văn A', customerPhone: '0901234567', date: '2026-09-30', time: '14:00', amount: 410000, status: 'pending', paymentStatus: 'pending', reviewed: false, createdAt: '2026-09-24T09:00:00' },
  { id: 'BK-2026-0007', pitchId: 7, customerName: 'Nguyễn Văn A', customerPhone: '0901234567', date: '2026-08-29', time: '10:00', amount: 870000, status: 'payment_failed', paymentStatus: 'failed', reviewed: false, createdAt: '2026-08-29T08:30:00' },
  { id: 'BK-2026-0008', pitchId: 8, customerName: 'Nguyễn Văn A', customerPhone: '0901234567', date: '2026-09-25', time: '18:00', amount: 300000, status: 'cancelled', paymentStatus: 'refund_pending', reviewed: false, createdAt: '2026-09-19T09:00:00' },
];

export const MOCK_MANAGER_BOOKINGS = [
  { id: 'BK-2026-1001', pitchId: 1, customerName: 'Nguyễn Văn A', customerPhone: '0901234567', date: '2026-10-02', time: '18:00', amount: 440000, status: 'confirmed', paymentStatus: 'paid' },
  { id: 'BK-2026-1002', pitchId: 1, customerName: 'Trần Thị B', customerPhone: '0912345678', date: '2026-09-30', time: '20:00', amount: 440000, status: 'pending', paymentStatus: 'pending' },
  { id: 'BK-2026-1003', pitchId: 2, customerName: 'Lê Văn C', customerPhone: '0987654321', date: '2026-09-18', time: '08:00', amount: 300000, status: 'completed', paymentStatus: 'paid' },
  { id: 'BK-2026-1004', pitchId: 2, customerName: 'Phạm Thị D', customerPhone: '0977123456', date: '2026-09-08', time: '16:00', amount: 300000, status: 'cancelled', paymentStatus: 'refunded' },
  { id: 'BK-2026-1005', pitchId: 3, customerName: 'Hoàng Văn E', customerPhone: '0966789012', date: '2026-10-06', time: '06:00', amount: 500000, status: 'confirmed', paymentStatus: 'paid' },
  { id: 'BK-2026-1006', pitchId: 3, customerName: 'Vũ Thị F', customerPhone: '0955432109', date: '2026-09-25', time: '14:00', amount: 500000, status: 'rescheduled', paymentStatus: 'paid' },
  { id: 'BK-2026-1007', pitchId: 1, customerName: 'Đặng Văn G', customerPhone: '0944321098', date: '2026-08-30', time: '10:00', amount: 440000, status: 'cancelled', paymentStatus: 'refund_pending' },
  { id: 'BK-2026-1008', pitchId: 2, customerName: 'Bùi Thị H', customerPhone: '0933210987', date: '2026-09-12', time: '20:00', amount: 300000, status: 'completed', paymentStatus: 'paid' },
];

export const STATUS_META = {
  pending:        { label: 'Chờ xác nhận',        badge: 'status-badge--pending' },
  confirmed:      { label: 'Đã xác nhận',         badge: 'status-badge--confirmed' },
  completed:      { label: 'Hoàn tất',             badge: 'status-badge--completed' },
  cancelled:      { label: 'Đã huỷ',              badge: 'status-badge--cancelled' },
  rescheduled:    { label: 'Đã đổi lịch',         badge: 'status-badge--rescheduled' },
  payment_failed: { label: 'Thanh toán thất bại',  badge: 'status-badge--payment-failed' },
  refund_pending: { label: 'Đang hoàn tiền',       badge: 'status-badge--refund-pending' },
  refunded:       { label: 'Đã hoàn tiền',         badge: 'status-badge--refunded' },
};

export const PAYMENT_LABEL = {
  paid:           'Đã thanh toán',
  pending:        'Chờ thanh toán',
  failed:         'Thất bại',
  refund_pending: 'Đang hoàn tiền',
  refunded:       'Đã hoàn tiền',
};

export function findBooking(id) {
  return MOCK_BOOKINGS.find(b => b.id === id) ?? null;
}

export function pitchForBooking(booking) {
  return MOCK_PITCHES.find(p => p.id === booking.pitchId) ?? null;
}
