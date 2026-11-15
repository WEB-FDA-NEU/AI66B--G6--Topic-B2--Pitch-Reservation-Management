from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config
from .models import SystemSetting
from .timeutil import iso


@dataclass(frozen=True)
class Setting:
    default: int
    minimum: int
    maximum: int
    group: str
    label: str
    unit: str = ""


DEFINITIONS: dict[str, Setting] = {
    "cancellation_review_count": Setting(4, 2, 20, "booking", "Gắn cờ xem xét sau số lần tự hủy và hoàn tiền", "lần"),
    "cancellation_review_days": Setting(30, 1, 90, "booking", "Khoảng thời gian theo dõi hủy và hoàn tiền", "ngày"),
    "hold_minutes": Setting(config.HOLD_DURATION_SECONDS // 60, 5, 30, "booking", "Thời gian giữ chỗ tạm thời", "phút"),
    "booking_advance_days": Setting(config.BOOKING_ADVANCE_DAYS, 1, 14, "booking", "Số ngày được đặt trước", "ngày"),
    "cancellation_notice_hours": Setting(config.CANCELLATION_NOTICE_SECONDS // 3600, 1, 48,
                                         "booking", "Hủy / đổi lịch trước giờ đá ít nhất", "giờ"),
    "initial_balance_vnd": Setting(config.INITIAL_BALANCE_VND, 0, 10_000_000, "account",
                                   "Số dư thử nghiệm tặng tài khoản mới", "₫"),
    "password_min_length": Setting(6, 6, 32, "security", "Độ dài mật khẩu tối thiểu", "ký tự"),
    "session_days": Setting(config.SESSION_DAYS, 1, 30, "security", "Thời gian giữ đăng nhập", "ngày"),
}

_CACHE_KEY = "pitchpoint.settings"


def _stored(db: Session) -> dict[str, Any]:
    cached = db.info.get(_CACHE_KEY)
    if cached is None:
        cached = {s.key: s.value for s in db.scalars(select(SystemSetting)).all()}
        db.info[_CACHE_KEY] = cached
    return cached


def get(db: Session, key: str) -> int:
    d = DEFINITIONS[key]
    value = _stored(db).get(key, d.default)
    try:
        value = int(value)
    except (TypeError, ValueError):
        return d.default
    return min(max(value, d.minimum), d.maximum)


def public_values(db: Session) -> dict[str, int]:
    return {key: get(db, key) for key in DEFINITIONS}


def describe(db: Session) -> list[dict[str, Any]]:
    stored = {s.key: s for s in db.scalars(select(SystemSetting)).all()}
    out = []
    for key, d in DEFINITIONS.items():
        row = stored.get(key)
        out.append({"key": key, "value": get(db, key), "default": d.default, "min": d.minimum, "max": d.maximum,
                    "group": d.group, "label": d.label, "unit": d.unit,
                    "updated_by_name": row.updated_by_name if row else None,
                    "updated_date": iso(row.updated_date) if row and row.updated_date else None})
    return out


def validate(values: Any) -> dict[str, int]:
    if not isinstance(values, dict) or not values:
        raise ValueError("Không có cài đặt nào để lưu.")
    clean: dict[str, int] = {}
    for key, raw in values.items():
        d = DEFINITIONS.get(key)
        if not d:
            raise ValueError("Cài đặt không hợp lệ.")
        if isinstance(raw, bool):
            raise ValueError(f"{d.label}: giá trị không hợp lệ.")
        try:
            number = float(raw)
        except (TypeError, ValueError):
            raise ValueError(f"{d.label}: vui lòng nhập một số.") from None
        if number != int(number) or not d.minimum <= number <= d.maximum:
            raise ValueError(f"{d.label}: chọn số nguyên từ {d.minimum:,} đến {d.maximum:,}{' ' + d.unit if d.unit else ''}."
                             .replace(",", "."))
        clean[key] = int(number)
    return clean


def save(db: Session, actor_name: str, values: dict[str, int]) -> dict[str, tuple[int, int]]:
    changed = {}
    for key, value in values.items():
        old = get(db, key)
        row = db.get(SystemSetting, key)
        if row is None:
            db.add(SystemSetting(key=key, value=value, updated_by_name=actor_name))
        else:
            row.value, row.updated_by_name = value, actor_name
        if old != value:
            changed[key] = (old, value)
    db.flush()
    db.info.pop(_CACHE_KEY, None)
    return changed
