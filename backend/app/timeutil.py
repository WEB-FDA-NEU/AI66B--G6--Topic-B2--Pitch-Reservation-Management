from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from . import config

VN = timezone(timedelta(hours=config.UTC_OFFSET_HOURS))

_offset = timedelta(0)


def set_clock_offset(delta: timedelta) -> None:
    global _offset
    _offset = delta


def utcnow() -> datetime:
    now = datetime.now(timezone.utc) + _offset
    return now.replace(tzinfo=None, microsecond=(now.microsecond // 1000) * 1000)


def iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.replace(tzinfo=None).isoformat(timespec="milliseconds") + "Z"


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def today_local() -> str:
    return (utcnow() + timedelta(hours=config.UTC_OFFSET_HOURS)).date().isoformat()


def add_days(day: str, n: int) -> str:
    return (date.fromisoformat(day) + timedelta(days=n)).isoformat()


def local_to_utc(local_date: str, hhmm: str) -> datetime:
    hour, minute = int(hhmm[:2]), int(hhmm[3:5])
    base = datetime.fromisoformat(f"{local_date}T00:00:00")
    return base + timedelta(hours=hour - config.UTC_OFFSET_HOURS, minutes=minute)


def weekday_js(local_date: str) -> int:
    return (date.fromisoformat(local_date).weekday() + 1) % 7
