from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta

import bcrypt
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from . import config
from .models import SessionToken, User
from .timeutil import utcnow

BCRYPT_ROUNDS = config.BCRYPT_ROUNDS
MAX_PASSWORD_BYTES = 72


def password_too_long(password: str) -> bool:
    return len(password.encode("utf-8")) > MAX_PASSWORD_BYTES


def hash_password(password: str) -> str:
    if password_too_long(password):
        raise ValueError("password longer than 72 bytes")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(BCRYPT_ROUNDS)).decode("ascii")


def verify_password(password: str, stored: str | None) -> bool:
    if not isinstance(password, str) or not stored or password_too_long(password):
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), stored.encode("ascii"))
    except ValueError:
        return False


_DUMMY_HASH = hash_password("pitch-point-dummy-password")


def burn_time(password: str) -> None:
    verify_password(password, _DUMMY_HASH)


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user_id: str) -> str:
    from . import settings
    token = secrets.token_urlsafe(32)
    db.add(SessionToken(token_hash=_digest(token), user_id=user_id,
                        expires_at=utcnow() + timedelta(days=settings.get(db, "session_days"))))
    return token


def delete_user_sessions(db: Session, user_id: str, keep_token: str | None = None) -> None:
    stmt = delete(SessionToken).where(SessionToken.user_id == user_id)
    if keep_token:
        stmt = stmt.where(SessionToken.token_hash != _digest(keep_token))
    db.execute(stmt)


_TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"


def temporary_password(length: int = 10) -> str:
    return "".join(secrets.choice(_TEMP_ALPHABET) for _ in range(length))


def user_from_token(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    row = db.get(SessionToken, _digest(token))
    if not row or row.expires_at <= utcnow():
        return None
    return db.get(User, row.user_id)


def delete_session(db: Session, token: str | None) -> None:
    if token:
        db.execute(delete(SessionToken).where(SessionToken.token_hash == _digest(token)))


def delete_expired_sessions(db: Session) -> None:
    db.execute(delete(SessionToken).where(SessionToken.expires_at <= utcnow()))


__all__ = ["hash_password", "verify_password", "password_too_long", "burn_time", "create_session",
           "user_from_token", "delete_session", "delete_expired_sessions", "select"]
