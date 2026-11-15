from __future__ import annotations

from typing import Any, Callable

from fastapi import Request
from sqlalchemy.exc import DataError, IntegrityError, OperationalError
from sqlalchemy.orm import Session

from . import config
from .db import SessionLocal, write_lock
from .models import User
from .rules import SUSPENDED_MESSAGE, ApiError, sync
from .security import user_from_token


CONFLICT_MESSAGE = "Dữ liệu vừa được người khác thay đổi. Vui lòng tải lại trang rồi thử lại."
RETRYABLE_SQLSTATES = {"40P01", "40001"}
TEMP_PASSWORD_MESSAGE = "Bạn đang dùng mật khẩu tạm. Vui lòng đặt mật khẩu mới trước khi tiếp tục."
TEMP_PASSWORD_ALLOWED = {"/api/auth/password", "/api/auth/logout", "/api/auth/login"}


def session_token(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None
    return request.cookies.get(config.SESSION_COOKIE)


def current_user(db: Session, request: Request) -> User | None:
    return user_from_token(db, session_token(request))


def run(request: Request, work: Callable[[Session, User | None], Any], *, allow_suspended: bool = True) -> Any:
    with write_lock:
        db = SessionLocal()
        try:
            sync(db)
            user = current_user(db, request)
            if user and user.status == "suspended" and not allow_suspended:
                raise ApiError(SUSPENDED_MESSAGE, 403)
            if (user and user.must_change_password and request.method not in ("GET", "HEAD")
                    and request.url.path not in TEMP_PASSWORD_ALLOWED):
                raise ApiError(TEMP_PASSWORD_MESSAGE, 403)
            result = work(db, user)
            db.commit()
            return result
        except DataError as exc:
            db.rollback()
            raise ApiError("Dữ liệu nhập vào quá dài hoặc vượt giới hạn cho phép. Vui lòng kiểm tra lại.") from exc
        except (IntegrityError, OperationalError) as exc:
            db.rollback()
            code = getattr(getattr(exc, "orig", None), "sqlstate", None) or getattr(getattr(exc, "orig", None), "pgcode", None)
            if isinstance(exc, IntegrityError) or code in RETRYABLE_SQLSTATES:
                raise ApiError(CONFLICT_MESSAGE, 409) from exc
            raise
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
