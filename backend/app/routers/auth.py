from __future__ import annotations

import json
import re
from urllib.parse import parse_qs

from fastapi import APIRouter, Request, Response
from starlette.concurrency import run_in_threadpool
from sqlalchemy import func, select, update

from .. import config, settings, rate_limit
from ..access import display
from ..deps import current_user, run, session_token
from ..models import Conversation, Message, Pitch, Report, Review, User, Wallet, WalletTransaction
from ..rules import LOGIN_REQUIRED, SUSPENDED_MESSAGE, ApiError, clean_preferences, notify, open_report_exists
from ..security import (burn_time, create_session, delete_session, delete_user_sessions, hash_password,
                        password_too_long, verify_password)

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(config.SESSION_COOKIE, token, max_age=config.SESSION_DAYS * 86400, httponly=True,
                        samesite="lax", path="/")


@router.get("/me")
def me(request: Request):
    def work(db, u):
        if not u:
            raise ApiError(LOGIN_REQUIRED, 401)
        return display(db, "User", u, u)
    return run(request, work)


@router.get("/session")
def session(request: Request):
    return run(request, lambda db, u: {"user": display(db, "User", u, u) if u else None})


@router.post("/login")
def login(request: Request, response: Response, body: dict):
    email = str(body.get("email") or "").strip().lower()
    password = str(body.get("password") or "")
    if not rate_limit.consume("login:" + email, 10, 900):
        raise ApiError("Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.", 429)

    def work(db, _u):
        u = _authenticate(db, email, password)
        delete_session(db, session_token(request))
        token = create_session(db, u.id)
        _set_cookie(response, token)
        return display(db, "User", u, u)
    result = run(request, work)
    rate_limit.clear("login:" + email)
    return result


def _authenticate(db, email: str, password: str) -> User:
    u = db.scalars(select(User).where(func.lower(User.email) == email)).first()
    if not u:
        burn_time(password)
    if not u or not verify_password(password, u.password_hash):
        raise ApiError("Email hoặc mật khẩu không đúng.", 401)
    return u


@router.post("/token")
async def token(request: Request):
    raw = await request.body()
    if "application/json" in request.headers.get("content-type", ""):
        try:
            data = json.loads(raw or b"{}")
        except ValueError:
            data = {}
        data = data if isinstance(data, dict) else {}
        email, password = data.get("email") or data.get("username"), data.get("password")
    else:
        form = parse_qs(raw.decode("utf-8", "replace"))
        email, password = (form.get("username") or [""])[0], (form.get("password") or [""])[0]
    email, password = str(email or "").strip().lower(), str(password or "")
    if not await run_in_threadpool(rate_limit.consume, "login:" + email, 10, 900):
        raise ApiError("Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.", 429)

    def work(db, _u):
        u = _authenticate(db, email, password)
        return {"access_token": create_session(db, u.id), "token_type": "bearer",
                "expires_in": settings.get(db, "session_days") * 86400, "user": display(db, "User", u, u)}
    result = await run_in_threadpool(run, request, work)
    await run_in_threadpool(rate_limit.clear, "login:" + email)
    return result


@router.post("/register")
def register(request: Request, body: dict):
    email = str(body.get("email") or "").strip()
    password = str(body.get("password") or "")
    full_name = str(body.get("full_name") or "").strip()
    phone = str(body.get("phone") or "").strip()
    if not EMAIL_RE.match(email) or len(email) > 255:
        raise ApiError("Vui lòng nhập địa chỉ email hợp lệ.")
    if len(full_name) > 120 or len(phone) > 30:
        raise ApiError("Họ tên hoặc số điện thoại quá dài.")

    def work(db, _u):
        check_new_password(db, password)
        if db.scalars(select(User.id).where(func.lower(User.email) == email.lower())).first():
            raise ApiError("Email đã được đăng ký.", 409)
        u = User(email=email, password_hash=hash_password(password), full_name=full_name or email.split("@")[0],
                 phone=phone, app_role="customer", role="user", status="active")
        db.add(u)
        db.flush()
        opening = settings.get(db, "initial_balance_vnd")
        w = Wallet(user_id=u.id, balance_vnd=opening)
        db.add(w)
        db.flush()
        db.add(WalletTransaction(wallet_id=w.id, user_id=u.id, amount_vnd=opening,
                                 balance_after_vnd=opening, kind="opening"))
        return display(db, "User", u, u)
    return run(request, work)


def check_new_password(db, password: str, old_hash: str | None = None) -> None:
    minimum = settings.get(db, "password_min_length")
    if not isinstance(password, str) or len(password) < minimum or password_too_long(password):
        raise ApiError(f"Mật khẩu phải có từ {minimum} đến 72 ký tự (nên dùng chữ không dấu).")
    if old_hash and verify_password(password, old_hash):
        raise ApiError("Mật khẩu mới phải khác mật khẩu hiện tại.")


@router.post("/password")
def change_password(request: Request, body: dict):
    current = str(body.get("current_password") or "")
    new = str(body.get("new_password") or "")

    from ..db import SessionLocal
    with SessionLocal() as lookup:
        actor = current_user(lookup, request)
        key = f"password:{actor.id}" if actor else None
    if key and not rate_limit.consume(key, 10, 900):
        raise ApiError("Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.", 429)

    verified = False

    def work(db, u):
        nonlocal verified
        if not u:
            raise ApiError(LOGIN_REQUIRED, 401)
        if not verify_password(current, u.password_hash):
            raise ApiError("Mật khẩu hiện tại không đúng.", 400)
        verified = True
        check_new_password(db, new, u.password_hash)
        u.password_hash = hash_password(new)
        u.must_change_password = False
        delete_user_sessions(db, u.id, keep_token=session_token(request))
        notify(db, u.id, "Mật khẩu đã được thay đổi",
               "Mật khẩu tài khoản của bạn vừa được đổi; các thiết bị khác đã được đăng xuất. "
               "Nếu không phải bạn đổi, hãy liên hệ quản trị viên ngay.", "/notifications")
        return display(db, "User", u, u)
    try:
        return run(request, work)
    finally:
        if key and verified:
            rate_limit.clear(key)


def _rename_everywhere(db, u: User) -> None:
    name = u.full_name
    db.execute(update(Conversation).where(Conversation.customer_id == u.id).values(customer_name=name))
    db.execute(update(Conversation).where(Conversation.manager_id == u.id, Conversation.kind != "support")
               .values(manager_name=name))
    db.execute(update(Message).where(Message.sender_id == u.id).values(sender_name=name))
    db.execute(update(Review).where(Review.customer_id == u.id).values(customer_name=name))
    db.execute(update(Pitch).where(Pitch.manager_id == u.id).values(manager_name=name))


@router.patch("/me")
def update_me(request: Request, body: dict):
    def work(db, u):
        if not u:
            raise ApiError(LOGIN_REQUIRED, 401)
        if u.status == "suspended":
            raise ApiError(SUSPENDED_MESSAGE, 403)
        old_name = u.full_name
        for key, limit in (("full_name", 120), ("phone", 30)):
            value = body.get(key)
            if isinstance(value, str):
                value = value.strip()
                if len(value) > limit:
                    raise ApiError("Họ tên hoặc số điện thoại quá dài.")
                if key == "full_name" and not value:
                    raise ApiError("Vui lòng nhập họ và tên.")
                setattr(u, key, value)
        if "preferences" in body:
            u.preferences = clean_preferences(u.preferences, body["preferences"])
        if u.full_name != old_name:
            _rename_everywhere(db, u)
        db.flush()
        return display(db, "User", u, u)
    return run(request, work)


@router.post("/logout")
def logout(request: Request, response: Response):
    def work(db, _u):
        delete_session(db, session_token(request))
        return {"ok": True}
    result = run(request, work)
    response.delete_cookie(config.SESSION_COOKIE, path="/")
    return result


RESET_REQUEST_MESSAGE = ("Nếu email này có tài khoản trên Pitch Point, quản trị viên đã nhận được yêu cầu. "
                         "Quản trị viên sẽ đặt lại mật khẩu tạm và báo cho bạn qua số điện thoại hoặc kênh liên hệ của "
                         "tài khoản; khi đăng nhập bằng mật khẩu tạm, bạn sẽ được yêu cầu đặt mật khẩu mới.")
@router.post("/password-reset")
def password_reset(request: Request, body: dict):
    email = str(body.get("email") or "").strip().lower()
    note = str(body.get("note") or "").strip()[:500]
    if not EMAIL_RE.match(email) or len(email) > 255:
        raise ApiError("Vui lòng nhập địa chỉ email hợp lệ.")
    ip = request.client.host if request.client else "?"
    if not rate_limit.consume(f"reset-ip:{ip}", 10, 3600) or not rate_limit.consume(f"reset-email:{email}", 3, 3600):
        raise ApiError("Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ.", 429)

    def work(db, _u):
        u = db.scalars(select(User).where(func.lower(User.email) == email)).first()
        if u and not open_report_exists(db, u.id, "password_reset"):
            r = Report(target_type="password_reset", target_id=u.id, target_name=u.full_name or u.email,
                       reporter_id=u.id, reporter_name=u.full_name or u.email, reporter_role=u.app_role,
                       reason="Yêu cầu đặt lại mật khẩu", details=note, status="open")
            db.add(r)
            db.flush()
            for admin in db.scalars(select(User).where(User.app_role == "admin", User.id != u.id)).all():
                notify(db, admin.id, f"Yêu cầu đặt lại mật khẩu: {u.full_name or u.email}",
                       f"{u.email} quên mật khẩu.{f' Ghi chú: {note}' if note else ''}", "/admin/reports", "reports")
        return {"ok": True, "message": RESET_REQUEST_MESSAGE}
    return run(request, work)


__all__ = ["router", "current_user"]
