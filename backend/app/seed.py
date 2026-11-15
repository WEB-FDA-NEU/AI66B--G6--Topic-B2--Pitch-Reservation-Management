from __future__ import annotations

import json
import sys
from typing import Any

from sqlalchemy import select

from . import config, db as dbmod
from .db import Base
from .models import ENTITY_MODELS, BookingSlot, User, Wallet, WalletTransaction
from .security import hash_password
from .timeutil import parse_iso


def _clean(model: type, row: dict) -> dict:
    cols = model.__table__.columns
    out: dict[str, Any] = {}
    for key, value in row.items():
        if key not in cols:
            continue
        if value is not None and type(cols[key].type).__name__ == "DateTime":
            value = parse_iso(value)
        out[key] = value
    return out


def create_schema() -> None:
    from .migrate import upgrade
    upgrade()


def seed_if_empty(path=config.SEED_FILE) -> bool:
    with dbmod.init_lock():
        return _seed_if_empty(path)


def _seed_if_empty(path) -> bool:
    create_schema()
    with dbmod.session_scope() as db:
        if db.scalars(select(User.id)).first():
            return False
        data = json.loads(path.read_text(encoding="utf-8"))
        order = ["User", "Pitch", "PitchSchedule", "AvailabilityOverride", "Booking", "Payment", "Refund",
                 "Favorite", "Review", "Conversation", "Message", "Notification", "Report", "Warning",
                 "WarningResponse", "AuditEvent", "ContentItem"]
        for name in order:
            model = ENTITY_MODELS[name]
            for row in data.get(name) or []:
                row = dict(row)
                if name == "User":
                    row["password_hash"] = hash_password(str(row.pop("password", "")) or "123456") \
                        if "password_hash" not in row else row["password_hash"]
                record = model(**_clean(model, row))
                db.add(record)
                if name == "Booking" and record.status in ("pending", "confirmed"):
                    for start in record.slot_starts or [record.start_time]:
                        db.add(BookingSlot(booking_id=record.id, pitch_id=record.pitch_id,
                                           local_date=record.local_date, start_time=start))
            db.flush()
        for row in data.get("Wallet") or []:
            w = Wallet(**_clean(Wallet, row))
            db.add(w)
            db.flush()
            db.add(WalletTransaction(wallet_id=w.id, user_id=w.user_id, amount_vnd=w.balance_vnd,
                                     balance_after_vnd=w.balance_vnd, kind="opening"))
        if config.SEED_DEMO:
            from .demo import seed_demo
            seed_demo(db)
    return True


def reset() -> None:
    with dbmod.init_lock():
        from sqlalchemy import text
        Base.metadata.drop_all(dbmod.engine)
        with dbmod.engine.begin() as connection:
            connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
        _seed_if_empty(config.SEED_FILE)


if __name__ == "__main__":
    if "--reset" in sys.argv:
        reset()
        print("Đã xóa và nạp lại dữ liệu mẫu.")
    else:
        print("Đã nạp dữ liệu mẫu." if seed_if_empty() else "Database đã có dữ liệu, không nạp lại.")
