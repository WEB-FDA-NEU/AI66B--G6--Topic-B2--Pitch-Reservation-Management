from datetime import datetime, timedelta

from conftest import H, client_for, day


def hold(c, pitch="pitch-1", date=None, starts=("18:00",)):
    return c.post("/api/bookings/holds", json={"pitch_id": pitch, "local_date": date or day(2),
                                              "start_times": list(starts)}, headers=H)


def titles(c):
    return [n["title"] for n in c.get("/api/entities/Notification").json()["items"]]


def admin_act(admin, **body):
    return admin.post("/api/admin/actions", json=body, headers=H)


def login(email, password):
    c = client_for()
    return c, c.post("/api/auth/login", json={"email": email, "password": password}, headers=H)


# ---------------------------------------------------------------- cài đặt tài khoản
def test_change_password():
    c = client_for("customer")
    other_device = client_for("customer")
    assert c.post("/api/auth/password", json={"current_password": "sai", "new_password": "matkhau-moi"}, headers=H).status_code == 400
    assert c.post("/api/auth/password", json={"current_password": "123456", "new_password": "123"}, headers=H).status_code == 400
    assert c.post("/api/auth/password", json={"current_password": "123456", "new_password": "123456"}, headers=H).status_code == 400
    r = c.post("/api/auth/password", json={"current_password": "123456", "new_password": "matkhau-moi"}, headers=H)
    assert r.status_code == 200
    assert c.get("/api/auth/me").status_code == 200
    assert other_device.get("/api/auth/me").status_code == 401
    assert login("customer@pitchpoint.test", "123456")[1].status_code == 401
    assert login("customer@pitchpoint.test", "matkhau-moi")[1].status_code == 200
    assert "Mật khẩu đã được thay đổi" in titles(c)


def test_notification_preferences():
    cust, mgr = client_for("customer"), client_for("manager")
    assert cust.patch("/api/auth/me", json={"preferences": {"bogus": True}}, headers=H).status_code == 400
    assert cust.patch("/api/auth/me", json={"preferences": {"notify_bookings": "no"}}, headers=H).status_code == 400
    me = cust.patch("/api/auth/me", json={"preferences": {"notify_bookings": False}}, headers=H).json()
    assert me["preferences"]["notify_bookings"] is False
    b = hold(cust).json()["booking"]
    assert cust.post(f"/api/bookings/{b['id']}/payment", headers=H).status_code == 200
    assert "Đặt sân thành công" not in titles(cust)
    assert "Có đơn đặt sân mới" in titles(mgr)
    mgr.post(f"/api/bookings/{b['id']}/cancellation", json={"reason": "Bảo trì"}, headers=H)
    assert "Đơn đặt sân đã hủy" in titles(cust)


def test_privacy_show_phone():
    mgr, cust = client_for("manager"), client_for("customer")
    mgr.patch("/api/auth/me", json={"phone": "0909000111"}, headers=H)
    seen = lambda: cust.get("/api/entities/User/user-manager").json()  # noqa: E731
    assert seen().get("phone") == "0909000111"
    mgr.patch("/api/auth/me", json={"preferences": {"show_phone": False}}, headers=H)
    assert "phone" not in seen()
    assert mgr.get("/api/auth/me").json()["phone"] == "0909000111"


# ---------------------------------------------------------------- quên mật khẩu
def test_password_reset_request_does_not_leak_emails():
    anon, admin = client_for(), client_for("admin")
    r1 = anon.post("/api/auth/password-reset", json={"email": "khong-co@pitchpoint.test"}, headers=H)
    r2 = anon.post("/api/auth/password-reset", json={"email": "dung@pitchpoint.test", "note": "Gọi 0987100200"}, headers=H)
    assert r1.status_code == r2.status_code == 200 and r1.json() == r2.json()
    anon.post("/api/auth/password-reset", json={"email": "dung@pitchpoint.test"}, headers=H)
    reqs = [x for x in admin.get("/api/entities/Report").json()["items"] if x["target_type"] == "password_reset"]
    assert len(reqs) == 1 and reqs[0]["target_id"] == "user-dung" and "0987100200" in reqs[0]["details"]
    assert any(t.startswith("Yêu cầu đặt lại mật khẩu") for t in titles(admin))
    assert anon.post("/api/auth/password-reset", json={"email": "dung@pitchpoint.test"}, headers=H).status_code == 200
    assert anon.post("/api/auth/password-reset", json={"email": "dung@pitchpoint.test"}, headers=H).status_code == 429
    assert anon.post("/api/auth/password-reset", json={"email": "khong-phai-email"}, headers=H).status_code == 400


def test_admin_resets_password_and_user_must_change_it():
    admin, anon = client_for("admin"), client_for()
    victim = client_for("dung@pitchpoint.test")
    anon.post("/api/auth/password-reset", json={"email": "dung@pitchpoint.test"}, headers=H)
    assert admin_act(client_for("manager"), action="reset_password", user_id="user-dung").status_code == 403
    assert admin_act(admin, action="reset_password", user_id="user-admin").status_code == 403
    r = admin_act(admin, action="reset_password", user_id="user-dung")
    assert r.status_code == 200
    temp = r.json()["temporary_password"]
    assert len(temp) == 10
    assert victim.get("/api/auth/me").status_code == 401
    assert login("dung@pitchpoint.test", "123456")[1].status_code == 401
    c, r = login("dung@pitchpoint.test", temp)
    assert r.status_code == 200 and r.json()["must_change_password"] is True
    assert c.get("/api/entities/Booking").status_code == 200
    blocked = hold(c)
    assert blocked.status_code == 403 and "mật khẩu tạm" in blocked.json()["error"]
    assert c.post("/api/auth/password", json={"current_password": temp, "new_password": "dung-moi-1"}, headers=H).status_code == 200
    assert c.get("/api/auth/me").json()["must_change_password"] is False
    assert hold(c).status_code == 201
    reqs = [x for x in admin.get("/api/entities/Report").json()["items"] if x["target_type"] == "password_reset"]
    assert reqs[0]["status"] == "resolved"
    log = admin.get("/api/entities/AuditEvent").json()["items"]
    assert any(e["action"] == "reset_password" for e in log) and not any(temp in str(e) for e in log)


# ---------------------------------------------------------------- cài đặt hệ thống
def test_public_settings_defaults():
    s = client_for().get("/api/settings").json()
    assert s == {"hold_minutes": 10, "booking_advance_days": 7, "cancellation_notice_hours": 2,
                 "initial_balance_vnd": 2_000_000, "password_min_length": 6, "session_days": 14,
                 "cancellation_review_count": 4, "cancellation_review_days": 30}


def test_admin_changes_settings_and_rules_follow():
    admin, cust = client_for("admin"), client_for("customer")
    assert admin_act(cust, action="save_settings", settings={"hold_minutes": 15}).status_code == 403
    assert admin_act(admin, action="save_settings", settings={"hold_minutes": 99}).status_code == 400
    assert admin_act(admin, action="save_settings", settings={"nope": 1}).status_code == 400
    assert admin_act(admin, action="save_settings", settings={"hold_minutes": 12.5}).status_code == 400
    r = admin_act(admin, action="save_settings", settings={"hold_minutes": 15, "booking_advance_days": 3,
                                                           "initial_balance_vnd": 500000, "password_min_length": 8})
    assert r.status_code == 200 and r.json()["changed"] == 4
    assert client_for().get("/api/settings").json()["hold_minutes"] == 15
    b = hold(cust, date=day(2)).json()["booking"]
    left = (datetime.fromisoformat(b["hold_expires_at"].rstrip("Z")) - datetime.fromisoformat(b["created_date"].rstrip("Z")))
    assert timedelta(minutes=14, seconds=55) <= left <= timedelta(minutes=15, seconds=5)
    r = hold(client_for("giang@pitchpoint.test"), date=day(5))
    assert r.status_code == 400 and "3 ngày" in r.json()["error"]
    anon = client_for()
    assert anon.post("/api/auth/register", json={"email": "n1@pitchpoint.test", "password": "1234567"}, headers=H).status_code == 400
    assert anon.post("/api/auth/register", json={"email": "n1@pitchpoint.test", "password": "12345678"}, headers=H).status_code == 201
    n1 = client_for()
    n1.post("/api/auth/login", json={"email": "n1@pitchpoint.test", "password": "12345678"}, headers=H)
    assert n1.get("/api/entities/Wallet").json()["items"][0]["balance_vnd"] == 500000
    log = admin.get("/api/entities/AuditEvent").json()["items"]
    assert any(e["action"] == "save_settings" and "15" in (e["reason"] or "") for e in log)
    rows = {s["key"]: s for s in admin.get("/api/admin/settings").json()["settings"]}
    assert rows["hold_minutes"]["value"] == 15 and rows["hold_minutes"]["updated_by_name"]
    assert cust.get("/api/admin/settings").status_code == 403


# ---------------------------------------------------------------- tin nhắn hỗ trợ
def test_support_messages_between_users_and_admin():
    cust, mgr, admin = client_for("customer"), client_for("manager"), client_for("admin")
    r = cust.post("/api/conversations", json={"to_admin": True, "body": "Cho em hỏi về hoàn tiền"}, headers=H)
    assert r.status_code == 201
    cid = r.json()["conversation_id"]
    assert cust.post("/api/conversations", json={"to_admin": True, "body": "Em gửi thêm"}, headers=H).json()["conversation_id"] == cid
    conv = admin.get(f"/api/entities/Conversation/{cid}").json()
    assert conv["kind"] == "support" and conv["customer_id"] == "user-customer"
    assert any(t.startswith("Tin nhắn mới từ") for t in titles(admin))
    assert admin.post(f"/api/conversations/{cid}/messages", json={"body": "Chào bạn, mình hỗ trợ nhé"}, headers=H).status_code == 201
    assert "Tin nhắn mới từ Quản trị viên Pitch Point" in titles(cust)
    msgs = cust.get(f"/api/entities/Message?where={{\"conversation_id\":\"{cid}\"}}").json()["items"]
    assert [m["sender_role"] for m in msgs].count("admin") == 1
    mcid = mgr.post("/api/conversations", json={"to_admin": True, "body": "Sân tôi cần mở thêm giờ"}, headers=H).json()["conversation_id"]
    assert mcid != cid
    assert mgr.get(f"/api/entities/Conversation/{cid}").status_code == 404
    assert mgr.post(f"/api/conversations/{cid}/messages", json={"body": "x"}, headers=H).status_code == 403
    assert mgr.post(f"/api/conversations/{mcid}/warnings", json={"reason": "x"}, headers=H).status_code == 403
    r = admin.post("/api/conversations", json={"user_id": "user-dung", "body": "Chào Dũng"}, headers=H)
    assert r.status_code == 201
    dung = client_for("dung@pitchpoint.test")
    assert dung.get(f"/api/entities/Conversation/{r.json()['conversation_id']}").status_code == 200
    assert admin.post("/api/conversations", json={"user_id": "user-admin", "body": "x"}, headers=H).status_code == 404
