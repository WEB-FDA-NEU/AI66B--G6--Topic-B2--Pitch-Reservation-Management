from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (AuditEvent, Booking, BookingSlot, ContentItem, Conversation, Message, Payment, Pitch,
                     Refund, Report, Review, User, Wallet, WalletTransaction, new_id)
from .demo_more import seed_more_demo
from .rules import booking_when, format_vnd, notify, pitch_label, wallet_move
from .security import hash_password
from .timeutil import add_days, local_to_utc, today_local, utcnow

EXTRA_CUSTOMERS = [
    ("user-binh", "binh@pitchpoint.test", "Trần Văn Bình", "0912000111"),
    ("user-chau", "chau@pitchpoint.test", "Lê Minh Châu", "0912000222"),
]


def _code(n: int) -> str:
    chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
    out, n = "", n * 7919 + 104729
    for _ in range(6):
        out += chars[n % len(chars)]
        n //= len(chars)
    return f"PP-{out}"


def seed_demo(db: Session) -> None:
    today = today_local()
    now = utcnow()
    users = {u.id: u for u in db.scalars(select(User)).all()}
    if "user-customer" not in users or "user-manager" not in users:
        return
    for uid, email, name, phone in EXTRA_CUSTOMERS:
        if uid not in users:
            u = User(id=uid, email=email, password_hash=hash_password("123456"), full_name=name, phone=phone,
                     app_role="customer", role="user", status="active", created_date=now - timedelta(days=20))
            db.add(u)
            db.flush()
            w = Wallet(user_id=uid, balance_vnd=3_000_000)
            db.add(w)
            db.flush()
            db.add(WalletTransaction(wallet_id=w.id, user_id=uid, amount_vnd=3_000_000,
                                     balance_after_vnd=3_000_000, kind="opening"))
            users[uid] = u
    pitches = {p.id: p for p in db.scalars(select(Pitch)).all()}
    pitches["pitch-1"].rules = "Mang giày TF hoặc giày bata. Không hút thuốc trong sân. Đến sớm 10 phút để nhận sân."
    pitches["pitch-2"].rules = "Không mang đồ ăn vào sân. Giữ vệ sinh chung."

    counter = [0]

    def booking(pitch_id, customer_id, day_offset, starts, status, cancel_type=None, cancel_reason="",
                cancelled_by=None, created_days_before=1):
        counter[0] += 1
        p, c = pitches[pitch_id], users[customer_id]
        local_date = add_days(today, day_offset)
        first, last_end = starts[0], f"{int(starts[-1][:2]) + 1:02d}:00"
        created = local_to_utc(local_date, first) - timedelta(days=created_days_before, hours=3)
        if created > now:
            created = now - timedelta(hours=2)
        b = Booking(id=new_id(), code=_code(counter[0]), pitch_id=p.id, pitch_name=p.name, pitch_type=p.type,
                    pitch_address=p.address, manager_id=p.manager_id, customer_id=c.id, customer_name=c.full_name,
                    local_date=local_date, start_time=first, slot_starts=list(starts),
                    slot_label=f"{first} – {last_end}", starts_at=local_to_utc(local_date, first),
                    ends_at=local_to_utc(local_date, last_end), amount_vnd=p.base_price_vnd * len(starts),
                    status="pending", payment_status="pending", hold_expires_at=created + timedelta(minutes=10),
                    reschedule_count=0, created_date=created, updated_date=created)
        db.add(b)
        db.flush()
        if cancel_type == "hold_expired":
            b.status, b.payment_status = "cancelled", "cancelled"
            b.cancel_type, b.cancel_reason, b.cancelled_by = "hold_expired", "Hết thời gian giữ chỗ.", "system"
            b.cancelled_at = created + timedelta(minutes=10)
            return b
        paid_at = created + timedelta(minutes=3)
        wallet_move(db, c.id, -b.amount_vnd, "payment", b.id)
        wallet_move(db, p.manager_id, b.amount_vnd, "payout", b.id)
        pay = Payment(booking_id=b.id, customer_id=c.id, manager_id=p.manager_id, pitch_id=p.id,
                      amount_vnd=b.amount_vnd, status="paid", paid_at=paid_at, created_date=paid_at)
        db.add(pay)
        db.flush()
        b.paid_at, b.payment_status = paid_at, "paid"
        if status == "cancelled":
            wallet_move(db, c.id, b.amount_vnd, "refund", b.id)
            wallet_move(db, p.manager_id, -b.amount_vnd, "refund_payout", b.id)
            pay.status = "refunded"
            at = paid_at + timedelta(hours=5)
            db.add(Refund(booking_id=b.id, payment_id=pay.id, customer_id=c.id, manager_id=p.manager_id,
                          amount_vnd=b.amount_vnd, status="completed", created_date=at))
            b.status, b.payment_status = "cancelled", "refunded"
            b.cancel_type, b.cancel_reason, b.cancelled_by, b.cancelled_at = cancel_type, cancel_reason, cancelled_by, at
        else:
            b.status = status
            if status == "confirmed":
                for s in starts:
                    db.add(BookingSlot(booking_id=b.id, pitch_id=p.id, local_date=local_date, start_time=s))
        return b

    C, B, H = "user-customer", "user-binh", "user-chau"
    wallet_move(db, C, 1_000_000, "topup", None)
    done = [
        booking("pitch-1", B, -6, ["18:00", "19:00"], "completed", created_days_before=3),
        booking("pitch-2", H, -5, ["19:00"], "completed", created_days_before=2),
        booking("pitch-3", B, -4, ["17:00"], "completed"),
        booking("pitch-1", H, -3, ["20:00"], "completed"),
        booking("pitch-2", B, -2, ["18:00", "19:00"], "completed"),
        booking("pitch-1", C, -2, ["17:00"], "completed"),
        booking("pitch-3", H, -1, ["19:00"], "completed"),
    ]
    booking("pitch-3", C, -3, ["18:00"], "cancelled", "customer", "Bận việc đột xuất.", "customer", 2)
    booking("pitch-2", H, -1, ["08:00"], "cancelled", "manager", "Sân bảo trì hệ thống đèn.", "manager", 2)
    booking("pitch-1", B, 2, ["07:00"], "cancelled", "hold_expired")
    upcoming = [
        booking("pitch-1", C, 2, ["19:00", "20:00"], "confirmed"),
        booking("pitch-2", B, 1, ["18:00"], "confirmed"),
        booking("pitch-1", H, 3, ["18:00"], "confirmed"),
        booking("pitch-3", B, 4, ["20:00"], "confirmed"),
        booking("pitch-2", C, 5, ["07:00"], "confirmed"),
    ]

    reviews = [(done[0], 5, "Sân đẹp, đèn sáng, chủ sân nhiệt tình."), (done[1], 4, "Cỏ ổn, giá hơi cao giờ cao điểm."),
               (done[2], 5, "Gần nhà, đặt nhanh, sẽ quay lại."), (done[3], 4, "Phòng thay đồ sạch sẽ."),
               (done[4], 3, "Sân hơi trơn khi trời mưa."), (done[6], 5, "Rất hài lòng.")]

    D, G, HA, K = "user-dung", "user-giang", "user-hai", "user-khanh"
    if all(x in users for x in (D, G, HA, K)) and all(f"pitch-{i}" in pitches for i in range(4, 11)):
        for cid in (D, G, HA, K):
            wallet_move(db, cid, 3_000_000, "topup", None)
        more_done = [
            booking("pitch-4", D, -5, ["18:00", "19:00"], "completed", created_days_before=2),
            booking("pitch-5", G, -4, ["19:00"], "completed"),
            booking("pitch-6", HA, -3, ["08:00", "09:00"], "completed", created_days_before=3),
            booking("pitch-7", K, -2, ["06:00"], "completed"),
            booking("pitch-8", D, -2, ["20:00"], "completed"),
            booking("pitch-9", G, -1, ["17:00"], "completed"),
            booking("pitch-10", HA, -1, ["18:00"], "completed"),
        ]
        booking("pitch-5", K, -2, ["18:00"], "cancelled", "customer", "Đội không đủ người.", "customer", 2)
        for pid, cid, off, starts in [("pitch-4", G, 1, ["19:00"]), ("pitch-6", D, 2, ["16:00"]),
                                      ("pitch-7", HA, 3, ["06:00", "07:00"]), ("pitch-8", K, 1, ["18:00"]),
                                      ("pitch-9", D, 4, ["20:00"]), ("pitch-10", G, 2, ["19:00", "20:00"]),
                                      ("pitch-5", HA, 5, ["18:00"])]:
            booking(pid, cid, off, starts, "confirmed")
        reviews += [(more_done[0], 4, "Giá rẻ, cỏ mới, hơi thiếu chỗ để xe."),
                    (more_done[1], 5, "Sân rộng, có khán đài, đá rất sướng."),
                    (more_done[2], 5, "Sân 11 người chuẩn, phòng thay đồ rộng."),
                    (more_done[3], 4, "Sáng sớm đá rất mát."),
                    (more_done[5], 3, "Sân nhỏ, đèn hơi yếu ở góc."),
                    (more_done[6], 5, "Có giày cho thuê, tiện cho người mới.")]
        m2 = users.get("user-manager-2")
        if m2:
            c2 = Conversation(customer_id=G, customer_name=users[G].full_name, manager_id=m2.id, manager_name=m2.full_name,
                              pitch_id="pitch-4", pitch_name=pitches["pitch-4"].name, created_date=now - timedelta(hours=8))
            db.add(c2)
            db.flush()
            for sender, body, hours_ago in [(G, "Anh ơi tối mai sân còn khung 20:00 không ạ?", 8),
                                            (m2.id, "Còn em nhé, em đặt trên web là giữ chỗ được ngay.", 7)]:
                su, at = users[sender], now - timedelta(hours=hours_ago)
                db.add(Message(conversation_id=c2.id, customer_id=G, manager_id=m2.id, sender_id=sender,
                               sender_name=su.full_name, sender_role=su.app_role, body=body, created_date=at))
                c2.last_message, c2.last_message_at = body[:140], at
    for b, rating, body in reviews:
        db.add(Review(booking_id=b.id, pitch_id=b.pitch_id, customer_id=b.customer_id, customer_name=b.customer_name,
                      rating=rating, body=body, created_date=b.ends_at + timedelta(hours=2)))

    mgr = users["user-manager"]
    conv = Conversation(customer_id=C, customer_name=users[C].full_name, manager_id=mgr.id, manager_name=mgr.full_name,
                        pitch_id="pitch-1", pitch_name=pitches["pitch-1"].name, created_date=now - timedelta(days=1))
    db.add(conv)
    db.flush()
    thread = [(C, "Chào anh, sân có cho thuê bóng và áo bib không ạ?", 26),
              (mgr.id, "Chào bạn, sân có sẵn bóng và áo bib miễn phí nhé.", 25),
              (C, "Dạ cảm ơn anh, tối thứ mấy bọn em qua.", 24)]
    for sender, body, hours_ago in thread:
        su = users[sender]
        at = now - timedelta(hours=hours_ago)
        db.add(Message(conversation_id=conv.id, customer_id=C, manager_id=mgr.id, sender_id=sender,
                       sender_name=su.full_name, sender_role=su.app_role, body=body, created_date=at))
        conv.last_message, conv.last_message_at = body[:140], at

    db.add(Report(target_type="pitch", target_id="pitch-2", target_name=pitches["pitch-2"].name, reporter_id=H,
                  reporter_name=users[H].full_name, reporter_role="customer", reason="Giá thực tế khác giá niêm yết",
                  details="Chủ sân thu thêm 50.000 ₫ tiền nước dù trên web ghi miễn phí.", status="open",
                  created_date=now - timedelta(hours=6)))
    db.add(ContentItem(title="Giảm 10% khung giờ sáng", type="banner", status="published",
                       body="Đặt sân từ 06:00 đến 09:00 trong tuần này để nhận ưu đãi từ các chủ sân đối tác.",
                       cta_label="Tìm sân ngay", cta_link="search.html", created_by_name="Quản trị viên demo",
                       published_at=now - timedelta(days=1)))
    admin = users.get("user-admin")
    if admin:
        db.add(AuditEvent(actor_id=admin.id, actor_name=admin.full_name, actor_email=admin.email, actor_role="admin",
                          action="content_create", entity_type="Nội dung", entity_id=None,
                          target_name="Giảm 10% khung giờ sáng", reason="", created_date=now - timedelta(days=1)))

    b = upcoming[0]
    notify(db, C, "Đặt sân thành công",
           f"Đơn {b.code} tại {pitch_label(b.pitch_name, True)} lúc {booking_when(b)} đã được thanh toán "
           f"{format_vnd(b.amount_vnd)}. Khi tới sân, bạn chỉ cần đọc mã đơn cho chủ sân.", f"/user/bookings/{b.id}")
    notify(db, C, "Hãy đánh giá trận đấu của bạn",
           f"Đơn {done[5].code} tại {pitch_label(done[5].pitch_name, True)} đã hoàn thành. Chia sẻ cảm nhận để giúp người chơi khác nhé.",
           f"/user/bookings/{done[5].id}")
    for ub in upcoming[:3]:
        notify(db, mgr.id, "Có đơn đặt sân mới",
               f"{ub.customer_name} đã đặt {pitch_label(ub.pitch_name, True)} lúc {booking_when(ub)} "
               f"(đơn {ub.code}, {format_vnd(ub.amount_vnd)}).", f"/manager/pitches/{ub.pitch_id}/bookings")
    if admin:
        notify(db, admin.id, f"Báo cáo mới từ {users[H].full_name}", "Giá thực tế khác giá niêm yết", "/admin/reports")
    db.flush()
    seed_more_demo(db)
    db.flush()
