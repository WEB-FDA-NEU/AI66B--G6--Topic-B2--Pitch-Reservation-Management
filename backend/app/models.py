from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, ClassVar

from sqlalchemy import (JSON, Boolean, DateTime, ForeignKey, Index, Integer, String, Text,
                        UniqueConstraint, inspect, text)
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base
from .timeutil import iso, utcnow


def new_id() -> str:
    return str(uuid.uuid4())


class Record:

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    created_date: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_date: Mapped[datetime | None] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    HIDDEN: ClassVar[tuple[str, ...]] = ()

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for attr in inspect(type(self)).column_attrs:
            key = attr.key
            if key in self.HIDDEN:
                continue
            value = getattr(self, key)
            out[key] = iso(value) if isinstance(value, datetime) else value
        return out


class User(Record, Base):
    __tablename__ = "users"
    HIDDEN = ("password_hash",)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120), default="")
    phone: Mapped[str] = mapped_column(String(30), default="")
    app_role: Mapped[str] = mapped_column(String(20), default="customer")
    role: Mapped[str] = mapped_column(String(20), default="user")
    status: Mapped[str] = mapped_column(String(20), default="active")
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    preferences: Mapped[dict | None] = mapped_column(JSON, default=dict)


class SystemSetting(Base):
    __tablename__ = "system_settings"
    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[Any] = mapped_column(JSON)
    updated_by_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    updated_date: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class SessionToken(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)


class Wallet(Record, Base):
    __tablename__ = "wallets"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    balance_vnd: Mapped[int] = mapped_column(Integer, default=0)


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    wallet_id: Mapped[str] = mapped_column(ForeignKey("wallets.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    amount_vnd: Mapped[int] = mapped_column(Integer)
    balance_after_vnd: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(30))
    booking_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_date: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Pitch(Record, Base):
    __tablename__ = "pitches"
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    base_price_vnd: Mapped[int] = mapped_column(Integer)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str] = mapped_column(String(300))
    open_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    close_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    facilities: Mapped[list | None] = mapped_column(JSON, default=list)
    rules: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    images: Mapped[list | None] = mapped_column(JSON, default=list)
    manager_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    manager_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    slot_minutes: Mapped[int] = mapped_column(Integer, default=60)
    schedule_configured: Mapped[bool] = mapped_column(Boolean, default=False)
    creation_request_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pause_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_changed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    suspension: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    __table_args__ = (UniqueConstraint("manager_id", "creation_request_id", name="uq_pitch_creation_request"),)


class PitchSchedule(Record, Base):
    __tablename__ = "pitch_schedules"
    pitch_id: Mapped[str] = mapped_column(ForeignKey("pitches.id", ondelete="CASCADE"), index=True)
    manager_id: Mapped[str] = mapped_column(String(64))
    weekday: Mapped[int] = mapped_column(Integer)
    local_start: Mapped[str] = mapped_column(String(5))
    local_end: Mapped[str] = mapped_column(String(5))
    price_vnd: Mapped[int] = mapped_column(Integer)


class AvailabilityOverride(Record, Base):
    __tablename__ = "availability_overrides"
    pitch_id: Mapped[str] = mapped_column(ForeignKey("pitches.id", ondelete="CASCADE"), index=True)
    manager_id: Mapped[str] = mapped_column(String(64))
    local_date: Mapped[str] = mapped_column(String(10), index=True)
    start_time: Mapped[str] = mapped_column(String(5))
    end_time: Mapped[str] = mapped_column(String(5))
    status: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class Booking(Record, Base):
    __tablename__ = "bookings"
    code: Mapped[str] = mapped_column(String(12), unique=True)
    pitch_id: Mapped[str] = mapped_column(ForeignKey("pitches.id"), index=True)
    pitch_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    pitch_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pitch_address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    booked_facilities: Mapped[list | None] = mapped_column(JSON, nullable=True)
    booked_rules: Mapped[str | None] = mapped_column(Text, nullable=True)
    manager_id: Mapped[str] = mapped_column(String(64), index=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    customer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    local_date: Mapped[str] = mapped_column(String(10), index=True)
    start_time: Mapped[str] = mapped_column(String(5))
    slot_starts: Mapped[list] = mapped_column(JSON, default=list)
    slot_label: Mapped[str] = mapped_column(String(20))
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    ends_at: Mapped[datetime] = mapped_column(DateTime)
    amount_vnd: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    hold_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancel_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancelled_by: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reschedule_count: Mapped[int] = mapped_column(Integer, default=0)
    reschedule_from_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    rescheduled_to_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    __table_args__ = (
        Index("uq_one_pending_hold_per_customer", "customer_id", unique=True,
              sqlite_where=text("status = 'pending'"), postgresql_where=text("status = 'pending'")),
        Index("ix_bookings_confirmed_ends_at", "ends_at",
              sqlite_where=text("status = 'confirmed'"), postgresql_where=text("status = 'confirmed'")),
    )


class BookingSlot(Base):
    __tablename__ = "booking_slots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[str] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), index=True)
    pitch_id: Mapped[str] = mapped_column(String(64))
    local_date: Mapped[str] = mapped_column(String(10))
    start_time: Mapped[str] = mapped_column(String(5))
    __table_args__ = (UniqueConstraint("pitch_id", "local_date", "start_time", name="uq_slot_taken"),)


class Payment(Record, Base):
    __tablename__ = "payments"
    booking_id: Mapped[str] = mapped_column(ForeignKey("bookings.id"), index=True)
    customer_id: Mapped[str] = mapped_column(String(64), index=True)
    manager_id: Mapped[str] = mapped_column(String(64), index=True)
    pitch_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    amount_vnd: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="paid")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Refund(Record, Base):
    __tablename__ = "refunds"
    booking_id: Mapped[str] = mapped_column(ForeignKey("bookings.id"), index=True)
    payment_id: Mapped[str] = mapped_column(ForeignKey("payments.id"), unique=True)
    customer_id: Mapped[str] = mapped_column(String(64), index=True)
    manager_id: Mapped[str] = mapped_column(String(64), index=True)
    amount_vnd: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="completed")


class Favorite(Record, Base):
    __tablename__ = "favorites"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    pitch_id: Mapped[str] = mapped_column(ForeignKey("pitches.id", ondelete="CASCADE"))
    __table_args__ = (UniqueConstraint("user_id", "pitch_id", name="uq_favorite"),)


class Review(Record, Base):
    __tablename__ = "reviews"
    booking_id: Mapped[str] = mapped_column(ForeignKey("bookings.id"), unique=True)
    pitch_id: Mapped[str] = mapped_column(String(64), index=True)
    customer_id: Mapped[str] = mapped_column(String(64))
    customer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    rating: Mapped[int] = mapped_column(Integer)
    body: Mapped[str] = mapped_column(Text, default="")


class Conversation(Record, Base):
    __tablename__ = "conversations"
    kind: Mapped[str] = mapped_column(String(20), default="booking")
    customer_id: Mapped[str] = mapped_column(String(64), index=True)
    customer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    manager_id: Mapped[str] = mapped_column(String(64), index=True)
    manager_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    pitch_id: Mapped[str] = mapped_column(String(64))
    pitch_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    last_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    __table_args__ = (UniqueConstraint("customer_id", "manager_id", "pitch_id", name="uq_conversation"),)


class Message(Record, Base):
    __tablename__ = "messages"
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    customer_id: Mapped[str] = mapped_column(String(64))
    manager_id: Mapped[str] = mapped_column(String(64))
    sender_id: Mapped[str] = mapped_column(String(64))
    sender_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sender_role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    body: Mapped[str] = mapped_column(Text)


class Notification(Record, Base):
    __tablename__ = "notifications"
    recipient_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text, default="")
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False)


class Report(Record, Base):
    __tablename__ = "reports"
    target_type: Mapped[str] = mapped_column(String(20))
    target_id: Mapped[str] = mapped_column(String(64))
    target_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reporter_id: Mapped[str] = mapped_column(String(64), index=True)
    reporter_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reporter_role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open")
    decision: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(64), nullable=True)


class Warning(Record, Base):
    __tablename__ = "warnings"
    recipient_id: Mapped[str] = mapped_column(String(64), index=True)
    issuer_id: Mapped[str] = mapped_column(String(64), index=True)
    issuer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    issuer_role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    conversation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)


class WarningResponse(Record, Base):
    __tablename__ = "warning_responses"
    warning_id: Mapped[str] = mapped_column(ForeignKey("warnings.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[str] = mapped_column(String(64))
    body: Mapped[str] = mapped_column(Text)


class AuditEvent(Record, Base):
    __tablename__ = "audit_events"
    actor_id: Mapped[str] = mapped_column(String(64))
    actor_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    action: Mapped[str] = mapped_column(String(40))
    entity_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    target_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    target_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class ContentItem(Record, Base):
    __tablename__ = "content_items"
    title: Mapped[str] = mapped_column(String(300))
    type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    body: Mapped[str] = mapped_column(Text, default="")
    cta_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cta_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    announcement_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


ENTITY_MODELS: dict[str, type] = {
    "User": User, "Wallet": Wallet, "Pitch": Pitch, "PitchSchedule": PitchSchedule,
    "AvailabilityOverride": AvailabilityOverride, "Booking": Booking, "Payment": Payment,
    "Refund": Refund, "Favorite": Favorite, "Review": Review, "Conversation": Conversation,
    "Message": Message, "Notification": Notification, "Report": Report, "Warning": Warning,
    "WarningResponse": WarningResponse, "AuditEvent": AuditEvent, "ContentItem": ContentItem,
}


class AuthRateBucket(Base):
    __tablename__ = "auth_rate_buckets"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    attempts: Mapped[list] = mapped_column(JSON, default=list)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
