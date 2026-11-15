from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import OAuth2PasswordBearer
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import assets, config
from .db import session_scope, write_lock
from .routers import auth, business, entities
from .rules import ApiError, sync
from .security import delete_expired_sessions
from .seed import seed_if_empty

log = logging.getLogger("pitchpoint")


def _periodic_sync(cleanup_uploads: bool = False) -> None:
    with write_lock, session_scope() as db:
        sync(db)
        delete_expired_sessions(db)
        from .rate_limit import purge
        purge(db)
    if cleanup_uploads:
        from .uploads import cleanup_orphans
        with session_scope() as db:
            count, freed = cleanup_orphans(db)
        if count:
            log.info("Đã xóa %s ảnh không còn dùng (%.1f KB)", count, freed / 1024)


CLEANUP_EVERY = max(1, 600 // max(1, config.SYNC_INTERVAL_SECONDS))


async def _sync_loop() -> None:
    tick = 0
    while True:
        await asyncio.sleep(config.SYNC_INTERVAL_SECONDS)
        tick += 1
        try:
            await asyncio.to_thread(_periodic_sync, tick % CLEANUP_EVERY == 0)
        except Exception:  # noqa: BLE001
            log.exception("Đồng bộ trạng thái đơn thất bại")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed_if_empty()
    task = asyncio.create_task(_sync_loop())
    yield
    task.cancel()


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False,
                                     description="Nhập email vào ô username và mật khẩu (tài khoản mẫu: 123456).")

app = FastAPI(title="Pitch Point API", version="1.0.0", lifespan=lifespan,
              docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None,
              dependencies=[Depends(oauth2_scheme)],
              swagger_ui_parameters={"persistAuthorization": True})

# Nén gzip các phản hồi lớn.
app.add_middleware(GZipMiddleware, minimum_size=1024)

UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}
CSRF_ALWAYS = {"/api/auth/login", "/api/auth/register", "/api/auth/password-reset"}


def html_page(page: Path, status_code: int = 200) -> HTMLResponse:
    """Trang HTML đã gắn phiên bản CSS/JS."""
    return HTMLResponse(assets.render_html(page), status_code=status_code, headers={"Cache-Control": "no-cache"})


def _needs_csrf_header(request: Request) -> bool:
    if request.url.path in CSRF_ALWAYS:
        return True
    if request.headers.get("authorization", "").lower().startswith("bearer "):
        return False
    return config.SESSION_COOKIE in request.cookies


@app.middleware("http")
async def guard(request: Request, call_next):
    path = request.url.path
    if (path.startswith("/api/") and request.method in UNSAFE and _needs_csrf_header(request)
            and request.headers.get("x-requested-with") != "PitchPoint"):
        return JSONResponse({"error": "Yêu cầu không hợp lệ."}, status_code=403)
    response: Response = await call_next(request)
    if path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    elif path.endswith(".html") or path.endswith("/"):
        response.headers["Cache-Control"] = "no-cache"
    elif request.query_params.get("v") and response.status_code == 200:
        # File có phiên bản (?v=, xem assets.py) được cache lâu dài.
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    return response


@app.exception_handler(ApiError)
async def api_error(_request: Request, exc: ApiError):
    return JSONResponse({"error": exc.message}, status_code=exc.status)


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, _exc: RequestValidationError):
    return JSONResponse({"error": "Dữ liệu gửi lên không hợp lệ."}, status_code=422)


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    if request.url.path.startswith("/api/") or not config.SERVE_FRONTEND:
        message = "Không tìm thấy địa chỉ API." if exc.status_code == 404 else "Yêu cầu không hợp lệ."
        return JSONResponse({"error": message}, status_code=exc.status_code)
    page = config.FRONTEND_DIR / ("404.html" if exc.status_code == 404 else "500.html")
    return html_page(page, exc.status_code) if page.exists() else JSONResponse({}, exc.status_code)


@app.exception_handler(Exception)
async def server_error(request: Request, exc: Exception):
    log.exception("Lỗi không mong muốn", exc_info=exc)
    if request.url.path.startswith("/api/"):
        return JSONResponse({"error": "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."}, status_code=500)
    page = config.FRONTEND_DIR / "500.html"
    return html_page(page, 500) if page.exists() else JSONResponse({}, 500)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/docs", include_in_schema=False)
def docs_shortcut():
    return RedirectResponse("/api/docs")


from .uploads import router as uploads_router
app.include_router(uploads_router)
app.include_router(auth.router)
app.include_router(business.router)
app.include_router(entities.router)


if config.SERVE_FRONTEND:
    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path.startswith("api/"):
            raise StarletteHTTPException(404)
        root = config.FRONTEND_DIR
        target = (root / (path or "index.html")).resolve()
        if target.is_dir():
            target = target / "index.html"
        if root not in target.parents and target != root or not target.is_file():
            raise StarletteHTTPException(404)
        if target.name == "screen-template.html" or target.suffix.lower() == ".md":
            raise StarletteHTTPException(404)
        if target.suffix.lower() == ".html":
            return html_page(target)
        return FileResponse(target)


__all__ = ["app", "Path"]
