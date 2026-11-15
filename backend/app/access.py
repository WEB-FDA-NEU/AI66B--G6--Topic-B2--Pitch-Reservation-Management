from __future__ import annotations

from typing import Any

from sqlalchemy import false, or_, select, true
from sqlalchemy.orm import Session

from .models import (AuditEvent, Booking, ContentItem, Favorite, Pitch, Report, User, Warning,
                     WarningResponse)
from .rules import (SUSPENDED_MESSAGE, ApiError, manager_suspended, owned_pitch, preference, report_target_name,
                    valid_content_link, validate_hours, validate_images, validate_price,
                    PITCH_TEXT_LIMITS, validate_text_limits)
from .timeutil import parse_iso

PUBLIC_ENTITIES = {"Pitch", "PitchSchedule", "AvailabilityOverride", "Review"}
GUEST_READABLE = PUBLIC_ENTITIES | {"ContentItem", "User"}
PUBLIC_USER_FIELDS = ["id", "full_name", "app_role", "status", "phone", "created_date"]

ALLOWED_WRITES: dict[str, set[str]] = {
    "Favorite": {"create", "delete"},
    "Notification": {"update"},
    "Report": {"create", "update"},
    "Pitch": {"update"},
    "PitchSchedule": {"create", "update", "delete"},
    "AvailabilityOverride": {"create", "delete"},
    "ContentItem": {"create", "update", "delete"},
}


def is_admin(u: User | None) -> bool:
    return bool(u and u.app_role == "admin")


def read_scope(name: str, model: type, viewer: User | None):
    if name in PUBLIC_ENTITIES or is_admin(viewer):
        return true()
    uid = viewer.id if viewer else None
    if name == "ContentItem":
        return model.status == "published"
    if name == "User":
        return or_(model.id == uid, model.app_role == "manager")
    if uid is None:
        return false()
    if name in {"Booking", "Payment", "Refund", "Conversation", "Message"}:
        return or_(model.customer_id == uid, model.manager_id == uid)
    if name in {"Wallet", "Favorite"}:
        return model.user_id == uid
    if name == "Report":
        return model.reporter_id == uid
    if name == "Notification":
        return model.recipient_id == uid
    if name == "Warning":
        return or_(model.recipient_id == uid, model.issuer_id == uid)
    if name == "WarningResponse":
        mine = select(Warning.id).where(or_(Warning.recipient_id == uid, Warning.issuer_id == uid))
        return or_(model.author_id == uid, model.warning_id.in_(mine))
    return false()


def pick(data: dict, keys: list[str]) -> dict:
    return {k: data[k] for k in keys if k in data}


def display(db: Session, name: str, row: Any, viewer: User | None) -> dict:
    d = row.to_dict()

    def person(uid: str | None) -> str | None:
        u = db.get(User, uid) if uid else None
        return (u.full_name or u.email) if u else None

    if name == "User":
        if is_admin(viewer) or (viewer and viewer.id == row.id):
            return d
        public = pick(d, PUBLIC_USER_FIELDS)
        if not preference(row, "show_phone"):
            public.pop("phone", None)
        return public
    if name == "Report":
        d["target_name"] = d.get("target_name") or report_target_name(db, row.target_type, row.target_id)
    elif name == "Booking":
        from .models import Review
        d["manager_name"] = person(row.manager_id)
        d["reviewed"] = db.scalars(select(Review.id).where(Review.booking_id == row.id)).first() is not None
    elif name == "Pitch":
        d["manager_name"] = row.manager_name or person(row.manager_id)
        d["manager_suspended"] = manager_suspended(db, row)
        d.pop("creation_request_id", None)
    elif name == "Conversation":
        d["manager_name"] = row.manager_name or person(row.manager_id)
    elif name in {"Payment", "Refund"}:
        b = db.get(Booking, row.booking_id)
        p = db.get(Pitch, getattr(row, "pitch_id", None) or (b.pitch_id if b else None)) if (b or getattr(row, "pitch_id", None)) else None
        d["pitch_id"] = getattr(row, "pitch_id", None) or (b.pitch_id if b else None)
        d["pitch_name"] = (b.pitch_name if b else None) or (p.name if p else None)
        d["booking_code"] = b.code if b else None
        d["customer_name"] = (b.customer_name if b else None) or person(row.customer_id)
    elif name == "AuditEvent":
        actor = db.get(User, row.actor_id) if row.actor_id else None
        d["actor_email"] = row.actor_email or (actor.email if actor else None)
        if row.entity_type == "Sân" and row.entity_id:
            p = db.get(Pitch, row.entity_id)
            d["target_name"] = row.target_name or (p.name if p else None)
        elif row.entity_type == "Tài khoản" and row.entity_id:
            t = db.get(User, row.entity_id)
            d["target_name"] = row.target_name or (t.full_name if t else None)
            d["target_email"] = row.target_email or (t.email if t else None)
        elif row.entity_type == "Báo cáo" and row.entity_id:
            r = db.get(Report, row.entity_id)
            if r and not row.target_name:
                target = r.target_name or report_target_name(db, r.target_type, r.target_id)
                d["target_name"] = f"{target} · {r.reason or 'báo cáo'}" if target else (r.reason or "Báo cáo")
    return d


def authorize_write(db: Session, viewer: User | None, name: str, op: str, row: Any, data: dict) -> dict | None:
    if not viewer:
        raise ApiError("Vui lòng đăng nhập.", 401)
    if viewer.status == "suspended" and not (name == "Notification" and op == "update"):
        raise ApiError(SUSPENDED_MESSAGE, 403)
    if op not in ALLOWED_WRITES.get(name, set()):
        raise ApiError("Bạn không có quyền thực hiện thao tác này.", 403)

    if name == "ContentItem":
        if not is_admin(viewer):
            raise ApiError("Chỉ quản trị viên được quản lý nội dung.", 403)
        if op == "delete":
            return None
        clean = pick(data, ["title", "type", "status", "body", "cta_label", "cta_link", "published_at"])
        validate_text_limits(clean, {"title": ("Tiêu đề", 200), "body": ("Nội dung", 2000),
                                     "cta_label": ("Nhãn nút", 60), "cta_link": ("Đường dẫn", 500)})
        if "type" in clean and clean["type"] not in ("announcement", "banner"):
            raise ApiError("Loại nội dung không hợp lệ.")
        if "cta_link" in clean and not valid_content_link(clean["cta_link"]):
            raise ApiError("Đường dẫn nút hành động không hợp lệ.")
        if "status" in clean and clean["status"] not in ("draft", "published"):
            raise ApiError("Trạng thái nội dung không hợp lệ.")
        if op == "create" and not str(clean.get("title") or "").strip():
            raise ApiError("Vui lòng nhập tiêu đề.")
        if "published_at" in clean:
            try:
                clean["published_at"] = parse_iso(clean["published_at"])
            except ValueError:
                clean["published_at"] = None
        clean["created_by_name"] = viewer.full_name or viewer.email
        return clean

    if name == "Favorite":
        if op == "create":
            if not data.get("pitch_id") or not db.get(Pitch, str(data["pitch_id"])):
                raise ApiError("Không tìm thấy sân.", 404)
            return {"pitch_id": str(data["pitch_id"]), "user_id": viewer.id}
        if op == "delete" and row.user_id == viewer.id:
            return None

    if name == "Notification" and op == "update" and row.recipient_id == viewer.id:
        clean = pick(data, ["read"])
        if "read" in clean:
            clean["read"] = bool(clean["read"])
        return clean

    if name == "Report":
        if op == "create":
            ttype, tid = data.get("target_type"), data.get("target_id")
            if ttype not in ("pitch", "user", "message") or not tid:
                raise ApiError("Đối tượng báo cáo không hợp lệ.")
            if ttype == "user" and tid == viewer.id:
                raise ApiError("Không thể tự báo cáo tài khoản của mình.")
            target_name = report_target_name(db, ttype, str(tid))
            if target_name is None:
                raise ApiError("Không tìm thấy đối tượng cần báo cáo.", 404)
            reason = str(data.get("reason") or "").strip()
            details = str(data.get("details") or "").strip()
            if not reason or len(reason) > 500 or len(details) > 2000:
                raise ApiError("Vui lòng nhập lý do báo cáo (tối đa 500 ký tự, mô tả tối đa 2000 ký tự).")
            from .rules import open_report_exists
            if open_report_exists(db, viewer.id, ttype, str(tid)):
                raise ApiError("Bạn đã có báo cáo đang xử lý cho sân này." if ttype == "pitch"
                               else "Bạn đã có báo cáo đang xử lý cho đối tượng này.", 409)
            return {"target_type": ttype, "target_id": str(tid), "reason": reason, "details": details,
                    "target_name": target_name[:200],
                    "reporter_id": viewer.id, "reporter_name": viewer.full_name or viewer.email,
                    "reporter_role": viewer.app_role, "status": "open"}
        if op == "update" and is_admin(viewer):
            clean = pick(data, ["status", "decision", "assigned_to"])
            if "status" in clean and clean["status"] not in ("open", "reviewing", "resolved", "dismissed"):
                raise ApiError("Trạng thái báo cáo không hợp lệ.")
            return clean

    if name == "Pitch" and op == "update":
        owned_pitch(db, viewer, row.id)
        clean = pick(data, ["name", "type", "base_price_vnd", "city", "district", "address", "open_time",
                            "close_time", "facilities", "rules", "description", "schedule_configured", "images"])
        validate_text_limits(clean, PITCH_TEXT_LIMITS)
        if "images" in clean:
            validate_images(clean["images"])
        if "name" in clean and not str(clean["name"] or "").strip():
            raise ApiError("Tên sân không được để trống.")
        if "address" in clean and not str(clean["address"] or "").strip():
            raise ApiError("Địa chỉ sân không được để trống.")
        if "base_price_vnd" in clean:
            clean["base_price_vnd"] = validate_price(clean["base_price_vnd"], "Giá cơ bản")
        if "open_time" in clean or "close_time" in clean:
            validate_hours(clean.get("open_time", row.open_time), clean.get("close_time", row.close_time), "Giờ hoạt động")
        if "facilities" in clean and not (isinstance(clean["facilities"], list)
                                          and all(isinstance(x, str) and len(x) <= 60 for x in clean["facilities"])
                                          and len(clean["facilities"]) <= 30):
            raise ApiError("Danh sách tiện ích không hợp lệ.")
        if "type" in clean and clean["type"] not in ("5v5", "7v7", "11v11", None):
            raise ApiError("Loại sân không hợp lệ.")
        if "schedule_configured" in clean:
            clean["schedule_configured"] = bool(clean["schedule_configured"])
        return clean

    if name == "PitchSchedule":
        pitch = owned_pitch(db, viewer, row.pitch_id if row is not None else data.get("pitch_id"))
        if op == "delete":
            return None
        merged = {**({"weekday": row.weekday, "local_start": row.local_start, "local_end": row.local_end,
                      "price_vnd": row.price_vnd} if row is not None else {}),
                  **pick(data, ["weekday", "local_start", "local_end", "price_vnd"])}
        try:
            weekday = int(merged.get("weekday"))
        except (TypeError, ValueError):
            weekday = -1
        if not 0 <= weekday <= 6:
            raise ApiError("Ngày trong tuần không hợp lệ.")
        validate_hours(merged.get("local_start"), merged.get("local_end"), "Lịch tuần")
        price = validate_price(merged.get("price_vnd"), "Lịch tuần")
        return {"weekday": weekday, "local_start": merged["local_start"], "local_end": merged["local_end"],
                "price_vnd": price, "pitch_id": pitch.id, "manager_id": pitch.manager_id}

    if name == "AvailabilityOverride":
        pitch = owned_pitch(db, viewer, row.pitch_id if row is not None else data.get("pitch_id"))
        if op == "delete":
            return None
        import re
        ok = (re.match(r"^\d{4}-\d\d-\d\d$", str(data.get("local_date") or ""))
              and re.match(r"^\d\d:\d\d$", str(data.get("start_time") or ""))
              and re.match(r"^\d\d:\d\d$", str(data.get("end_time") or ""))
              and data["start_time"] < data["end_time"]
              and data.get("status") in ("open", "blocked", "unavailable"))
        if not ok:
            raise ApiError("Ngoại lệ lịch không hợp lệ.")
        if data["status"] != "open":
            from .models import BookingSlot
            taken = db.scalars(select(Booking.code).join(BookingSlot, BookingSlot.booking_id == Booking.id).where(
                BookingSlot.pitch_id == pitch.id, BookingSlot.local_date == data["local_date"],
                BookingSlot.start_time >= data["start_time"], BookingSlot.start_time < data["end_time"],
                Booking.status.in_(["pending", "confirmed"]))).first()
            if taken:
                raise ApiError(f"Khung giờ này đã có khách đặt (đơn {taken}). Nếu sân không thể phục vụ, "
                               "hãy hủy đơn đó ở trang Đơn đặt sân trước rồi khóa giờ.", 409)
        return {**pick(data, ["local_date", "start_time", "end_time", "status"]),
                "reason": str(data.get("reason") or "")[:500], "pitch_id": pitch.id, "manager_id": pitch.manager_id}

    raise ApiError("Bạn không có quyền thực hiện thao tác này.", 403)


__all__ = ["ContentItem", "Favorite", "AuditEvent", "WarningResponse"]
