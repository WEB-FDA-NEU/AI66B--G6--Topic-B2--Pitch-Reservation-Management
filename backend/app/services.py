from __future__ import annotations

import re
import secrets
from datetime import timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import settings
from .db import IS_SQLITE
from .security import delete_user_sessions, hash_password, temporary_password
from .access import display
from .availability import slots, valid_date
from .models import (Booking, BookingSlot, Conversation, Message, Payment, Pitch, PitchSchedule, Report,
                     Review, User, Warning, WarningResponse, new_id)
from .rules import (SUSPENDED_MESSAGE, ApiError, account_link, add_warning, audit, booking_when,
                    cancel_booking_record, format_vnd, lock_booking, lock_bookings, notify,
                    open_report_exists, pitch_bookable,
                    pitch_closed_message, pitch_label, refund_booking_payment, release_holds_on_suspension,
                    reschedule_block_reason, sentence, validate_images, wallet_for, wallet_move,
                    PITCH_TEXT_LIMITS, validate_price, validate_text_limits)
from .timeutil import add_days, iso, local_to_utc, today_local, utcnow

CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _fold(value: Any) -> str:
    import unicodedata
    s = unicodedata.normalize("NFD", str(value or ""))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s.replace("đ", "d").replace("Đ", "d").lower()


def _booking(db: Session, booking_id: Any) -> Booking | None:
    return db.get(Booking, str(booking_id)) if booking_id else None


# ======================================================================== sân
def get_availability(db: Session, u: User | None, p: dict) -> dict:
    today = today_local()
    return {"slots": slots(db, p.get("pitch_id"), p.get("local_date")),
            "selectable_dates": [add_days(today, i) for i in range(settings.get(db, "booking_advance_days") + 1)]}


def search_pitches(db: Session, u: User | None, p: dict) -> dict:
    pitches = [x for x in db.scalars(select(Pitch)).all() if pitch_bookable(db, x)]
    q, location, ptype = _text(p.get("q")), _text(p.get("location")), _text(p.get("pitchType"))
    date = p.get("date") if valid_date(p.get("date")) else None
    time = p.get("time") if isinstance(p.get("time"), str) and re.match(r"^\d\d:\d\d$", p.get("time") or "") else None
    if q:
        pitches = [x for x in pitches if _fold(q) in _fold(x.name)]
    if location:
        pitches = [x for x in pitches if _fold(location) in _fold(f"{x.district} {x.city} {x.address}")]
    if ptype:
        pitches = [x for x in pitches if x.type == ptype]
    results = []
    for pitch in pitches:
        day = slots(db, pitch.id, date, pitch) if date else []
        avail = [s for s in day if s["state"] == "available" and (not time or s["start"] >= time)]
        if date and time and not any(s["start"] == time and s["state"] == "available" for s in day):
            continue
        first_available = next((s for s in day if s["state"] == "available"), None)
        results.append({**display(db, "Pitch", pitch, u),
                        "available_count": len(avail) if date else None,
                        "price_on_date": (first_available or (day[0] if day else {})).get("price_vnd", pitch.base_price_vnd),
                        "next_slot": _next_slot(db, pitch, date) if date and not avail else None})
    return {"results": results, "total": len(results), "filtered_by_availability": bool(date)}


def _next_slot(db: Session, pitch: Pitch, from_date: str) -> dict | None:
    today = today_local()
    start = max(from_date, today)
    last = add_days(today, settings.get(db, "booking_advance_days"))
    day = start
    while day <= last:
        hit = next((s for s in slots(db, pitch.id, day, pitch) if s["state"] == "available"), None)
        if hit:
            return {"local_date": day, "start": hit["start"], "price_vnd": hit["price_vnd"]}
        day = add_days(day, 1)
    return None


def next_available(db: Session, u: User | None, p: dict) -> dict:
    today = today_local()
    for i in range(settings.get(db, "booking_advance_days") + 1):
        day = add_days(today, i)
        if any(s["state"] == "available" for s in slots(db, p.get("pitch_id"), day)):
            return {"local_date": day}
    return {"local_date": None}


def create_pitch_with_schedule(db: Session, u: User | None, p: dict) -> dict:
    data = p.get("pitch") if isinstance(p.get("pitch"), dict) else {}
    request_id = p.get("request_id") if isinstance(p.get("request_id"), str) else ""
    if not u or u.app_role != "manager" or u.status == "suspended":
        raise ApiError("Chỉ chủ sân đang hoạt động có thể tạo sân.", 403)
    if not request_id or len(request_id) > 100:
        raise ApiError("Yêu cầu tạo sân không hợp lệ.")
    existing = db.scalars(select(Pitch).where(Pitch.manager_id == u.id, Pitch.creation_request_id == request_id)).first()
    if existing:
        return {"pitch": display(db, "Pitch", existing, u)}

    def normal(v: Any) -> str:
        return re.sub(r"\s+", " ", str(v or "").strip()).lower()

    ot, ct = data.get("open_time") or "", data.get("close_time") or ""
    if (not normal(data.get("name")) or not normal(data.get("address"))
            or not re.match(r"^\d\d:00$", ot) or not re.match(r"^\d\d:00$", ct)
            or ot < "06:00" or ct > "22:00" or ot >= ct):
        raise ApiError("Thông tin sân hoặc giờ hoạt động không hợp lệ.")
    validate_text_limits(data, PITCH_TEXT_LIMITS)
    price = validate_price(data.get("base_price_vnd"), "Giá cơ bản")
    for x in db.scalars(select(Pitch).where(Pitch.manager_id == u.id)).all():
        if normal(x.name) == normal(data.get("name")) and normal(x.address) == normal(data.get("address")):
            raise ApiError("Bạn đã có sân cùng tên tại địa chỉ này.", 409)
    if "images" in data and data["images"] is not None:
        validate_images(data["images"])
    if data.get("type") not in (None, "5v5", "7v7", "11v11"):
        raise ApiError("Loại sân không hợp lệ.")
    facilities = data.get("facilities") if isinstance(data.get("facilities"), list) else []
    pitch = Pitch(id=new_id(), name=str(data["name"]).strip(), type=data.get("type") or "5v5",
                  base_price_vnd=int(price), city=_text(data.get("city")) or None,
                  district=_text(data.get("district")) or None, address=str(data["address"]).strip(),
                  open_time=ot, close_time=ct, facilities=[str(f)[:60] for f in facilities][:30],
                  rules=_text(data.get("rules")), images=data.get("images") or [], manager_id=u.id,
                  manager_name=u.full_name, status="active", slot_minutes=60, schedule_configured=True,
                  creation_request_id=request_id)
    db.add(pitch)
    db.flush()
    for weekday in range(7):
        db.add(PitchSchedule(pitch_id=pitch.id, manager_id=u.id, weekday=weekday, local_start=ot,
                             local_end=ct, price_vnd=int(price)))
    return {"pitch": display(db, "Pitch", pitch, u)}


def _pause_effects(db: Session, pitch: Pitch, reason: str) -> dict:
    now = utcnow()
    released = kept = 0
    for b in lock_bookings(db, Booking.pitch_id == pitch.id, Booking.status.in_(["pending", "confirmed"])):
        if b.status == "pending":
            refund = refund_booking_payment(db, b)
            cancel_booking_record(db, b, "pitch_paused", "Sân tạm dừng nhận đơn mới.", "manager")
            b.payment_status = "refunded" if refund else "cancelled"
            notify(db, b.customer_id, "Giữ chỗ đã được hủy",
                   f"{pitch_label(pitch.name)} vừa tạm dừng nhận đơn mới nên giữ chỗ {b.code} đã được hủy. "
                   "Bạn chưa bị trừ tiền. Mong bạn thông cảm và chọn sân khác còn trống.", f"/user/bookings/{b.id}")
            released += 1
        elif b.status == "confirmed" and b.ends_at > now:
            notify(db, b.customer_id, "Sân bạn đã đặt tạm dừng nhận đơn mới",
                   f"{pitch_label(pitch.name)} tạm dừng nhận đơn mới{f' ({reason})' if reason else ''}. "
                   f"Đơn {b.code} lúc {booking_when(b)} của bạn vẫn giữ nguyên, bạn đến sân theo lịch như bình thường.",
                   f"/user/bookings/{b.id}")
            kept += 1
    return {"released": released, "kept": kept}


def set_pitch_status(db: Session, u: User | None, p: dict) -> dict:
    pitch = db.get(Pitch, str(p.get("pitch_id") or ""))
    reason = _text(p.get("reason"))
    status = p.get("status")
    if not u or u.app_role != "manager" or not pitch or pitch.manager_id != u.id:
        raise ApiError("Bạn không có quyền thay đổi sân này.", 403)
    if status not in ("active", "paused"):
        raise ApiError("Trạng thái sân không hợp lệ.")
    if pitch.status == "banned":
        raise ApiError("Sân đã bị ngưng vĩnh viễn nên không thể mở lại.")
    if pitch.status == "suspended":
        raise ApiError("Sân đang bị quản trị viên tạm ngưng. Chỉ quản trị viên mới mở lại được sân này.")
    if pitch.status == status:
        raise ApiError("Sân đang tạm dừng nhận đơn." if status == "paused" else "Sân đang nhận đơn bình thường.")
    if len(reason) > 300:
        raise ApiError("Lời nhắn cho khách tối đa 300 ký tự.")
    pitch.status = status
    pitch.pause_reason = reason if status == "paused" else ""
    pitch.status_changed_at = utcnow()
    effects = _pause_effects(db, pitch, reason) if status == "paused" else {}
    audit(db, u, "pause_pitch" if status == "paused" else "resume_pitch", "Sân", pitch.id, reason)
    db.flush()
    return {"pitch": display(db, "Pitch", pitch, u), **effects}


# ======================================================================== giữ chỗ / thanh toán / hủy
def _new_code(db: Session) -> str:
    while True:
        code = "PP-" + "".join(secrets.choice(CODE_CHARS) for _ in range(6))
        if not db.scalars(select(Booking.id).where(Booking.code == code)).first():
            return code


def create_hold(db: Session, u: User | None, p: dict) -> dict:
    if not u or u.app_role != "customer" or u.status == "suspended":
        raise ApiError("Tài khoản không được phép đặt sân.", 403)
    if db.scalars(select(Booking.id).where(Booking.customer_id == u.id, Booking.status == "pending")).first():
        raise ApiError("Bạn đã có một đơn đang giữ chỗ. Hãy thanh toán hoặc hủy giữ chỗ đó trước.", 409)
    pitch = db.get(Pitch, str(p.get("pitch_id") or ""))
    if not pitch_bookable(db, pitch):
        raise ApiError(pitch_closed_message(db, pitch), 404 if pitch is None else 400)
    original = None
    if p.get("reschedule_from_id"):
        original = _booking(db, p["reschedule_from_id"])
        why = reschedule_block_reason(db, u, original)
        if why:
            raise ApiError(why)
        if original.pitch_id != pitch.id:
            raise ApiError("Đổi lịch chỉ áp dụng cho khung giờ khác của cùng sân.")
    credit = int(original.amount_vnd) if original else 0
    starts = p.get("start_times") if isinstance(p.get("start_times"), list) else [p.get("start_time")]
    local_date = p.get("local_date")
    today = today_local()
    advance = settings.get(db, "booking_advance_days")
    if not valid_date(local_date) or not today <= local_date <= add_days(today, advance):
        raise ApiError(f"Chỉ đặt được sân từ hôm nay đến {advance} ngày tới. Vui lòng chọn ngày khác.")
    available = slots(db, pitch.id, local_date, pitch)
    by_start = {s["start"]: s for s in available}
    chosen = [by_start.get(s) if isinstance(s, str) else None for s in starts]
    valid = (0 < len(starts) <= 16 and len(set(map(str, starts))) == len(starts)
             and all(c and c["state"] == "available" and (i == 0 or chosen[i - 1]["end"] == c["start"])
                     for i, c in enumerate(chosen)))
    if not valid:
        raise ApiError("Các khung giờ phải còn trống và liền kề. Vui lòng chọn lại.", 409)
    amount = sum(int(c["price_vnd"]) for c in chosen)
    wallet = wallet_for(db, u.id)
    if (wallet.balance_vnd if wallet else 0) + credit < amount:
        raise ApiError("Số dư ví không đủ để giữ các khung giờ đã chọn.")
    first, last = chosen[0], chosen[-1]
    start_at, end_at = local_to_utc(local_date, first["start"]), local_to_utc(local_date, last["end"])
    b = Booking(id=new_id(), code=_new_code(db), pitch_id=pitch.id, pitch_name=pitch.name, pitch_type=pitch.type,
                pitch_address=pitch.address, booked_facilities=list(pitch.facilities or []), booked_rules=pitch.rules or "",
                manager_id=pitch.manager_id, customer_id=u.id,
                customer_name=u.full_name, local_date=local_date, start_time=first["start"],
                slot_starts=list(starts), slot_label=f"{first['start']} – {last['end']}",
                starts_at=start_at, ends_at=end_at, amount_vnd=amount, status="pending", payment_status="pending",
                hold_expires_at=min(utcnow() + timedelta(minutes=settings.get(db, "hold_minutes")), start_at),
                reschedule_count=1 if original else 0, reschedule_from_id=original.id if original else None)
    db.add(b)
    for c in chosen:
        db.add(BookingSlot(booking_id=b.id, pitch_id=pitch.id, local_date=local_date, start_time=c["start"]))
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ApiError("Khung giờ vừa có người khác giữ hoặc bạn đã có đơn đang giữ chỗ. Vui lòng chọn lại.", 409)
    return {"booking": display(db, "Booking", b, u)}


def pay_booking(db: Session, u: User | None, p: dict) -> dict:
    b = _booking(db, p.get("booking_id"))
    if b:
        locked = {x.id: x for x in lock_bookings(db, Booking.id.in_([i for i in (b.id, b.reschedule_from_id) if i]))}
        b = locked.get(b.id)
    if not b or not u or b.customer_id != u.id or b.status != "pending":
        raise ApiError("Đơn không còn hợp lệ.", 409)
    if b.hold_expires_at and b.hold_expires_at <= utcnow():
        raise ApiError("Thời gian giữ chỗ đã hết. Vui lòng chọn lại khung giờ.", 409)
    if b.starts_at <= utcnow():
        raise ApiError("Giờ sân đã bắt đầu; không thể thanh toán đơn này.")
    pitch = db.get(Pitch, b.pitch_id)
    if not pitch_bookable(db, pitch):
        raise ApiError(pitch_closed_message(db, pitch))
    original = locked.get(b.reschedule_from_id) if b.reschedule_from_id else None
    if b.reschedule_from_id:
        why = reschedule_block_reason(db, u, original)
        if why:
            raise ApiError(f"Không thể hoàn tất đổi lịch: {why[0].lower()}{why[1:]} "
                           "Bạn có thể hủy giữ chỗ mới để giữ nguyên đơn cũ.")
    wallet = wallet_for(db, u.id, lock=True)
    if not wallet or wallet.balance_vnd + (original.amount_vnd if original else 0) < b.amount_vnd:
        raise ApiError("Số dư ví không đủ để thanh toán đơn này.")
    now = utcnow()
    changed = db.execute(update(Booking).where(Booking.id == b.id, Booking.status == "pending")
                         .values(status="confirmed", payment_status="paid", paid_at=now, updated_date=now)).rowcount
    if changed != 1:
        raise ApiError("Đơn không còn hợp lệ.", 409)
    db.refresh(b)
    if original:
        refund_booking_payment(db, original)
        cancel_booking_record(db, original, "rescheduled", f"Đổi lịch sang đơn {b.code}.", "customer")
        original.payment_status = "refunded"
        original.rescheduled_to_id = b.id
    wallet_move(db, u.id, -b.amount_vnd, "payment", b.id)
    wallet_move(db, b.manager_id, b.amount_vnd, "payout", b.id)
    db.add(Payment(booking_id=b.id, customer_id=b.customer_id, manager_id=b.manager_id, pitch_id=b.pitch_id,
                   amount_vnd=b.amount_vnd, status="paid", paid_at=now))
    if original:
        notify(db, b.customer_id, "Đổi lịch thành công",
               f"Đơn {original.code} đã được hủy và hoàn {format_vnd(original.amount_vnd)} vào ví. "
               f"Lịch mới của bạn là đơn {b.code} lúc {booking_when(b)}.", f"/user/bookings/{b.id}", "bookings")
        notify(db, b.manager_id, "Khách đã đổi lịch",
               f"{b.customer_name or 'Khách hàng'} đã đổi đơn {original.code} ({booking_when(original)}) "
               f"sang đơn {b.code} lúc {booking_when(b)}.", f"/manager/pitches/{b.pitch_id}/bookings", "bookings")
    else:
        notify(db, b.customer_id, "Đặt sân thành công",
               f"Đơn {b.code} tại {pitch_label(b.pitch_name, True)} lúc {booking_when(b)} đã được thanh toán "
               f"{format_vnd(b.amount_vnd)}. Khi tới sân, bạn chỉ cần đọc mã đơn cho chủ sân.", f"/user/bookings/{b.id}",
               "bookings")
        notify(db, b.manager_id, "Có đơn đặt sân mới",
               f"{b.customer_name or 'Khách hàng'} đã đặt {pitch_label(b.pitch_name, True)} lúc {booking_when(b)} "
               f"(đơn {b.code}, {format_vnd(b.amount_vnd)}).", f"/manager/pitches/{b.pitch_id}/bookings", "bookings")
    db.flush()
    return {"booking": display(db, "Booking", b, u), "rescheduled_from": original.id if original else None}


def cancel_booking(db: Session, u: User | None, p: dict) -> dict:
    b = lock_booking(db, p.get("booking_id"))
    now = utcnow()
    allowed = (b and u and (u.app_role == "admin" or u.id in (b.customer_id, b.manager_id))
               and b.status in ("confirmed", "pending")
               and not (b.status == "pending" and u.id != b.customer_id)
               and not (b.status == "confirmed" and u.app_role == "customer"
                        and b.starts_at - now < timedelta(hours=settings.get(db, "cancellation_notice_hours"))))
    if not allowed:
        raise ApiError("Đơn không đủ điều kiện hủy.", 409)
    if b.status == "confirmed" and b.starts_at <= now:
        raise ApiError("Trận đã bắt đầu nên không thể hủy và hoàn tiền đơn này.", 409)
    reason = _text(p.get("reason"))[:500]
    if b.status == "confirmed" and u.id != b.customer_id and not reason:
        raise ApiError("Vui lòng nhập lý do hủy đơn.")
    refund = refund_booking_payment(db, b)
    was_hold = b.status == "pending"
    ctype = "hold_released" if was_hold else "admin" if u.app_role == "admin" else "manager" if u.id == b.manager_id else "customer"
    cancel_booking_record(db, b, ctype, reason, u.app_role)
    b.payment_status = "refunded" if refund else "cancelled"
    if ctype == "customer" and refund:
        from .moderation import flag_cancellation_pattern
        flag_cancellation_pattern(db, b.customer_id)
    if u.app_role == "admin":
        audit(db, u, "cancel_booking", "Đơn đặt sân", b.id, b.cancel_reason,
              f"{b.code} · {b.pitch_name} · {b.customer_name or 'Khách hàng'}")
    if not was_hold:
        why = f" Lý do: {sentence(b.cancel_reason)}" if b.cancel_reason else ""
        where = f"{pitch_label(b.pitch_name, True)} lúc {booking_when(b)}"
        by = "Quản trị viên" if u.app_role == "admin" else "Chủ sân" if u.id == b.manager_id else (b.customer_name or "Khách hàng")
        if u.id != b.customer_id:
            notify(db, b.customer_id, "Đơn đặt sân đã hủy",
                   f"{by} đã hủy đơn {b.code} tại {where}.{why} "
                   f"{f'{format_vnd(refund.amount_vnd)} đã được hoàn đủ vào ví của bạn.' if refund else ''}".strip(),
                   f"/user/bookings/{b.id}")
        if u.id != b.manager_id:
            notify(db, b.manager_id, "Đơn đặt sân đã hủy",
                   f"{by} đã hủy đơn {b.code} tại {where}.{why} "
                   f"{f'Đã hoàn {format_vnd(refund.amount_vnd)} cho khách.' if refund else ''}".strip(),
                   f"/manager/pitches/{b.pitch_id}/bookings",
                   "bookings" if u.id == b.customer_id else None)
    db.flush()
    return {"booking": display(db, "Booking", b, u), "refund": refund.to_dict() if refund else None}


def submit_review(db: Session, u: User | None, p: dict) -> dict:
    b = _booking(db, p.get("booking_id"))
    if b and u and b.customer_id == u.id and db.scalars(select(Review.id).where(Review.booking_id == b.id)).first():
        raise ApiError("Bạn đã đánh giá đơn này.", 409)
    if not b or not u or b.customer_id != u.id or b.status != "completed":
        raise ApiError("Đơn chưa đủ điều kiện đánh giá.")
    try:
        rating = int(p.get("rating"))
    except (TypeError, ValueError):
        rating = 0
    body = p.get("body")
    if not 1 <= rating <= 5 or str(p.get("rating")) not in {str(rating), f"{rating}.0"} or not isinstance(body, str) or len(body.strip()) > 800:
        raise ApiError("Đánh giá cần từ 1 đến 5 sao và tối đa 800 ký tự.")
    review = Review(booking_id=b.id, pitch_id=b.pitch_id, customer_id=u.id, customer_name=u.full_name,
                    rating=rating, body=body.strip())
    db.add(review)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ApiError("Bạn đã đánh giá đơn này.", 409)
    return {"review": review.to_dict()}


# ======================================================================== tin nhắn, cảnh cáo, khiếu nại
SUPPORT_ID = "support"
SUPPORT_NAME = "Quản trị viên Pitch Point"


def _support_conversation(db: Session, user: User) -> Conversation:
    c = db.scalars(select(Conversation).where(Conversation.kind == "support", Conversation.customer_id == user.id)).first()
    if not c:
        c = Conversation(id=new_id(), kind="support", customer_id=user.id, customer_name=user.full_name or user.email,
                         manager_id=SUPPORT_ID, manager_name=SUPPORT_NAME, pitch_id="", pitch_name=None)
        db.add(c)
        if IS_SQLITE:
            db.flush()
            return c
        try:
            with db.begin_nested():
                db.flush()
        except IntegrityError:
            c = db.scalars(select(Conversation).where(Conversation.kind == "support",
                                                      Conversation.customer_id == user.id)).first()
    return c


def send_message(db: Session, u: User | None, p: dict, start: bool = False) -> dict:
    body = _text(p.get("body"))
    c = db.get(Conversation, str(p.get("conversation_id"))) if p.get("conversation_id") else None
    if start and u and body and len(body) <= 2000 and (p.get("to_admin") or p.get("user_id")):
        if u.app_role == "admin":
            target = db.get(User, str(p.get("user_id") or ""))
            if not target or target.app_role == "admin":
                raise ApiError("Không tìm thấy người dùng để nhắn tin.", 404)
            c = _support_conversation(db, target)
        elif p.get("to_admin"):
            c = _support_conversation(db, u)
    elif start and u and body and len(body) <= 2000:
        booking = _booking(db, p.get("booking_id"))
        pitch = db.get(Pitch, booking.pitch_id if booking else str(p.get("pitch_id") or ""))
        customer_id = booking.customer_id if booking else (u.id if u.app_role == "customer" else None)
        allowed = pitch and customer_id and (
            (u.app_role == "customer" and customer_id == u.id)
            or (u.app_role == "manager" and booking and booking.manager_id == u.id and pitch.manager_id == u.id))
        if allowed:
            c = db.scalars(select(Conversation).where(Conversation.customer_id == customer_id,
                                                      Conversation.manager_id == pitch.manager_id,
                                                      Conversation.pitch_id == pitch.id)).first()
            if not c:
                customer, manager = db.get(User, customer_id), db.get(User, pitch.manager_id)
                c = Conversation(id=new_id(), customer_id=customer_id,
                                 customer_name=(customer.full_name if customer else None) or (booking.customer_name if booking else None),
                                 manager_id=pitch.manager_id,
                                 manager_name=(manager.full_name if manager else None) or pitch.manager_name,
                                 pitch_id=pitch.id, pitch_name=pitch.name)
                db.add(c)
                db.flush()
    if u and (not body or len(body) > 2000):
        raise ApiError("Tin nhắn phải có từ 1 đến 2000 ký tự.")
    support = bool(c and c.kind == "support")
    allowed = bool(u and c and (u.id == c.customer_id or (u.app_role == "admin" if support else u.id == c.manager_id)))
    if not allowed:
        raise ApiError("Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này.", 403)
    m = Message(id=new_id(), conversation_id=c.id, customer_id=c.customer_id, manager_id=c.manager_id,
                sender_id=u.id, sender_name=u.full_name or u.email, sender_role=u.app_role, body=body)
    db.add(m)
    db.flush()
    c.last_message = body[:140]
    c.last_message_at = m.created_date
    title = f"Tin nhắn mới từ {m.sender_name}"
    if support and u.app_role == "admin":
        target = db.get(User, c.customer_id)
        title = f"Tin nhắn mới từ {SUPPORT_NAME}"
        link = "/manager/messages" if target and target.app_role == "manager" else "/user/messages"
        notify(db, c.customer_id, title, body[:140], f"{link}?conversationId={c.id}", "messages")
    elif support:
        for admin in db.scalars(select(User).where(User.app_role == "admin")).all():
            notify(db, admin.id, title, body[:140], f"/admin/messages?conversationId={c.id}", "messages")
    else:
        recipient = c.manager_id if u.id == c.customer_id else c.customer_id
        destination = "/manager/messages" if u.id == c.customer_id else "/user/messages"
        if recipient != u.id:
            notify(db, recipient, title, body[:140], f"{destination}?conversationId={c.id}", "messages")
    return {"message": m.to_dict(), "conversation_id": c.id}


def warn_customer(db: Session, u: User | None, p: dict) -> dict:
    c = db.get(Conversation, str(p.get("conversation_id") or ""))
    target = db.get(User, c.customer_id) if c else None
    reason = _text(p.get("reason"))
    if not u or u.app_role != "manager" or not c or c.manager_id != u.id or not target or target.id == u.id:
        raise ApiError("Bạn không có quyền cảnh cáo trong cuộc trò chuyện này.", 403)
    if not reason or len(reason) > 500:
        raise ApiError("Vui lòng nhập nội dung cảnh cáo (tối đa 500 ký tự).")
    w = add_warning(db, u, target, reason, c.id)
    db.flush()
    return {"warning": w.to_dict()}


def respond_warning(db: Session, u: User | None, p: dict) -> dict:
    w = db.get(Warning, str(p.get("warning_id") or ""))
    body = _text(p.get("body"))
    if not u or not w or w.recipient_id != u.id:
        raise ApiError("Không tìm thấy cảnh cáo của bạn.", 404)
    if not body or len(body) > 1000:
        raise ApiError("Vui lòng nhập phản hồi (tối đa 1000 ký tự).")
    resp = WarningResponse(warning_id=w.id, author_id=u.id, body=body)
    db.add(resp)
    db.flush()
    issuer = db.get(User, w.issuer_id)
    c = db.get(Conversation, w.conversation_id) if w.conversation_id else None
    if c and c.customer_id == u.id and c.manager_id == w.issuer_id:
        text = f"Phản hồi cảnh cáo: {body}"
        db.add(Message(conversation_id=c.id, customer_id=c.customer_id, manager_id=c.manager_id, sender_id=u.id,
                       sender_name=u.full_name or u.email, sender_role=u.app_role, body=text))
        c.last_message = text[:140]
        c.last_message_at = resp.created_date
    link = f"/manager/messages?conversationId={c.id}" if c and issuer and issuer.app_role == "manager" else "/notifications"
    notify(db, w.issuer_id, f"Phản hồi cảnh cáo từ {u.full_name or u.email}", body, link)
    return {"response": resp.to_dict()}


def submit_appeal(db: Session, u: User | None, p: dict) -> dict:
    body = _text(p.get("body"))
    if not u or u.status != "suspended":
        raise ApiError("Chỉ tài khoản đang tạm khóa mới cần gửi khiếu nại.")
    if not 10 <= len(body) <= 1000:
        raise ApiError("Nội dung khiếu nại cần từ 10 đến 1000 ký tự.")
    if open_report_exists(db, u.id, "account"):
        raise ApiError("Bạn đã có một khiếu nại đang chờ xử lý. Quản trị viên sẽ trả lời qua mục Thông báo.", 409)
    appeal = Report(target_type="account", target_id=u.id, target_name=u.full_name or u.email, reporter_id=u.id,
                    reporter_name=u.full_name or u.email, reporter_role=u.app_role,
                    reason="Khiếu nại tài khoản bị tạm khóa", details=body, status="open")
    db.add(appeal)
    db.flush()
    for admin in db.scalars(select(User).where(User.app_role == "admin")).all():
        notify(db, admin.id, f"Khiếu nại mới từ {appeal.reporter_name}", body[:140], "/admin/reports", "reports")
    return {"appeal": appeal.to_dict()}


# ======================================================================== quản trị
def _suspension_effects(db: Session, pitch: Pitch) -> dict:
    now = utcnow()
    cancelled = refunded = 0
    for b in lock_bookings(db, Booking.pitch_id == pitch.id, Booking.status.in_(["pending", "confirmed"])):
        hold = b.status == "pending"
        if not hold and not (b.status == "confirmed" and b.starts_at > now):
            continue
        refund = refund_booking_payment(db, b)
        cancel_booking_record(db, b, "pitch_suspended", "Sân tạm ngưng hoạt động theo quyết định của quản trị viên.", "admin")
        b.payment_status = "refunded" if refund else "cancelled"
        if refund:
            refunded += refund.amount_vnd
        notify(db, b.customer_id, "Giữ chỗ đã được hủy" if hold else "Đơn đặt sân đã hủy và hoàn tiền",
               (f"{pitch_label(pitch.name)} tạm ngưng hoạt động nên giữ chỗ {b.code} đã được hủy. Bạn chưa bị trừ tiền. "
                "Mong bạn thông cảm và chọn sân khác còn trống.") if hold else
               (f"Rất tiếc, {pitch_label(pitch.name, True)} tạm ngưng hoạt động nên đơn {b.code} lúc {booking_when(b)} "
                f"đã được hủy. {format_vnd(b.amount_vnd)} đã được hoàn đủ vào ví của bạn. "
                "Mong bạn thông cảm và chọn sân khác còn trống."),
               f"/user/bookings/{b.id}")
        cancelled += 1
    return {"cancelled": cancelled, "refunded": refunded}


def admin_action(db: Session, u: User | None, p: dict) -> dict:
    if not u or u.app_role != "admin":
        raise ApiError("Chỉ quản trị viên có quyền thực hiện.", 403)
    action = p.get("action")
    reason = _text(p.get("reason"))
    result: dict[str, Any] = {}
    entity_type = entity_id = None

    if action in ("warn_user", "suspend_user", "restore_user"):
        target = db.get(User, str(p.get("user_id") or ""))
        if not target:
            raise ApiError("Không tìm thấy tài khoản.", 404)
        if target.id == u.id or target.app_role == "admin":
            raise ApiError("Không thể thay đổi tài khoản quản trị viên từ chức năng này.", 403)
        if action == "warn_user" and (not reason or len(reason) > 500):
            raise ApiError("Vui lòng nhập nội dung cảnh cáo (tối đa 500 ký tự).")
        if action == "suspend_user" and target.status == "suspended":
            raise ApiError("Tài khoản này đang bị tạm khóa.")
        if action == "restore_user" and target.status != "suspended":
            raise ApiError("Tài khoản này đang hoạt động.")
        if action == "suspend_user":
            target.status = "suspended"
            result["released_holds"] = release_holds_on_suspension(db, target)
            notify(db, target.id, "Tài khoản đã bị tạm khóa",
                   (f"Lý do: {sentence(reason)} " if reason else "") + (
                       "Bạn tạm thời không thể quản lý sân và các sân của bạn ngừng nhận đơn mới. Các đơn đã xác nhận "
                       "vẫn giữ nguyên. Bạn có thể gửi khiếu nại trong trang Tài khoản." if target.app_role == "manager" else
                       "Bạn tạm thời không thể đặt sân hay thao tác trên hệ thống. Đơn đang giữ chỗ đã được hủy; các đơn "
                       "đã xác nhận vẫn giữ nguyên và bạn vẫn đến sân theo lịch. Bạn có thể gửi khiếu nại trong trang Tài khoản."),
                   account_link(target))
        elif action == "restore_user":
            target.status = "active"
            for appeal in db.scalars(select(Report).where(Report.target_type == "account", Report.reporter_id == target.id,
                                                          Report.status.in_(["open", "reviewing"]))).all():
                appeal.status = "resolved"
                appeal.decision = reason or "Quản trị viên đã mở khóa tài khoản."
            notify(db, target.id, "Tài khoản đã được mở khóa",
                   f"Quản trị viên đã khôi phục tài khoản của bạn.{f' Ghi chú: {sentence(reason)}' if reason else ''} "
                   "Bạn có thể sử dụng hệ thống bình thường.", "/notifications")
        else:
            add_warning(db, u, target, reason)
        entity_type, entity_id = "Tài khoản", target.id

    elif action in ("assign_report", "resolve_report"):
        report = db.get(Report, str(p.get("report_id") or ""))
        if not report:
            raise ApiError("Không tìm thấy báo cáo.", 404)
        if action == "assign_report":
            if report.status not in ("open", "reviewing"):
                raise ApiError("Báo cáo đã kết luận, không thể nhận xử lý lại.")
            report.status = "reviewing"
            report.assigned_to = u.id
        else:
            decision = _text(p.get("decision"))
            if p.get("status") not in ("resolved", "dismissed") or not decision:
                raise ApiError("Vui lòng chọn kết luận và nhập nội dung.")
            changed = report.status != p["status"] or (report.decision or "").strip() != decision
            report.status = p["status"]
            report.decision = decision
            result["notification_sent"] = bool(changed and db.get(User, report.reporter_id))
            if result["notification_sent"]:
                notify(db, report.reporter_id, "Báo cáo đã có kết luận", decision, "/notifications")
            reason = decision
        entity_type, entity_id = "Báo cáo", report.id

    elif action in ("suspend_pitch", "restore_pitch"):
        pitch = db.get(Pitch, str(p.get("pitch_id") or ""))
        permanent = p.get("permanent") is True
        if not pitch:
            raise ApiError("Không tìm thấy sân.", 404)
        if pitch.status == "banned":
            raise ApiError("Sân đã bị ngưng vĩnh viễn nên không thể thay đổi.")
        if action == "suspend_pitch" and pitch.status == "suspended" and not permanent:
            raise ApiError("Sân này đang bị tạm ngưng.")
        if action == "suspend_pitch" and (not reason or len(reason) > 500):
            raise ApiError("Vui lòng nhập lý do tạm ngưng (tối đa 500 ký tự).")
        if action == "restore_pitch" and pitch.status != "suspended":
            raise ApiError("Sân này không bị tạm ngưng.")
        pitch.status_changed_at = utcnow()
        if action == "suspend_pitch":
            pitch.status = "banned" if permanent else "suspended"
            pitch.suspension = {"reason": reason, "permanent": permanent, "by": u.id, "at": iso(utcnow())}
            pitch.pause_reason = ""
            effects = _suspension_effects(db, pitch)
            result.update(effects)
            summary = (f"{effects['cancelled']} đơn sắp tới tại sân đã được hủy và hoàn tiền đầy đủ cho khách, "
                       "bạn không cần tự xử lý.") if effects["cancelled"] else "Sân không có đơn sắp tới nào bị ảnh hưởng."
            notify(db, pitch.manager_id,
                   "Sân của bạn đã ngừng hoạt động" if permanent else "Sân của bạn đang tạm ngưng hoạt động",
                   (f"{pitch_label(pitch.name)} đã bị ngưng vĩnh viễn trên Pitch Point. Lý do: {sentence(reason)} {summary} "
                    "Sân sẽ không nhận đơn mới nữa. Cảm ơn bạn đã đồng hành cùng Pitch Point.") if permanent else
                   (f"Quản trị viên đã tạm ngưng {pitch_label(pitch.name, True)}. Lý do: {sentence(reason)} {summary} "
                    "Sau khi vấn đề được khắc phục, quản trị viên sẽ xem xét mở lại sân. Cảm ơn bạn đã hợp tác."),
                   "/manager/pitches")
        else:
            pitch.status = "active"
            pitch.suspension = None
            notify(db, pitch.manager_id, "Sân của bạn đã được mở lại",
                   f"Quản trị viên đã mở lại {pitch_label(pitch.name, True)}. Sân đã nhận đơn đặt mới trở lại. "
                   "Các đơn đã hủy trong thời gian tạm ngưng không được khôi phục.", "/manager/pitches")
        entity_type, entity_id = "Sân", pitch.id

    elif action == "reset_password":
        target = db.get(User, str(p.get("user_id") or ""))
        if not target:
            raise ApiError("Không tìm thấy tài khoản.", 404)
        if target.app_role == "admin":
            raise ApiError("Không đặt lại mật khẩu quản trị viên từ chức năng này.", 403)
        temp = temporary_password()
        target.password_hash = hash_password(temp)
        target.must_change_password = True
        delete_user_sessions(db, target.id)
        for req in db.scalars(select(Report).where(Report.target_type == "password_reset", Report.target_id == target.id,
                                                   Report.status.in_(["open", "reviewing"]))).all():
            req.status, req.decision = "resolved", "Quản trị viên đã đặt lại mật khẩu tạm."
        notify(db, target.id, "Mật khẩu đã được đặt lại",
               "Quản trị viên đã đặt lại mật khẩu tạm cho tài khoản của bạn. Hãy đăng nhập bằng mật khẩu tạm "
               "quản trị viên cung cấp rồi đặt mật khẩu mới.", "/notifications")
        result["temporary_password"] = temp
        entity_type, entity_id, reason = "Tài khoản", target.id, reason or "Đặt lại mật khẩu tạm"

    elif action in ("save_settings", "save_setting"):
        try:
            values = settings.validate(p.get("settings"))
        except ValueError as exc:
            raise ApiError(str(exc)) from exc
        changed = settings.save(db, u.full_name or u.email, values)
        labels = {k: settings.DEFINITIONS[k] for k in changed}
        reason = "; ".join(f"{labels[k].label}: {old} → {new} {labels[k].unit}".strip() for k, (old, new) in changed.items())
        result["settings"] = settings.describe(db)
        result["changed"] = len(changed)
        if not changed:
            return result
        action = "save_settings"
        entity_type, entity_id = "Quy định hệ thống", None
    else:
        raise ApiError("Thao tác này hiện chưa được hỗ trợ.")

    audit(db, u, action, entity_type, entity_id, reason)
    db.flush()
    return result


FUNCTIONS = {
    "syncBookings": (lambda db, u, p: {}, True),
    "getAvailability": (get_availability, True),
    "searchPitches": (search_pitches, True),
    "nextAvailableDate": (next_available, True),
    "submitAppeal": (submit_appeal, True),
    "createPitchWithSchedule": (create_pitch_with_schedule, False),
    "setPitchStatus": (set_pitch_status, False),
    "createHold": (create_hold, False),
    "payBooking": (pay_booking, False),
    "cancelBooking": (cancel_booking, False),
    "submitReview": (submit_review, False),
    "sendMessage": (lambda db, u, p: send_message(db, u, p, start=False), False),
    "startMessage": (lambda db, u, p: send_message(db, u, p, start=True), False),
    "warnCustomer": (warn_customer, False),
    "respondWarning": (respond_warning, False),
    "adminAction": (admin_action, False),
}

__all__ = ["FUNCTIONS", "SUSPENDED_MESSAGE"]
