from __future__ import annotations

import os
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent


def _load_dotenv() -> None:
    env_file = BACKEND_DIR / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()


def _bool(name: str, default: bool) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


# Chuỗi kết nối chỉ đọc từ biến môi trường hoặc backend/.env, không viết trong code.
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("Chưa cấu hình DATABASE_URL. Sao chép backend/.env.example thành backend/.env "
                       "rồi sửa nếu cần (xem docs/SETUP.md).")
FRONTEND_DIR = Path(os.environ.get("FRONTEND_DIR", str(PROJECT_DIR / "frontend"))).resolve()
SEED_FILE = Path(os.environ.get("SEED_FILE", str(BACKEND_DIR / "seed.json"))).resolve()
SERVE_FRONTEND = _bool("SERVE_FRONTEND", True)
SEED_DEMO = _bool("SEED_DEMO", True)

SESSION_COOKIE = os.environ.get("SESSION_COOKIE", "pp_session")
SESSION_DAYS = int(os.environ.get("SESSION_DAYS", "14"))
BCRYPT_ROUNDS = int(os.environ.get("BCRYPT_ROUNDS", "12"))

TIMEZONE = "Asia/Ho_Chi_Minh"
UTC_OFFSET_HOURS = 7
BOOKING_ADVANCE_DAYS = 7
HOLD_DURATION_SECONDS = 10 * 60
CANCELLATION_NOTICE_SECONDS = 2 * 60 * 60
INITIAL_BALANCE_VND = int(os.environ.get("INITIAL_BALANCE_VND", "2000000"))
MIN_PRICE_VND = 50_000
MAX_PRICE_VND = 20_000_000
PITCH_IMAGE_LIMIT = 3
SYNC_INTERVAL_SECONDS = int(os.environ.get("SYNC_INTERVAL_SECONDS", "30"))
