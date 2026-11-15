from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import settings
from .models import AvailabilityOverride, Booking, BookingSlot, Pitch, PitchSchedule
from .rules import pitch_bookable
from .timeutil import add_days, local_to_utc, today_local, utcnow, weekday_js


def _minutes(value: str | None) -> int | None:
    if not value or not re.match(r"^\d{2}:\d{2}$", value):
        return None
    hour, minute = int(value[:2]), int(value[3:])
    if hour <= 24 and minute < 60 and (hour != 24 or minute == 0):
        return hour * 60 + minute
    return None


def _time(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"


def valid_date(value: str | None) -> bool:
    return bool(value and re.match(r"^\d{4}-\d{2}-\d{2}$", value))


def slots(db: Session, pitch_id: str | None, local_date: str | None, pitch: Pitch | None = None) -> list[dict]:
    pitch = pitch or (db.get(Pitch, pitch_id) if pitch_id else None)
    if not pitch or not valid_date(local_date):
        return []
    today = today_local()
    valid = today <= local_date <= add_days(today, settings.get(db, "booking_advance_days")) and pitch_bookable(db, pitch)

    schedules = db.scalars(select(PitchSchedule).where(PitchSchedule.pitch_id == pitch.id)).all()
    weekday = weekday_js(local_date)
    windows = [{"start": s.local_start, "end": s.local_end, "price": s.price_vnd}
               for s in schedules if int(s.weekday) == weekday]
    if not schedules and not pitch.schedule_configured:
        windows.append({"start": pitch.open_time or "06:00", "end": pitch.close_time or "22:00",
                        "price": pitch.base_price_vnd})
    overrides = db.scalars(select(AvailabilityOverride).where(
        AvailabilityOverride.pitch_id == pitch.id, AvailabilityOverride.local_date == local_date)).all()
    for o in overrides:
        if o.status == "open":
            windows.append({"start": o.start_time, "end": o.end_time, "price": pitch.base_price_vnd})

    candidates: dict[str, dict] = {}
    for w in windows:
        first, last = _minutes(w["start"]), _minutes(w["end"])
        if first is None or last is None or first < 0 or first >= 1440 or last > 1440:
            continue
        m = first
        while m + 60 <= last:
            start = _time(m)
            candidates.setdefault(start, {"start": start, "end": _time(m + 60), "price": w["price"]})
            m += 60

    taken = set(db.scalars(select(BookingSlot.start_time).where(
        BookingSlot.pitch_id == pitch.id, BookingSlot.local_date == local_date)).all())
    active = db.execute(select(Booking.starts_at, Booking.ends_at).where(
        Booking.pitch_id == pitch.id, Booking.local_date == local_date,
        Booking.status.in_(["pending", "confirmed"]))).all()
    now = utcnow()
    out = []
    for c in sorted(candidates.values(), key=lambda x: x["start"]):
        start, end = c["start"], c["end"]
        instant = local_to_utc(local_date, start)
        finish = local_to_utc(local_date, end)
        occupied = start in taken or any(bs < finish and be > instant for bs, be in active)
        blocked = any(o.start_time < end and o.end_time > start and o.status in ("blocked", "unavailable")
                      for o in overrides)
        if not valid:
            state = "closed"
        elif instant <= now:
            state = "past"
        elif occupied:
            state = "booked"
        elif blocked:
            state = "blocked"
        else:
            state = "available"
        out.append({"start": start, "end": end, "label": f"{start} – {end}",
                    "price_vnd": c["price"] if c["price"] is not None else pitch.base_price_vnd, "state": state})
    return out
