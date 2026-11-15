from sqlalchemy import select

from conftest import H, client_for
from app import db
from app.models import User


def stored_hash(email):
    with db.session_scope() as s:
        return s.scalar(select(User.password_hash).where(User.email == email))


def test_register_stores_bcrypt_hash_never_plain_text():
    c = client_for()
    r = c.post("/api/auth/register", json={"email": "bcrypt@pitchpoint.test", "password": "matkhau123", "full_name": "B"}, headers=H)
    assert r.status_code == 201, r.text
    h = stored_hash("bcrypt@pitchpoint.test")
    assert h.startswith("$2b$") and "matkhau123" not in h and len(h) == 60
    assert "password_hash" not in r.text and "$2b$" not in r.text
    assert c.post("/api/auth/login", json={"email": "bcrypt@pitchpoint.test", "password": "matkhau123"}, headers=H).status_code == 200
    assert c.post("/api/auth/login", json={"email": "bcrypt@pitchpoint.test", "password": "sai"}, headers=H).status_code == 401


def test_seeded_accounts_use_bcrypt():
    assert stored_hash("customer@pitchpoint.test").startswith("$2b$")


def test_password_over_72_bytes_is_a_user_error_not_500():
    c = client_for()
    r = c.post("/api/auth/register", json={"email": "dai@pitchpoint.test", "password": "a" * 73, "full_name": "D"}, headers=H)
    assert r.status_code == 400 and "72" in r.json()["error"]
    assert c.post("/api/auth/register", json={"email": "dau@pitchpoint.test", "password": "ệ" * 30, "full_name": "D"}, headers=H).status_code == 400
    assert c.post("/api/auth/register", json={"email": "vua@pitchpoint.test", "password": "a" * 72, "full_name": "V"}, headers=H).status_code == 201
    assert c.post("/api/auth/login", json={"email": "customer@pitchpoint.test", "password": "a" * 500}, headers=H).status_code == 401
