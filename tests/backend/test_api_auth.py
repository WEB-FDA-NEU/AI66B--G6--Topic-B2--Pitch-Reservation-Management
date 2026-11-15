from fastapi.testclient import TestClient

from conftest import H, client_for, day
from app.main import app


def bare():
    return TestClient(app)


def token_for(email="customer@pitchpoint.test", password="123456"):
    r = bare().post("/api/auth/token", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["token_type"] == "bearer" and len(body["access_token"]) > 30
    return body["access_token"]


def test_private_data_without_login_is_401_public_data_stays_open():
    c = bare()
    for name in ["Booking", "Wallet", "Payment", "Refund", "Notification", "Conversation", "Message", "Favorite",
                 "Warning", "Report", "AuditEvent"]:
        r = c.get(f"/api/entities/{name}")
        assert r.status_code == 401, (name, r.text)
        assert r.json()["error"] == "Vui lòng đăng nhập."
    assert c.get("/api/entities/Booking/any-id").status_code == 401
    for name in ["Pitch", "PitchSchedule", "AvailabilityOverride", "Review", "ContentItem", "User"]:
        assert c.get(f"/api/entities/{name}").status_code == 200, name
    assert c.get("/api/search/pitches").status_code == 200
    assert c.get("/api/pitches/pitch-1/availability", params={"local_date": day(1)}).status_code == 200
    assert c.get("/api/auth/me").status_code == 401
    assert c.get("/api/admin/settings").status_code == 401


def test_writes_without_login_are_401_even_without_csrf_header():
    c = bare()
    assert c.post("/api/bookings/holds", json={"pitch_id": "pitch-1", "local_date": day(2), "start_times": ["18:00"]}).status_code == 401
    assert c.post("/api/bookings/some-id/payment").status_code == 401
    assert c.post("/api/conversations", json={"pitch_id": "pitch-1", "body": "hi"}).status_code == 401
    assert c.post("/api/admin/actions", json={"action": "suspend_user"}).status_code == 401
    assert c.post("/api/entities/Favorite", json={"pitch_id": "pitch-1"}).status_code == 401
    assert c.post("/api/auth/login", json={"email": "customer@pitchpoint.test", "password": "123456"}).status_code == 403


def test_bearer_token_works_like_the_cookie_and_logout_revokes_it():
    tok = token_for()
    auth = {"Authorization": f"Bearer {tok}"}
    c = bare()
    me = c.get("/api/auth/me", headers=auth)
    assert me.status_code == 200 and me.json()["email"] == "customer@pitchpoint.test"
    assert c.get("/api/entities/Booking", headers=auth).json()["total"] >= 0
    hold = c.post("/api/bookings/holds", headers=auth, json={"pitch_id": "pitch-1", "local_date": day(2), "start_times": ["18:00"]})
    assert hold.status_code == 200, hold.text
    assert c.get("/api/auth/me", headers={"Authorization": "Bearer sai-token"}).status_code == 401
    assert c.post("/api/auth/logout", headers=auth).status_code == 200
    assert c.get("/api/auth/me", headers=auth).status_code == 401


def test_token_endpoint_accepts_json_and_rejects_wrong_password():
    c = bare()
    assert c.post("/api/auth/token", json={"email": "admin@pitchpoint.test", "password": "123456"}).status_code == 200
    r = c.post("/api/auth/token", data={"username": "admin@pitchpoint.test", "password": "sai"})
    assert r.status_code == 401 and "không đúng" in r.json()["error"]
    assert c.post("/api/auth/token", data={}).status_code == 401


def test_cookie_session_still_needs_csrf_header():
    c = client_for("customer")
    body = {"pitch_id": "pitch-1", "local_date": day(2), "start_times": ["19:00"]}
    assert c.post("/api/bookings/holds", json=body).status_code == 403
    assert c.post("/api/bookings/holds", json=body, headers=H).status_code == 200


def test_docs_shortcut_and_authorize_button():
    c = bare()
    r = c.get("/docs", follow_redirects=False)
    assert r.status_code in (302, 307) and r.headers["location"] == "/api/docs"
    schemes = c.get("/api/openapi.json").json()["components"]["securitySchemes"]
    assert schemes["OAuth2PasswordBearer"]["flows"]["password"]["tokenUrl"] == "/api/auth/token"
