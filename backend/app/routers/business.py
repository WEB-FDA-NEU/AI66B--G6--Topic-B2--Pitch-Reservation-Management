from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Request
from sqlalchemy import func, or_, select

from .. import settings
from ..access import display, read_scope
from ..deps import run
from ..models import Conversation, Message, Notification
from ..rules import LOGIN_REQUIRED, ApiError
from ..services import FUNCTIONS
from ..timeutil import iso, parse_iso, utcnow

router = APIRouter(prefix="/api", tags=["business"])


PUBLIC_FUNCTIONS = {"searchPitches", "getAvailability", "nextAvailableDate", "syncBookings"}


def call(request: Request, name: str, payload: dict) -> dict:
    fn, allow_suspended = FUNCTIONS[name]

    def work(db, u):
        if u is None and name not in PUBLIC_FUNCTIONS:
            raise ApiError(LOGIN_REQUIRED, 401)
        return fn(db, u, payload)
    return run(request, work, allow_suspended=allow_suspended)


# ---- đặt sân
@router.post("/bookings/holds")
def create_hold(request: Request, body: dict):
    return call(request, "createHold", body)


@router.post("/bookings/sync")
def sync_bookings(request: Request):
    return call(request, "syncBookings", {})


@router.post("/bookings/{booking_id}/payment")
def pay_booking(request: Request, booking_id: str, body: dict | None = None):
    return call(request, "payBooking", {**(body or {}), "booking_id": booking_id})


@router.post("/bookings/{booking_id}/cancellation")
def cancel_booking(request: Request, booking_id: str, body: dict | None = None):
    return call(request, "cancelBooking", {**(body or {}), "booking_id": booking_id})


@router.post("/reviews")
def submit_review(request: Request, body: dict):
    return call(request, "submitReview", body)


# ---- sân
@router.get("/search/pitches")
def search_pitches(request: Request, q: str = "", location: str = "", pitchType: str = "", date: str = "", time: str = ""):
    return call(request, "searchPitches", {"q": q, "location": location, "pitchType": pitchType, "date": date, "time": time})


@router.get("/pitches/{pitch_id}/availability")
def availability(request: Request, pitch_id: str, local_date: str = ""):
    return call(request, "getAvailability", {"pitch_id": pitch_id, "local_date": local_date})


@router.get("/pitches/{pitch_id}/next-available-date")
def next_available(request: Request, pitch_id: str):
    return call(request, "nextAvailableDate", {"pitch_id": pitch_id})


@router.post("/pitches")
def create_pitch(request: Request, body: dict):
    return call(request, "createPitchWithSchedule", body)


@router.post("/pitches/{pitch_id}/status")
def set_pitch_status(request: Request, pitch_id: str, body: dict):
    return call(request, "setPitchStatus", {**body, "pitch_id": pitch_id})


# ---- tin nhắn, cảnh cáo
@router.post("/conversations")
def start_message(request: Request, body: dict):
    return call(request, "startMessage", body)


@router.post("/conversations/{conversation_id}/messages")
def send_message(request: Request, conversation_id: str, body: dict):
    return call(request, "sendMessage", {**body, "conversation_id": conversation_id})


@router.post("/conversations/{conversation_id}/warnings")
def warn_customer(request: Request, conversation_id: str, body: dict):
    return call(request, "warnCustomer", {**body, "conversation_id": conversation_id})


@router.post("/warnings/{warning_id}/responses")
def respond_warning(request: Request, warning_id: str, body: dict):
    return call(request, "respondWarning", {**body, "warning_id": warning_id})


@router.post("/appeals")
def submit_appeal(request: Request, body: dict):
    return call(request, "submitAppeal", body)


# ---- quản trị
@router.post("/admin/actions")
def admin_action(request: Request, body: dict):
    return call(request, "adminAction", body)


# ---- cập nhật định kỳ (chuông thông báo, tin nhắn)
UPDATES_CURSOR_LAG = timedelta(seconds=2)
UPDATES_ROW_LIMIT = 200


@router.get("/updates")
def updates(request: Request, since: str = "", conversation_id: str = "", conversations: bool = False):
    def work(db, u):
        if not u:
            raise ApiError(LOGIN_REQUIRED, 401)
        now = utcnow()
        try:
            after = parse_iso(since)
        except ValueError:
            after = None
        unread = db.scalar(select(func.count(Notification.id)).where(Notification.recipient_id == u.id, Notification.read.is_(False)))
        result = {"server_time": iso(now - UPDATES_CURSOR_LAG), "unread_count": unread or 0, "notifications": [],
                  "conversations": [], "messages": []}
        if after is None:
            return result
        result["notifications"] = [n.to_dict() for n in db.scalars(
            select(Notification).where(Notification.recipient_id == u.id, Notification.created_date > after)
            .order_by(Notification.created_date.desc()).limit(20))]
        if conversations:
            result["conversations"] = [display(db, "Conversation", c, u) for c in db.scalars(
                select(Conversation).where(read_scope("Conversation", Conversation, u),
                                           or_(Conversation.updated_date > after, Conversation.last_message_at > after))
                .limit(UPDATES_ROW_LIMIT))]
        if conversation_id:
            result["messages"] = [m.to_dict() for m in db.scalars(
                select(Message).where(read_scope("Message", Message, u), Message.conversation_id == conversation_id,
                                      Message.created_date > after)
                .order_by(Message.created_date).limit(UPDATES_ROW_LIMIT))]
        return result
    return run(request, work)


# ---- cài đặt hệ thống
@router.get("/settings")
def public_settings(request: Request):
    return run(request, lambda db, _u: settings.public_values(db))


@router.get("/admin/settings")
def admin_settings(request: Request):
    def work(db, u):
        if not u:
            raise ApiError(LOGIN_REQUIRED, 401)
        if u.app_role != "admin":
            raise ApiError("Chỉ quản trị viên có quyền thực hiện.", 403)
        return {"settings": settings.describe(db)}
    return run(request, work)
