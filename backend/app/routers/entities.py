from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Request
from sqlalchemy import Boolean, DateTime, Integer, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..access import GUEST_READABLE, authorize_write, display, read_scope
from ..deps import run
from ..models import ENTITY_MODELS, Favorite, PitchSchedule, User, new_id
from ..rules import LOGIN_REQUIRED, NOT_FOUND_MESSAGE, ApiError, audit, notify
from ..timeutil import parse_iso

router = APIRouter(prefix="/api/entities", tags=["entities"])

MAX_LIMIT = 5000


def _model(name: str) -> type:
    model = ENTITY_MODELS.get(name)
    if not model:
        raise ApiError(NOT_FOUND_MESSAGE, 404)
    return model


def _column(model: type, key: str):
    col = model.__table__.columns.get(key)
    if col is None or key == "password_hash":
        raise ApiError("Điều kiện lọc không hợp lệ.")
    return getattr(model, key)


def _coerce(model: type, key: str, value: Any) -> Any:
    col = model.__table__.columns[key]
    if value is None:
        return None
    if isinstance(col.type, Boolean):
        return value if isinstance(value, bool) else str(value).lower() == "true"
    if isinstance(col.type, Integer):
        try:
            return int(value)
        except (TypeError, ValueError):
            raise ApiError("Điều kiện lọc không hợp lệ.")
    if isinstance(col.type, DateTime):
        try:
            return parse_iso(value)
        except ValueError:
            raise ApiError("Điều kiện lọc không hợp lệ.")
    return str(value)


def _where(model: type, where: dict) -> list:
    clauses = []
    for key, value in where.items():
        column = _column(model, key)
        if isinstance(value, dict):
            if isinstance(value.get("$in"), list):
                clauses.append(column.in_([_coerce(model, key, v) for v in value["$in"]]))
            if "$gte" in value:
                clauses.append(column >= _coerce(model, key, value["$gte"]))
            if "$lte" in value:
                clauses.append(column <= _coerce(model, key, value["$lte"]))
        elif isinstance(value, list):
            raise ApiError("Điều kiện lọc không hợp lệ.")
        else:
            clauses.append(column.is_(None) if value is None else column == _coerce(model, key, value))
    return clauses


def _require_login_for_private(name: str, viewer) -> None:
    if viewer is None and name not in GUEST_READABLE:
        raise ApiError(LOGIN_REQUIRED, 401)


def _get_visible(db: Session, name: str, model: type, key: str, viewer) -> Any:
    _require_login_for_private(name, viewer)
    row = db.scalars(select(model).where(model.id == key, read_scope(name, model, viewer))).first()
    if not row:
        raise ApiError(NOT_FOUND_MESSAGE, 404)
    return row


@router.get("/{name}")
def list_records(request: Request, name: str, where: str = "{}", sort: str = "", limit: int = MAX_LIMIT):
    model = _model(name)
    try:
        conditions = json.loads(where or "{}")
    except json.JSONDecodeError:
        raise ApiError("Điều kiện lọc không hợp lệ.")
    if not isinstance(conditions, dict):
        raise ApiError("Điều kiện lọc không hợp lệ.")
    limit = max(1, min(int(limit or MAX_LIMIT), MAX_LIMIT))

    def work(db, viewer):
        _require_login_for_private(name, viewer)
        base = select(model).where(read_scope(name, model, viewer), *_where(model, conditions))
        total = db.scalar(select(func.count()).select_from(base.subquery()))
        stmt = base
        if sort:
            column = _column(model, sort.lstrip("-"))
            stmt = stmt.order_by(column.desc() if sort.startswith("-") else column.asc(), model.id)
        rows = db.scalars(stmt.limit(limit)).all()
        return {"items": [display(db, name, r, viewer) for r in rows], "total": total}
    return run(request, work)


@router.get("/{name}/{key}")
def get_record(request: Request, name: str, key: str):
    model = _model(name)
    return run(request, lambda db, viewer: display(db, name, _get_visible(db, name, model, key, viewer), viewer))


@router.post("/{name}")
def create_record(request: Request, name: str, body: dict):
    model = _model(name)
    if name == "Pitch":
        raise ApiError("Tạo sân phải đi kèm lịch hoạt động. Vui lòng dùng chức năng tạo sân.")

    def work(db, viewer):
        data = authorize_write(db, viewer, name, "create", None, body or {})
        if name == "Favorite":
            existing = db.scalars(select(Favorite).where(Favorite.user_id == data["user_id"],
                                                         Favorite.pitch_id == data["pitch_id"])).first()
            if existing:
                return display(db, name, existing, viewer)
        row = model(id=new_id(), **data)
        db.add(row)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise ApiError("Dữ liệu đã tồn tại.", 409)
        if name == "ContentItem":
            from ..moderation import publish_announcement
            publish_announcement(db, row)
            audit(db, viewer, "content_create", "Nội dung", row.id, "", row.title or "Nội dung")
        if name == "Report":
            for admin in db.scalars(select(User).where(User.app_role == "admin")).all():
                notify(db, admin.id, f"Báo cáo mới từ {row.reporter_name or 'người dùng'}",
                       f"{row.target_name or 'Đối tượng'}: {row.reason or ''}"[:140], "/admin/reports", "reports")
        return display(db, name, row, viewer)
    return run(request, work)


@router.patch("/{name}/{key}")
def update_record(request: Request, name: str, key: str, body: dict):
    model = _model(name)

    def work(db, viewer):
        row = _get_visible(db, name, model, key, viewer)
        if name == "ContentItem":
            row = db.scalar(select(model).where(model.id == key).with_for_update().execution_options(populate_existing=True))
        data = authorize_write(db, viewer, name, "update", row, body or {})
        old_price = row.base_price_vnd if name == "Pitch" else None
        for k, v in (data or {}).items():
            setattr(row, k, v)
        if name == "Pitch" and "base_price_vnd" in (data or {}) and data["base_price_vnd"] != old_price:
            db.execute(update(PitchSchedule)
                       .where(PitchSchedule.pitch_id == row.id, PitchSchedule.price_vnd == old_price)
                       .values(price_vnd=data["base_price_vnd"]))
        db.flush()
        if name == "ContentItem":
            from ..moderation import publish_announcement
            publish_announcement(db, row)
            audit(db, viewer, "content_update", "Nội dung", row.id, "", row.title or "Nội dung")
        return display(db, name, row, viewer)
    return run(request, work)


@router.delete("/{name}/{key}")
def delete_record(request: Request, name: str, key: str):
    model = _model(name)

    def work(db, viewer):
        row = _get_visible(db, name, model, key, viewer)
        authorize_write(db, viewer, name, "delete", row, {})
        if name == "ContentItem":
            audit(db, viewer, "content_delete", "Nội dung", row.id, "", row.title or "Nội dung")
        db.delete(row)
        return {"ok": True}
    return run(request, work)
