import hashlib
from datetime import timedelta, timezone

from sqlalchemy import delete, text

from . import db as dbmod
from .models import AuthRateBucket
from .timeutil import utcnow


def consume(key: str, limit: int, window: int) -> bool:
    digest = hashlib.sha256(key.encode()).hexdigest()
    with dbmod.write_lock, dbmod.session_scope() as db:
        if db.bind.dialect.name == 'postgresql':
            number = int.from_bytes(bytes.fromhex(digest[:16]), 'big', signed=True)
            db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': number})
        now = utcnow()
        row = db.get(AuthRateBucket, digest, with_for_update=True)
        attempts = [t for t in (row.attempts if row else []) if t > now.replace(tzinfo=timezone.utc).timestamp() - window]
        if len(attempts) >= limit:
            return False
        attempts.append(now.replace(tzinfo=timezone.utc).timestamp())
        if row is None:
            row = AuthRateBucket(key=digest)
            db.add(row)
        row.attempts = attempts
        row.expires_at = now + timedelta(seconds=window)
        return True


def clear(key: str):
    digest = hashlib.sha256(key.encode()).hexdigest()
    with dbmod.write_lock, dbmod.session_scope() as db:
        db.execute(delete(AuthRateBucket).where(AuthRateBucket.key == digest))


def purge(db):
    db.execute(delete(AuthRateBucket).where(AuthRateBucket.expires_at < utcnow()))
