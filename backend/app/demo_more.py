"""Dữ liệu demo mở rộng: thêm chủ sân, khách hàng, sân (nhiều khu vực), đơn, đánh giá, yêu thích, hội thoại.

Chạy cuối `seed_demo` (khi SEED_DEMO=true). Cần các tài khoản/sân của seed.json đã có.
Không có ảnh sân: thẻ sân dùng ảnh mặc định; chủ sân tự tải ảnh khi cần.
"""
from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (Booking, BookingSlot, Conversation, Favorite, Message, Payment, Pitch, PitchSchedule,
                     Refund, Review, User, Wallet, WalletTransaction, new_id)
from .rules import booking_when, format_vnd, notify, pitch_label, wallet_move
from .security import hash_password
from .timeutil import add_days, local_to_utc, today_local, utcnow

MANAGERS = [
    ("user-manager-5", "manager5@pitchpoint.test", "Trần Thị Mai", "0903111555"),
    ("user-manager-6", "manager6@pitchpoint.test", "Lê Hoàng Phúc", "0903111666"),
    ("user-manager-7", "manager7@pitchpoint.test", "Vũ Đình Khoa", "0903111777"),
    ("user-manager-8", "manager8@pitchpoint.test", "Nguyễn Thu Hà", "0903111888"),
]
CUSTOMERS = [
    ("user-linh", "linh@pitchpoint.test", "Đặng Thùy Linh", "0977100201"),
    ("user-nam", "nam@pitchpoint.test", "Phan Hoài Nam", "0977100202"),
    ("user-quan", "quan@pitchpoint.test", "Trịnh Minh Quân", "0977100203"),
    ("user-trang", "trang@pitchpoint.test", "Đinh Thu Trang", "0977100204"),
    ("user-son", "son@pitchpoint.test", "Lý Thanh Sơn", "0977100205"),
    ("user-tuan", "tuan@pitchpoint.test", "Mai Anh Tuấn", "0977100206"),
    ("user-yen", "yen@pitchpoint.test", "Hồ Hải Yến", "0977100207"),
    ("user-phong", "phong@pitchpoint.test", "Cao Gia Phong", "0977100208"),
]
L, LT, CD = "Đèn chiếu sáng", "Bãi đỗ xe", "Phòng thay đồ"
# id, manager, tên, loại, giá, (giá giờ cao điểm 17h+ hoặc None), thành phố, quận, địa chỉ, mở, đóng, tiện ích, mô tả, nội quy, trạng thái
PITCHES = [
    ("pitch-11", "user-manager", "Sân bóng Dịch Vọng", "7v7", 420000, 520000, "Hà Nội", "Cầu Giấy", "Số 15 Trần Đăng Ninh",
     "06:00", "22:00", [L, LT, CD, "Nước uống miễn phí"], "Sân 7 người cỏ nhân tạo thế hệ mới, gần các trường đại học.",
     "Mang giày TF. Không hút thuốc trong sân.", "active"),
    ("pitch-12", "user-manager-3", "Sân vận động Hồ Tây Arena", "11v11", 1200000, 1500000, "Hà Nội", "Tây Hồ", "Số 2 Võ Chí Công",
     "06:00", "22:00", [L, LT, CD, "Khán đài", "Phòng tắm"], "Sân 11 người tiêu chuẩn, có khán đài 300 chỗ ngồi.",
     "Đặt tối thiểu 2 giờ cho các trận giao hữu. Giữ vệ sinh khán đài.", "active"),
    ("pitch-13", "user-manager-4", "Sân bóng Kim Liên", "5v5", 190000, None, "Hà Nội", "Đống Đa", "Ngõ 4 Đào Duy Anh",
     "07:00", "21:00", [L, "Cho thuê bóng"], "Sân 5 người nhỏ gọn, giá mềm cho sinh viên.", "", "active"),
    ("pitch-14", "user-manager-4", "Sân bóng Định Công", "7v7", 330000, 400000, "Hà Nội", "Hoàng Mai", "Số 88 Định Công",
     "06:00", "22:00", [L, LT, "Cho thuê giày", "Căng tin"], "Sân 7 người rộng, có căng tin và chỗ ngồi chờ.",
     "Không mang đồ uống có cồn vào sân.", "active"),
    ("pitch-15", "user-manager-5", "Sân bóng Bắc Từ Liêm", "5v5", 210000, 260000, "Hà Nội", "Bắc Từ Liêm", "Số 36 Phạm Văn Đồng",
     "06:00", "22:00", [L, LT, CD], "Sân 5 người gần đường lớn, dễ tìm.", "", "active"),
    ("pitch-16", "user-manager-5", "Sân bóng Gia Lâm", "7v7", 300000, None, "Hà Nội", "Gia Lâm", "Số 120 Ngô Xuân Quảng",
     "06:00", "21:00", [L, LT, "Cho thuê bóng", "Wifi"], "Sân 7 người thoáng mát, phù hợp đội phong trào.", "", "active"),
    ("pitch-17", "user-manager-5", "Sân bóng Thanh Trì", "5v5", 180000, None, "Hà Nội", "Thanh Trì", "Số 5 Ngọc Hồi",
     "07:00", "21:00", [L, LT], "Sân 5 người giá rẻ khu vực phía nam.", "", "paused"),
    ("pitch-18", "user-manager-6", "Sân bóng Phú Mỹ Hưng", "7v7", 450000, 550000, "TP. Hồ Chí Minh", "Quận 7", "Số 21 Nguyễn Đức Cảnh",
     "06:00", "22:00", [L, LT, CD, "Phòng tắm", "Wifi"], "Sân 7 người trong khu đô thị, có phòng tắm nước nóng.",
     "Đến sớm 10 phút để nhận sân.", "active"),
    ("pitch-19", "user-manager-6", "Sân bóng Thảo Điền", "5v5", 280000, 350000, "TP. Hồ Chí Minh", "Thủ Đức", "Số 9 Quốc Hương",
     "06:00", "22:00", [L, CD, "Cho thuê giày"], "Sân 5 người cỏ mới, có mái che một phần.", "", "active"),
    ("pitch-20", "user-manager-7", "Sân bóng Hoàn Kiếm", "5v5", 320000, None, "Hà Nội", "Hoàn Kiếm", "Số 3 Trần Khánh Dư",
     "08:00", "22:00", [L, CD], "Sân 5 người ngay trung tâm phố cổ.", "Không gây ồn sau 21:30.", "active"),
    ("pitch-21", "user-manager-8", "Sân bóng Hải Châu", "7v7", 380000, 450000, "Đà Nẵng", "Hải Châu", "Số 45 Nguyễn Văn Linh",
     "06:00", "22:00", [L, LT, CD, "Nước uống miễn phí"], "Sân 7 người gần sân bay, view cầu Rồng về đêm.", "", "active"),
]


def _code(n: int) -> str:
    chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
    out, n = "", n * 7919 + 104729
    for _ in range(6):
        out += chars[n % len(chars)]
        n //= len(chars)
    return f"PP-{out}"


def seed_more_demo(db: Session) -> None:
    now, today = utcnow(), today_local()
    have = {u.id for u in db.scalars(select(User)).all()}
    if "user-manager-5" in have or not {"user-customer", "user-manager", "user-hai", "user-khanh"} <= have:
        return
    for uid, email, name, phone in MANAGERS + CUSTOMERS:
        role = "manager" if uid.startswith("user-manager") else "customer"
        u = User(id=uid, email=email, password_hash=hash_password("123456"), full_name=name, phone=phone,
                 app_role=role, role="user", status="active", must_change_password=False,
                 created_date=now - timedelta(days=12))
        db.add(u)
        db.flush()
        opening = 0 if role == "manager" else 2_000_000
        w = Wallet(user_id=uid, balance_vnd=opening)
        db.add(w)
        db.flush()
        db.add(WalletTransaction(wallet_id=w.id, user_id=uid, amount_vnd=opening, balance_after_vnd=opening, kind="opening"))
    users = {u.id: u for u in db.scalars(select(User)).all()}
    for cid in ("user-linh", "user-nam", "user-quan"):  # khách đá nhiều, đã nạp thêm tiền
        wallet_move(db, cid, 3_000_000, "topup", None)

    pitches = {p.id: (p, None) for p in db.scalars(select(Pitch)).all()}
    for (pid, mid, name, typ, price, peak, city, district, addr, ot, ct, fac, desc, rules, status) in PITCHES:
        m = users[mid]
        p = Pitch(id=pid, name=name, type=typ, base_price_vnd=price, city=city, district=district, address=addr,
                  open_time=ot, close_time=ct, facilities=fac, rules=rules, description=desc, images=[],
                  manager_id=mid, manager_name=m.full_name, status=status, slot_minutes=60,
                  schedule_configured=True, created_date=now - timedelta(days=10))
        if status == "paused":
            p.pause_reason, p.status_changed_at = "Đang thay mặt cỏ mới, dự kiến mở lại cuối tháng.", now - timedelta(days=1)
        db.add(p)
        db.flush()
        for weekday in range(7):
            if peak and ct > "17:00":
                db.add(PitchSchedule(pitch_id=pid, manager_id=mid, weekday=weekday, local_start=ot, local_end="17:00", price_vnd=price))
                db.add(PitchSchedule(pitch_id=pid, manager_id=mid, weekday=weekday, local_start="17:00", local_end=ct, price_vnd=peak))
            else:
                db.add(PitchSchedule(pitch_id=pid, manager_id=mid, weekday=weekday, local_start=ot, local_end=ct, price_vnd=price))
        pitches[pid] = (p, peak)
    db.flush()

    used = set(db.scalars(select(Booking.code)).all())
    counter = [500]

    def booking(pid, cid, off, starts, status, cancel_type=None, reason="", by=None):
        p, peak = pitches[pid]
        c = users[cid]
        counter[0] += 1
        while _code(counter[0]) in used:
            counter[0] += 1
        code = _code(counter[0]); used.add(code)
        local_date = add_days(today, off)
        first, last_end = starts[0], f"{int(starts[-1][:2]) + 1:02d}:00"
        amount = sum(peak if peak and s >= "17:00" else p.base_price_vnd for s in starts)
        created = local_to_utc(local_date, first) - timedelta(days=1, hours=3)
        if created > now:
            created = now - timedelta(hours=2)
        b = Booking(id=new_id(), code=code, pitch_id=pid, pitch_name=p.name, pitch_type=p.type, pitch_address=p.address,
                    manager_id=p.manager_id, customer_id=cid, customer_name=c.full_name, local_date=local_date,
                    start_time=first, slot_starts=list(starts), slot_label=f"{first} – {last_end}",
                    starts_at=local_to_utc(local_date, first), ends_at=local_to_utc(local_date, last_end),
                    amount_vnd=amount, status="pending", payment_status="pending",
                    hold_expires_at=created + timedelta(minutes=10), reschedule_count=0,
                    created_date=created, updated_date=created)
        db.add(b)
        db.flush()
        paid_at = created + timedelta(minutes=3)
        wallet_move(db, cid, -amount, "payment", b.id)
        wallet_move(db, p.manager_id, amount, "payout", b.id)
        pay = Payment(booking_id=b.id, customer_id=cid, manager_id=p.manager_id, pitch_id=pid, amount_vnd=amount,
                      status="paid", paid_at=paid_at, created_date=paid_at)
        db.add(pay)
        db.flush()
        b.paid_at, b.payment_status = paid_at, "paid"
        if status == "cancelled":
            wallet_move(db, cid, amount, "refund", b.id)
            wallet_move(db, p.manager_id, -amount, "refund_payout", b.id)
            pay.status = "refunded"
            at = paid_at + timedelta(hours=4)
            db.add(Refund(booking_id=b.id, payment_id=pay.id, customer_id=cid, manager_id=p.manager_id,
                          amount_vnd=amount, status="completed", created_date=at))
            b.status, b.payment_status = "cancelled", "refunded"
            b.cancel_type, b.cancel_reason, b.cancelled_by, b.cancelled_at = cancel_type, reason, by, at
        else:
            b.status = status
            if status == "confirmed":
                for s in starts:
                    db.add(BookingSlot(booking_id=b.id, pitch_id=pid, local_date=local_date, start_time=s))
                notify(db, p.manager_id, "Có đơn đặt sân mới",
                       f"{c.full_name} đã đặt {pitch_label(p.name, True)} lúc {booking_when(b)} "
                       f"(đơn {b.code}, {format_vnd(amount)}).", f"/manager/pitches/{pid}/bookings")
        return b

    done = [
        (booking("pitch-11", "user-linh", -6, ["18:00", "19:00"], "completed"), 5, "Sân mới, cỏ êm, chủ sân dễ thương."),
        (booking("pitch-11", "user-binh", -3, ["20:00"], "completed"), 4, "Đèn sáng, giờ cao điểm hơi đông."),
        (booking("pitch-12", "user-nam", -5, ["08:00", "09:00"], "completed"), 5, "Sân 11 người rất chuẩn, đá như sân thật."),
        (booking("pitch-12", "user-quan", -2, ["15:00", "16:00"], "completed"), 4, "Khán đài đẹp, phòng tắm hơi ít vòi."),
        (booking("pitch-13", "user-trang", -4, ["19:00"], "completed"), 4, "Giá rẻ, hợp với sinh viên."),
        (booking("pitch-13", "user-son", -1, ["07:00"], "completed"), 3, "Sân hơi nhỏ, cỏ đã cũ ở góc."),
        (booking("pitch-14", "user-tuan", -5, ["18:00"], "completed"), 5, "Căng tin tiện, ngồi chờ thoải mái."),
        (booking("pitch-14", "user-dung", -2, ["20:00", "21:00"], "completed"), None, ""),
        (booking("pitch-15", "user-yen", -4, ["17:00"], "completed"), 4, "Dễ tìm, gửi xe thuận tiện."),
        (booking("pitch-16", "user-phong", -3, ["16:00", "17:00"], "completed"), 5, "Sân thoáng, đá chiều rất mát."),
        (booking("pitch-17", "user-giang", -7, ["18:00"], "completed"), 3, "Cỏ mòn nhiều, nghe nói sắp thay mới."),
        (booking("pitch-18", "user-nam", -6, ["19:00"], "completed"), 5, "Phòng tắm nước nóng, rất đáng tiền."),
        (booking("pitch-18", "user-linh", -2, ["06:00", "07:00"], "completed"), 4, "Sáng sớm vắng, đá thoải mái."),
        (booking("pitch-19", "user-quan", -3, ["18:00"], "completed"), 4, "Có mái che, mưa vẫn đá được."),
        (booking("pitch-20", "user-trang", -4, ["20:00"], "completed"), 5, "Ngay trung tâm, đá xong đi ăn phố cổ."),
        (booking("pitch-20", "user-hai", -1, ["09:00"], "completed"), None, ""),
        (booking("pitch-21", "user-tuan", -5, ["19:00", "20:00"], "completed"), 5, "Đêm nhìn ra cầu Rồng rất đẹp."),
        (booking("pitch-21", "user-yen", -2, ["17:00"], "completed"), 4, "Nước uống miễn phí, nhân viên nhiệt tình."),
    ]
    booking("pitch-11", "user-son", -2, ["19:00"], "cancelled", "customer", "Đội bạn hủy kèo.", "customer")
    booking("pitch-19", "user-phong", -1, ["20:00"], "cancelled", "manager", "Mất điện khu vực, sân không có đèn.", "manager")
    for pid, cid, off, starts in [("pitch-11", "user-quan", 1, ["19:00", "20:00"]), ("pitch-12", "user-linh", 3, ["16:00", "17:00"]),
                                  ("pitch-13", "user-nam", 2, ["18:00"]), ("pitch-14", "user-trang", 4, ["19:00"]),
                                  ("pitch-15", "user-son", 1, ["20:00"]), ("pitch-16", "user-tuan", 5, ["07:00", "08:00"]),
                                  ("pitch-18", "user-yen", 2, ["18:00"]), ("pitch-19", "user-phong", 3, ["19:00"]),
                                  ("pitch-20", "user-customer", 6, ["20:00"]), ("pitch-21", "user-nam", 4, ["18:00", "19:00"]),
                                  ("pitch-4", "user-linh", 2, ["17:00"]), ("pitch-9", "user-quan", 5, ["18:00"])]:
        booking(pid, cid, off, starts, "confirmed")
    for b, rating, body in done:
        if rating:
            db.add(Review(booking_id=b.id, pitch_id=b.pitch_id, customer_id=b.customer_id, customer_name=b.customer_name,
                          rating=rating, body=body, created_date=b.ends_at + timedelta(hours=2)))

    for uid, pid in [("user-linh", "pitch-11"), ("user-linh", "pitch-18"), ("user-nam", "pitch-12"), ("user-trang", "pitch-20"),
                     ("user-tuan", "pitch-21"), ("user-customer", "pitch-20"), ("user-quan", "pitch-19")]:
        db.add(Favorite(user_id=uid, pitch_id=pid, created_date=now - timedelta(days=2)))

    for cid, pid, thread in [
        ("user-tuan", "pitch-21", [("c", "Chị ơi sân có cho thuê áo bib không ạ?", 30), ("m", "Có em nhé, 10 áo miễn phí.", 29),
                                   ("c", "Dạ em cảm ơn chị.", 28)]),
        ("user-nam", "pitch-12", [("c", "Anh ơi bên mình có nhận đá giải 8 đội không ạ?", 6),
                                  ("m", "Có em, em nhắn số điện thoại anh tư vấn gói giải nhé.", 5)]),
        ("user-yen", "pitch-17", [("c", "Sân Thanh Trì bao giờ mở lại vậy chị?", 3)]),
    ]:
        p = pitches[pid][0]
        c, m = users[cid], users[p.manager_id]
        conv = Conversation(customer_id=cid, customer_name=c.full_name, manager_id=m.id, manager_name=m.full_name,
                            pitch_id=pid, pitch_name=p.name, created_date=now - timedelta(hours=thread[0][2]))
        db.add(conv)
        db.flush()
        for who, body, hours in thread:
            su = c if who == "c" else m
            at = now - timedelta(hours=hours)
            db.add(Message(conversation_id=conv.id, customer_id=cid, manager_id=m.id, sender_id=su.id,
                           sender_name=su.full_name, sender_role=su.app_role, body=body, created_date=at))
            conv.last_message, conv.last_message_at = body[:140], at
    db.flush()
