-- Kiểm tra tính nhất quán dữ liệu sau khi server bị tắt đột ngột. Chỉ đọc, không sửa dữ liệu.
-- Mỗi truy vấn đúng phải trả về 0 dòng (riêng truy vấn cuối là bảng tổng hợp).

\echo '1. Ví có số dư khác tổng sổ giao dịch (đúng: 0 dòng)'
SELECT u.email, w.balance_vnd, COALESCE(SUM(t.amount_vnd), 0) AS tong_so_giao_dich
FROM wallets w
JOIN users u ON u.id = w.user_id
LEFT JOIN wallet_transactions t ON t.wallet_id = w.id
GROUP BY u.email, w.balance_vnd
HAVING w.balance_vnd <> COALESCE(SUM(t.amount_vnd), 0);

\echo '2. Đơn bị trừ tiền hoặc hoàn tiền nhiều lần (đúng: 0 dòng)'
SELECT b.code, t.kind, COUNT(*) AS so_lan
FROM wallet_transactions t
JOIN bookings b ON b.id = t.booking_id
WHERE t.kind IN ('payment', 'refund')
GROUP BY b.code, t.kind
HAVING COUNT(*) > 1;

\echo '3. Khung giờ bị đặt trùng (đúng: 0 dòng)'
SELECT pitch_id, local_date, start_time, COUNT(*) AS so_don
FROM booking_slots
GROUP BY pitch_id, local_date, start_time
HAVING COUNT(*) > 1;

\echo '4. Đơn đã xác nhận nhưng không có thanh toán, hoặc đơn giữ chỗ đã bị trừ tiền (đúng: 0 dòng)'
SELECT b.code, b.status, COUNT(p.id) FILTER (WHERE p.status = 'paid') AS thanh_toan
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
GROUP BY b.code, b.status
HAVING (b.status IN ('confirmed', 'completed') AND COUNT(p.id) FILTER (WHERE p.status = 'paid') <> 1)
    OR (b.status = 'pending' AND COUNT(p.id) > 0);

\echo '5. Đơn đã hủy nhưng vẫn khóa khung giờ (đúng: 0 dòng)'
SELECT b.code
FROM bookings b
JOIN booking_slots s ON s.booking_id = b.id
WHERE b.status = 'cancelled'
GROUP BY b.code;

\echo '6. Đơn đang giữ chỗ đã quá hạn mà chưa được hủy (đúng: 0 dòng khi server đã chạy lại quá 30 giây)'
SELECT code, hold_expires_at
FROM bookings
WHERE status = 'pending' AND hold_expires_at < (NOW() AT TIME ZONE 'UTC');

\echo '7. Tổng hợp trạng thái đơn'
SELECT status, cancel_type, COUNT(*) AS so_don
FROM bookings
GROUP BY status, cancel_type
ORDER BY status, cancel_type;
