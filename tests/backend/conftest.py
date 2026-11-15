import os
import sys
import tempfile
from pathlib import Path

import pytest

_tmp = Path(tempfile.mkdtemp()) / "test.db"
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_tmp.as_posix()}"
os.environ["SERVE_FRONTEND"] = "false"
os.environ["SEED_DEMO"] = "false"
os.environ.setdefault("BCRYPT_ROUNDS", "4")
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from fastapi.testclient import TestClient  # noqa: E402

from app import seed  # noqa: E402
from app.main import app  # noqa: E402
from app.timeutil import add_days, set_clock_offset, today_local  # noqa: E402

H = {"X-Requested-With": "PitchPoint"}


@pytest.fixture(autouse=True)
def fresh_db():
    seed.reset()
    set_clock_offset(__import__("datetime").timedelta(0))
    yield
    set_clock_offset(__import__("datetime").timedelta(0))


def client_for(role: str | None = None) -> TestClient:
    c = TestClient(app)
    if role:
        email = role if "@" in role else f"{role}@pitchpoint.test"
        r = c.post("/api/auth/login", json={"email": email, "password": "123456"}, headers=H)
        assert r.status_code == 200, r.text
    return c


@pytest.fixture
def customer():
    return client_for("customer")


@pytest.fixture
def manager():
    return client_for("manager")


@pytest.fixture
def admin():
    return client_for("admin")


def day(n: int) -> str:
    return add_days(today_local(), n)
