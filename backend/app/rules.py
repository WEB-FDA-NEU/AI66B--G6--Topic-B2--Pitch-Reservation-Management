from __future__ import annotations

import re
from datetime import timedelta
from typing import Any
from urllib.parse import quote

from sqlalchemy import and_, delete, or_, select, update
from sqlalchemy.orm import Session

from . import config, settings
from .models import (AuditEvent, Booking, BookingSlot, Message, Notification, Payment, Pitch, Refund, Report,
                     User, Wallet, WalletTransaction, Warning, new_id)
from .timeutil import utcnow


class ApiError(Exception):

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


NOT_FOUND_MESSAGE = "Không tìm thấy nội dung bạn cần. Có thể nội dung đã bị xóa hoặc đường dẫn chưa đúng."
SUSPENDED_MESSAGE = ("Tài khoản của bạn đang tạm khóa nên chưa thể thực hiện thao tác này. "
                     "Bạn vẫn có thể gửi khiếu nại tới quản trị viên trong trang Tài khoản.")
LOGIN_REQUIRED = "Vui lòng đăng nhập."


# ---------------------------------------------------------------- định dạng chữ
def format_vnd(value: int | float | None) -> str:
    return f"{int(value or 0):,}".replace(",", ".") + " ₫"


def sentence(text: str) -> str:
    return text if re.search(r"[.!?]$", text) else f"{text}."


def pitch_label(name: str | None, lower: bool = False) -> str:
    name = name or ""
    if re.match(r"^sân\s", name, re.IGNORECASE):
        return name
    return f"{'sân' if lower else 'Sân'} {name}"


def booking_when(b: Booking) -> str:
    return f"{'/'.join(reversed(b.local_date.split('-')))}, {b.slot_label}"


# ---------------------------------------------------------------- liên kết thông báo
_ROUTES = {
    "/": "index.html", "/search": "search.html", "/notifications": "notifications.html",
    "/user/messages": "messages.html", "/manager/messages": "messages.html", "/admin/messages": "messages.html",
    "/user/settings": "account-settings.html", "/manager/settings": "account-settings.html",
    "/settings": "settings.html", "/user/bookings": "booking-history.html",
    "/user/favorites": "favorite-pitches.html", "/user/payments": "payment-history.html",
    "/manager": "manager-dashboard.html", "/manager/pitches": "manager-pitches.html",
    "/manager/calendar": "manager-bookings.html", "/manager/revenue": "manager-revenue.html",
    "/admin": "admin-dashboard.html", "/admin/users": "admin-users.html",
    "/admin/pitch-managers": "admin-pitch-managers.html", "/admin/pitches": "admin-pitch-moderation.html",
    "/admin/bookings": "admin-finance.html", "/admin/reports": "admin-reports.html",
    "/admin/content": "admin-content.html", "/admin/activity-log": "admin-activity-log.html",
    "/admin/settings": "admin-settings.html",
}


def translate_link(link: str | None) -> str:
    if not link:
        return "notifications.html"
    if re.match(r"^https?://", link, re.I) or re.match(r"^[a-z0-9_-]+\.html(\?|#|$)", link, re.I):
        return link
    m = re.search(r"[?#]", link)
    raw, rest = (link, "") if not m else (link[:m.start()], link[m.start():])
    if raw in _ROUTES:
        return _ROUTES[raw] + rest
    patterns = [
        (r"^/user/bookings/([^/]+)$", "booking-details.html?id="),
        (r"^/(?:pitch|pitches)/([^/]+)$", "pitch-detail.html?id="),
        (r"^/(?:owner|owners)/([^/]+)$", "pitch-owner-profile.html?id="),
        (r"^/manager/pitches/([^/]+)/bookings$", "manager-bookings.html?pitchId="),
        (r"^/manager/pitches/([^/]+)/availability$", "pitch-availability.html?id="),
    ]
    for pattern, page in patterns:
        mm = re.match(pattern, raw)
        if mm:
            return page + quote(mm.group(1), safe="")
    return "notifications.html"


CTA_PAGES = set(
    "index search settings reset-password register add-pitch edit-pitch pitch-detail pitch-availability "
    "payment payment-history pitch-owner-profile notifications messages manager-revenue manager-pitches "
    "manager-dashboard manager-bookings login admin-settings booking-schedule admin-reports "
    "admin-pitch-moderation admin-pitch-managers admin-dashboard admin-content booking-details "
    "booking-confirmation admin-users booking-history booking-result forgot-password favorite-pitches "
    "admin-finance admin-activity-log account-settings 403 404 500".split())


def valid_content_link(value: Any) -> bool:
    if not value:
        return True
    if not isinstance(value, str):
        return False
    if re.match(r"^[a-z0-9-]+\.html(?:[?#]\S*)?$", value):
        return re.split(r"[?#]", value, maxsplit=1)[0][:-5] in CTA_PAGES
    return bool(re.match(r"^https://[^\s/$.?#].[^\s]*$", value))


# ---------------------------------------------------------------- thông báo, cảnh cáo, nhật ký
def notify(db: Session, recipient_id: str | None, title: str, body: str, link: str | None,
           category: str | None = None) -> None:
    recipient = db.get(User, recipient_id) if recipient_id else None
    if not recipient:
        return
    if category and not preference(recipient, f"notify_{category}"):
        return
    db.add(Notification(recipient_id=recipient_id, title=title, body=body,
                        link=translate_link(link), read=False))


def account_link(target: User | None) -> str:
    return "/manager/settings" if target and target.app_role == "manager" else "/user/settings"


def add_warning(db: Session, actor: User, target: User, reason: str, conversation_id: str | None = None) -> Warning:
    w = Warning(id=new_id(), recipient_id=target.id, issuer_id=actor.id, issuer_name=actor.full_name or actor.email,
                issuer_role=actor.app_role, reason=reason, conversation_id=conversation_id)
    db.add(w)
    notify(db, target.id, "Bạn nhận được cảnh cáo", reason, f"{account_link(target)}?warning={w.id}#warnings")
    return w


def audit(db: Session, actor: User, action: str, entity_type: str | None, entity_id: str | None,
          reason: str = "", target_name: str | None = None) -> None:
    db.add(AuditEvent(actor_id=actor.id, actor_name=actor.full_name, actor_email=actor.email,
                      actor_role=actor.app_role, action=action, entity_type=entity_type,
                      entity_id=entity_id, target_name=target_name, reason=reason or ""))


# ---------------------------------------------------------------- ví (sổ giao dịch)
def wallet_for(db: Session, user_id: str, lock: bool = False) -> Wallet | None:
    stmt = select(Wallet).where(Wallet.user_id == user_id)
    if lock:
        db.flush()
        stmt = stmt.with_for_update().execution_options(populate_existing=True)
    return db.scalars(stmt).first()


# ---------------------------------------------------------------- khóa dòng (chạy nhiều worker)
def lock_bookings(db: Session, *conditions) -> list[Booking]:
    db.flush()
    stmt = (select(Booking).where(*conditions).order_by(Booking.id)
            .with_for_update().execution_options(populate_existing=True))
    return list(db.scalars(stmt).all())


def lock_booking(db: Session, booking_id: Any) -> Booking | None:
    if not booking_id:
        return None
    rows = lock_bookings(db, Booking.id == str(booking_id))
    return rows[0] if rows else None


def wallet_move(db: Session, user_id: str, delta: int, kind: str, booking_id: str | None) -> None:
    w = wallet_for(db, user_id, lock=True)
    if not w:
        return
    w.balance_vnd = int(w.balance_vnd) + int(delta)
    db.add(WalletTransaction(wallet_id=w.id, user_id=user_id, amount_vnd=int(delta),
                             balance_after_vnd=w.balance_vnd, kind=kind, booking_id=booking_id))


# ---------------------------------------------------------------- đơn đặt sân
def cancel_booking_record(db: Session, b: Booking, cancel_type: str, reason: str, actor_role: str) -> None:
    b.status = "cancelled"
    b.cancel_type = cancel_type
    b.cancel_reason = reason or ""
    b.cancelled_by = actor_role
    b.cancelled_at = utcnow()
    db.execute(delete(BookingSlot).where(BookingSlot.booking_id == b.id))


def refund_booking_payment(db: Session, b: Booking) -> Refund | None:
    payment = db.scalars(select(Payment).where(Payment.booking_id == b.id, Payment.status == "paid")).first()
    if not payment:
        return None
    wallet_move(db, b.customer_id, b.amount_vnd, "refund", b.id)
    wallet_move(db, b.manager_id, -b.amount_vnd, "refund_payout", b.id)
    payment.status = "refunded"
    refund = Refund(id=new_id(), booking_id=b.id, payment_id=payment.id, customer_id=b.customer_id,
                    manager_id=b.manager_id, amount_vnd=b.amount_vnd, status="completed")
    db.add(refund)
    return refund


def sync(db: Session) -> None:
    now = utcnow()
    expired = db.scalars(select(Booking).where(Booking.status == "pending", Booking.hold_expires_at <= now)
                         .with_for_update(skip_locked=True).execution_options(populate_existing=True)).all()
    for b in expired:
        cancel_booking_record(db, b, "hold_expired", "Hết thời gian giữ chỗ.", "system")
        b.payment_status = "cancelled"
    db.execute(update(Booking).where(Booking.status == "confirmed", Booking.ends_at <= now)
               .values(status="completed", updated_date=now))
    db.flush()


def release_holds_on_suspension(db: Session, target: User) -> int:
    column = Booking.manager_id if target.app_role == "manager" else Booking.customer_id
    holds = lock_bookings(db, Booking.status == "pending", column == target.id)
    for b in holds:
        refund = refund_booking_payment(db, b)
        is_manager = target.app_role == "manager"
        cancel_booking_record(db, b, "manager_suspended" if is_manager else "account_suspended",
                              "Chủ sân đang tạm ngưng hoạt động." if is_manager else "Tài khoản đang bị tạm khóa.", "admin")
        b.payment_status = "refunded" if refund else "cancelled"
        if is_manager:
            notify(db, b.customer_id, "Giữ chỗ đã bị hủy",
                   f"Sân của đơn {b.code} tạm ngưng nhận đơn mới nên giữ chỗ đã được hủy. Bạn chưa bị trừ tiền.",
                   f"/user/bookings/{b.id}")
    return len(holds)


def manager_suspended(db: Session, pitch: Pitch | None) -> bool:
    if not pitch:
        return False
    m = db.get(User, pitch.manager_id)
    return bool(m and m.status == "suspended")


def pitch_bookable(db: Session, pitch: Pitch | None) -> bool:
    return bool(pitch and pitch.status == "active" and not manager_suspended(db, pitch))


def pitch_closed_message(db: Session, pitch: Pitch | None) -> str:
    if not pitch:
        return "Không tìm thấy sân."
    if pitch.status == "paused":
        return "Sân đang tạm dừng nhận đơn mới. Bạn có thể lưu sân để đặt lại khi sân mở cửa."
    if pitch.status == "suspended":
        return "Sân đang tạm ngưng hoạt động nên chưa nhận đơn mới."
    if pitch.status == "banned":
        return "Sân đã ngừng hoạt động trên Pitch Point."
    if manager_suspended(db, pitch):
        return "Sân đang tạm ngưng nhận đơn mới."
    return ""


def reschedule_block_reason(db: Session, u: User | None, b: Booking | None) -> str:
    hours = settings.get(db, "cancellation_notice_hours")
    if not b or not u or b.customer_id != u.id:
        return "Không tìm thấy đơn cần đổi lịch."
    if u.status == "suspended":
        return SUSPENDED_MESSAGE
    if b.status != "confirmed" or b.payment_status != "paid":
        return "Chỉ đơn đã thanh toán và chưa diễn ra mới đổi lịch được."
    if b.reschedule_from_id or int(b.reschedule_count or 0) >= 1:
        return ("Đơn này đã được đổi lịch một lần nên không đổi thêm được. "
                f"Bạn vẫn có thể hủy đơn nếu còn trước giờ đá ít nhất {hours} giờ.")
    if b.starts_at - utcnow() < timedelta(hours=hours):
        return f"Đơn chỉ đổi lịch được khi còn ít nhất {hours} giờ trước giờ đá."
    return ""


# ---------------------------------------------------------------- tùy chọn thông báo và quyền riêng tư
NOTIFY_CATEGORIES = {"bookings", "messages", "reports"}
PREFERENCE_KEYS = {
    "notify_bookings": bool,
    "notify_messages": bool,
    "notify_reports": bool,
    "show_phone": bool,
}


def preference(u: User | None, key: str) -> bool:
    prefs = (u.preferences if u else None) or {}
    value = prefs.get(key)
    return True if value is None else bool(value)


def clean_preferences(current: dict | None, incoming: Any) -> dict:
    if not isinstance(incoming, dict):
        raise ApiError("Tùy chọn không hợp lệ.")
    out = dict(current or {})
    for key, value in incoming.items():
        if key not in PREFERENCE_KEYS or not isinstance(value, bool):
            raise ApiError("Tùy chọn không hợp lệ.")
        out[key] = value
    return out


# ---------------------------------------------------------------- kiểm tra dữ liệu sân
def is_round_hour(v: Any) -> bool:
    return isinstance(v, str) and bool(re.match(r"^\d\d:00$", v)) and "06:00" <= v <= "22:00"


def validate_hours(open_time: Any, close_time: Any, label: str) -> None:
    if not is_round_hour(open_time) or not is_round_hour(close_time) or open_time >= close_time:
        raise ApiError(f"{label}: chọn giờ tròn từ 06:00 đến 22:00, giờ đóng cửa sau giờ mở cửa.")


def validate_price(value: Any, label: str) -> int:
    try:
        n = float(value)
    except (TypeError, ValueError, OverflowError):
        n = float("nan")
    if not (n == n) or not config.MIN_PRICE_VND <= n <= config.MAX_PRICE_VND:
        raise ApiError(f"{label}: giá mỗi giờ phải từ {format_vnd(config.MIN_PRICE_VND)} "
                       f"đến {format_vnd(config.MAX_PRICE_VND)}.")
    return int(n)


PITCH_TEXT_LIMITS = {"name": ("Tên sân", 150), "address": ("Địa chỉ", 300), "city": ("Thành phố", 100),
                     "district": ("Quận/huyện", 100), "rules": ("Nội quy", 2000), "description": ("Mô tả", 2000)}


def validate_text_limits(data: dict, limits: dict) -> None:
    for field, (label, maximum) in limits.items():
        value = data.get(field)
        if value is not None and len(str(value).strip()) > maximum:
            raise ApiError(f"{label} tối đa {maximum} ký tự.")


_IMAGE_RE = re.compile(r"^data:image/(jpeg|png|webp);base64,")
IMAGE_ERROR = "Ảnh sân không hợp lệ: tối đa 3 ảnh JPG, PNG hoặc WebP, mỗi ảnh dưới 450 KB."


def validate_images(images: Any) -> list:
    if not isinstance(images, list) or len(images) > config.PITCH_IMAGE_LIMIT:
        raise ApiError(IMAGE_ERROR)
    from .uploads import save_image, UPLOAD_DIR
    normalized = []
    for src in images:
        if not isinstance(src, str):
            raise ApiError(IMAGE_ERROR)
        if src.startswith("data:"):
            src = save_image(src)
        elif not re.fullmatch(r"/uploads/[0-9a-f]{64}\.(jpg|png|webp)", src) or not (UPLOAD_DIR / src.rsplit("/", 1)[-1]).is_file():
            raise ApiError(IMAGE_ERROR)
        normalized.append(src)
    images[:] = normalized
    return images


def owned_pitch(db: Session, u: User | None, pitch_id: Any) -> Pitch:
    pitch = db.get(Pitch, str(pitch_id)) if pitch_id else None
    if not u or not pitch or (u.app_role != "admin" and pitch.manager_id != u.id):
        raise ApiError("Bạn không có quyền thay đổi sân này.", 403)
    if pitch.status == "banned" and u.app_role != "admin":
        raise ApiError("Sân đã bị ngưng vĩnh viễn nên không thể chỉnh sửa.", 403)
    return pitch


def report_target_name(db: Session, target_type: str | None, target_id: str | None) -> str | None:
    if target_type == "pitch" and target_id:
        p = db.get(Pitch, target_id)
        return p.name if p else None
    if target_type == "user" and target_id:
        u = db.get(User, target_id)
        return u.full_name if u else None
    if target_type == "message" and target_id:
        m = db.get(Message, target_id)
        return f"Tin nhắn của {m.sender_name or 'người dùng'}" if m else None
    return None


def open_report_exists(db: Session, reporter_id: str, target_type: str, target_id: str | None = None) -> bool:
    stmt = select(Report.id).where(Report.reporter_id == reporter_id, Report.target_type == target_type,
                                   Report.status.in_(["open", "reviewing"]))
    if target_id is not None:
        stmt = stmt.where(Report.target_id == target_id)
    return db.scalars(stmt).first() is not None


__all__ = ["and_", "or_"]
