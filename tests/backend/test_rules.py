import threading
from datetime import timedelta

from conftest import H, client_for, day

from app.timeutil import set_clock_offset


def hold(c, pitch="pitch-1", date=None, starts=("18:00", "19:00"), **extra):
    return c.post("/api/bookings/holds", json={"pitch_id": pitch, "local_date": date or day(1),
                                               "start_times": list(starts), **extra}, headers=H)


def pay(c, booking_id):
    return c.post(f"/api/bookings/{booking_id}/payment", json={}, headers=H)


def balance(c):
    return c.get("/api/entities/Wallet").json()["items"][0]["balance_vnd"]


# ---------------------------------------------------------------- đăng nhập
def test_login_wrong_password_and_me():
    c = client_for()
    assert c.get("/api/auth/me").status_code == 401
    assert c.get("/api/auth/session").json() == {"user": None}
    r = c.post("/api/auth/login", json={"email": "customer@pitchpoint.test", "password": "sai"}, headers=H)
    assert r.status_code == 401
    assert "password_hash" not in client_for("customer").get("/api/auth/me").json()


def test_register_gives_initial_balance_and_rejects_duplicate():
    c = client_for()
    body = {"email": "new@pitchpoint.test", "password": "abcdef", "full_name": "Người mới"}
    assert c.post("/api/auth/register", json=body, headers=H).status_code == 200
    assert c.post("/api/auth/register", json=body, headers=H).status_code == 409
    assert c.post("/api/auth/register", json={**body, "email": "x@y.z", "password": "123"}, headers=H).status_code == 400
    c2 = client_for()
    c2.post("/api/auth/login", json={"email": "new@pitchpoint.test", "password": "abcdef"}, headers=H)
    assert balance(c2) == 2_000_000


def test_csrf_header_required(customer):
    assert customer.post("/api/bookings/holds", json={}).status_code == 403


# ---------------------------------------------------------------- giữ chỗ / thanh toán
def test_hold_pay_flow(customer):
    r = hold(customer)
    assert r.status_code == 200, r.text
    b = r.json()["booking"]
    assert b["status"] == "pending" and b["amount_vnd"] == 500_000 and b["code"].startswith("PP-")
    r = pay(customer, b["id"])
    assert r.status_code == 200 and r.json()["booking"]["status"] == "confirmed"
    assert balance(customer) == 1_500_000
    slots = customer.get(f"/api/pitches/pitch-1/availability?local_date={day(1)}").json()["slots"]
    assert {s["start"]: s["state"] for s in slots}["18:00"] == "booked"
    assert pay(customer, b["id"]).status_code == 409


def test_one_pending_hold_per_customer(customer):
    assert hold(customer).status_code == 200
    r = hold(customer, pitch="pitch-2", starts=("07:00",))
    assert r.status_code == 409 and "đang giữ chỗ" in r.json()["error"]


def test_slots_must_be_contiguous_and_within_7_days(customer):
    assert hold(customer, starts=("08:00", "10:00")).status_code == 409
    r = hold(customer, date=day(8))
    assert r.status_code == 400 and "7 ngày" in r.json()["error"]
    assert hold(customer, date=day(7), starts=("08:00",)).status_code == 200


def test_base_price_change_updates_weekly_schedule(manager, customer):
    r = manager.patch("/api/entities/Pitch/pitch-1", json={"base_price_vnd": 260000}, headers=H)
    assert r.status_code == 200 and r.json()["base_price_vnd"] == 260000
    slots = customer.get(f"/api/pitches/pitch-1/availability?local_date={day(2)}").json()["slots"]
    assert slots and all(s["price_vnd"] == 260000 for s in slots)
    assert hold(customer, date=day(2), starts=("08:00",)).json()["booking"]["amount_vnd"] == 260000


def test_insufficient_balance(customer):
    r = hold(customer, pitch="pitch-2", starts=("06:00", "07:00", "08:00", "09:00", "10:00", "11:00"))
    assert r.status_code == 400 and "Số dư" in r.json()["error"]


def test_hold_expires_after_10_minutes(customer):
    b = hold(customer).json()["booking"]
    set_clock_offset(timedelta(minutes=11))
    rows = customer.get("/api/entities/Booking").json()["items"]
    assert rows[0]["status"] == "cancelled" and rows[0]["cancel_type"] == "hold_expired"
    assert pay(customer, b["id"]).status_code == 409


def test_release_hold(customer):
    b = hold(customer).json()["booking"]
    r = customer.post(f"/api/bookings/{b['id']}/cancellation", json={}, headers=H)
    assert r.json()["booking"]["cancel_type"] == "hold_released"
    assert hold(customer).status_code == 200


def test_two_customers_same_slot_concurrently():
    c1 = client_for("customer")
    c2 = client_for()
    c2.post("/api/auth/register", json={"email": "b@pitchpoint.test", "password": "123456"}, headers=H)
    c2 = client_for("b@pitchpoint.test")
    results = []
    barrier = threading.Barrier(2)

    def go(c):
        barrier.wait()
        results.append(hold(c).status_code)

    threads = [threading.Thread(target=go, args=(c,)) for c in (c1, c2)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert sorted(results) == [200, 409]


# ---------------------------------------------------------------- hủy / đổi lịch / đánh giá
def test_customer_cancel_refund_and_2h_rule(customer):
    b = hold(customer).json()["booking"]
    pay(customer, b["id"])
    r = customer.post(f"/api/bookings/{b['id']}/cancellation", json={"reason": "bận"}, headers=H)
    assert r.status_code == 200 and r.json()["refund"]["amount_vnd"] == 500_000
    assert balance(customer) == 2_000_000
    b2 = hold(customer).json()["booking"]
    pay(customer, b2["id"])
    set_clock_offset(timedelta(hours=24 + 17))
    r = customer.post(f"/api/bookings/{b2['id']}/cancellation", json={}, headers=H)
    assert r.status_code == 409


def test_reschedule_once(customer):
    a = hold(customer).json()["booking"]
    pay(customer, a["id"])
    n = hold(customer, date=day(2), starts=("17:00",), reschedule_from_id=a["id"]).json()["booking"]
    assert n["reschedule_count"] == 1
    r = pay(customer, n["id"])
    assert r.status_code == 200 and r.json()["rescheduled_from"] == a["id"]
    old = customer.get(f"/api/entities/Booking/{a['id']}").json()
    assert old["cancel_type"] == "rescheduled" and old["payment_status"] == "refunded"
    assert balance(customer) == 2_000_000 - 250_000
    r = hold(customer, date=day(3), starts=("17:00",), reschedule_from_id=n["id"])
    assert r.status_code == 400 and "một lần" in r.json()["error"]
    r = hold(customer, pitch="pitch-2", date=day(3), starts=("17:00",), reschedule_from_id=n["id"])
    assert r.status_code == 400


def test_reschedule_abandoned_keeps_original(customer):
    a = hold(customer).json()["booking"]
    pay(customer, a["id"])
    n = hold(customer, date=day(2), starts=("17:00",), reschedule_from_id=a["id"]).json()["booking"]
    customer.post(f"/api/bookings/{n['id']}/cancellation", json={}, headers=H)
    assert customer.get(f"/api/entities/Booking/{a['id']}").json()["status"] == "confirmed"


def test_review_after_completion_once(customer):
    b = hold(customer).json()["booking"]
    pay(customer, b["id"])
    body = {"booking_id": b["id"], "rating": 5, "body": "Tốt"}
    assert customer.post("/api/reviews", json=body, headers=H).status_code == 400
    set_clock_offset(timedelta(days=2))
    assert customer.get(f"/api/entities/Booking/{b['id']}").json()["status"] == "completed"
    assert customer.post("/api/reviews", json=body, headers=H).status_code == 200
    assert customer.post("/api/reviews", json=body, headers=H).status_code == 409


# ---------------------------------------------------------------- quyền đọc / ghi
def test_read_scoping(customer, manager, admin):
    b = hold(customer).json()["booking"]
    other = client_for()
    other.post("/api/auth/register", json={"email": "o@pitchpoint.test", "password": "123456"}, headers=H)
    other = client_for("o@pitchpoint.test")
    assert other.get(f"/api/entities/Booking/{b['id']}").status_code == 404
    assert other.get("/api/entities/Booking").json()["total"] == 0
    assert manager.get("/api/entities/Booking").json()["total"] == 1
    assert customer.get("/api/entities/AuditEvent").json()["total"] == 0
    users = customer.get("/api/entities/User").json()["items"]
    assert all(u["app_role"] != "admin" for u in users) and all("password_hash" not in u for u in users)
    assert "email" not in [u for u in users if u["app_role"] == "manager"][0]
    assert admin.get("/api/entities/User").json()["total"] == 11


def test_manager_cannot_touch_other_managers_pitch(customer, manager):
    other = client_for("manager2")
    b = hold(customer).json()["booking"]
    assert pay(customer, b["id"]).status_code == 200
    assert other.patch("/api/entities/Pitch/pitch-1", json={"name": "Sân của tôi"}, headers=H).status_code == 403
    assert other.post("/api/pitches/pitch-1/status", json={"status": "paused"}, headers=H).status_code == 403
    assert other.post(f"/api/bookings/{b['id']}/cancellation", json={"reason": "x"}, headers=H).status_code in (404, 409)
    assert other.get(f"/api/entities/Booking/{b['id']}").status_code == 404
    assert other.get("/api/entities/Booking").json()["total"] == 0
    mine = [p["id"] for p in other.get("/api/entities/Pitch?where=" + '{"manager_id":"user-manager-2"}').json()["items"]]
    assert sorted(mine) == ["pitch-4", "pitch-5", "pitch-6"]
    assert manager.get(f"/api/entities/Booking/{b['id']}").status_code == 200


def test_no_generic_writes(customer, manager):
    assert customer.post("/api/entities/Payment", json={}, headers=H).status_code == 403
    assert customer.patch("/api/entities/Wallet/wallet-user-customer", json={"balance_vnd": 9}, headers=H).status_code == 403
    assert customer.patch("/api/entities/Pitch/pitch-1", json={"name": "x"}, headers=H).status_code == 403
    r = manager.patch("/api/entities/Pitch/pitch-1", json={"name": "Sân mới", "status": "banned"}, headers=H)
    assert r.status_code == 200 and r.json()["status"] == "active"
    assert manager.patch("/api/entities/Pitch/pitch-1", json={"base_price_vnd": 10}, headers=H).status_code == 400
    assert customer.get("/api/entities/Nope").status_code == 404
    assert customer.get('/api/entities/User?where={"password_hash":"x"}').status_code == 400


def test_manager_create_pitch_idempotent(manager):
    body = {"request_id": "req-1", "pitch": {"name": "Sân A", "address": "1 Láng", "base_price_vnd": 300000,
                                             "open_time": "06:00", "close_time": "22:00", "type": "5v5"}}
    p1 = manager.post("/api/pitches", json=body, headers=H).json()["pitch"]
    p2 = manager.post("/api/pitches", json=body, headers=H).json()["pitch"]
    assert p1["id"] == p2["id"]
    assert manager.post("/api/pitches", json={**body, "request_id": "req-2"}, headers=H).status_code == 409
    bad = {**body, "request_id": "req-3", "pitch": {**body["pitch"], "name": "B", "open_time": "05:00"}}
    assert manager.post("/api/pitches", json=bad, headers=H).status_code == 400


def test_pause_pitch_releases_holds_keeps_confirmed(customer, manager):
    b = hold(customer).json()["booking"]
    pay(customer, b["id"])
    h = hold(customer, date=day(2), starts=("07:00",)).json()["booking"]
    r = manager.post("/api/pitches/pitch-1/status", json={"status": "paused", "reason": "Sửa sân"}, headers=H)
    assert r.json()["released"] == 1 and r.json()["kept"] == 1
    assert customer.get(f"/api/entities/Booking/{h['id']}").json()["cancel_type"] == "pitch_paused"
    assert customer.get(f"/api/entities/Booking/{b['id']}").json()["status"] == "confirmed"
    assert all(p["id"] != "pitch-1" for p in customer.get("/api/search/pitches").json()["results"])


# ---------------------------------------------------------------- quản trị
def test_suspend_customer(customer, admin):
    b = hold(customer).json()["booking"]
    pay(customer, b["id"])
    h = hold(customer, date=day(2), starts=("07:00",)).json()["booking"]
    r = admin.post("/api/admin/actions", json={"action": "suspend_user", "user_id": "user-customer", "reason": "Vi phạm"}, headers=H)
    assert r.json()["released_holds"] == 1
    assert customer.get(f"/api/entities/Booking/{h['id']}").json()["cancel_type"] == "account_suspended"
    assert customer.get(f"/api/entities/Booking/{b['id']}").json()["status"] == "confirmed"
    assert hold(customer, date=day(3)).status_code == 403
    assert customer.post(f"/api/bookings/{b['id']}/cancellation", json={}, headers=H).status_code == 403
    assert customer.post("/api/appeals", json={"body": "ngắn"}, headers=H).status_code == 400
    assert customer.post("/api/appeals", json={"body": "Tôi không vi phạm, xin xem lại."}, headers=H).status_code == 200
    assert customer.post("/api/appeals", json={"body": "Tôi không vi phạm, xin xem lại."}, headers=H).status_code == 409
    admin.post("/api/admin/actions", json={"action": "restore_user", "user_id": "user-customer"}, headers=H)
    appeal = customer.get("/api/entities/Report").json()["items"][0]
    assert appeal["status"] == "resolved"


def test_suspend_manager_hides_pitches(customer, admin):
    admin.post("/api/admin/actions", json={"action": "suspend_user", "user_id": "user-manager", "reason": "x"}, headers=H)
    found = customer.get("/api/search/pitches").json()["results"]
    assert len(found) == 7 and all(p["manager_id"] != "user-manager" for p in found)
    assert hold(customer).status_code == 400


def test_suspend_pitch_refunds_future_bookings(customer, admin):
    b = hold(customer).json()["booking"]
    pay(customer, b["id"])
    r = admin.post("/api/admin/actions", json={"action": "suspend_pitch", "pitch_id": "pitch-1", "reason": "An toàn"}, headers=H)
    assert r.json()["cancelled"] == 1 and r.json()["refunded"] == 500_000
    assert balance(customer) == 2_000_000
    assert admin.post("/api/admin/actions", json={"action": "restore_pitch", "pitch_id": "pitch-1"}, headers=H).status_code == 200
    assert admin.get("/api/entities/AuditEvent").json()["total"] == 2


def test_admin_cannot_change_admin(admin, customer):
    r = admin.post("/api/admin/actions", json={"action": "suspend_user", "user_id": "user-admin", "reason": "x"}, headers=H)
    assert r.status_code == 403
    assert customer.post("/api/admin/actions", json={"action": "suspend_user", "user_id": "user-manager"}, headers=H).status_code == 403


def test_report_rules(customer):
    body = {"target_type": "pitch", "target_id": "pitch-1", "reason": "Sai giá", "details": "..."}
    assert customer.post("/api/entities/Report", json=body, headers=H).status_code == 200
    assert customer.post("/api/entities/Report", json=body, headers=H).status_code == 409
    me = {"target_type": "user", "target_id": "user-customer", "reason": "x"}
    assert customer.post("/api/entities/Report", json=me, headers=H).status_code == 400


def test_messages_and_notifications(customer, manager):
    r = customer.post("/api/conversations", json={"pitch_id": "pitch-1", "body": "Chào anh"}, headers=H)
    conv = r.json()["conversation_id"]
    assert manager.post(f"/api/conversations/{conv}/messages", json={"body": "Chào bạn"}, headers=H).status_code == 200
    n = customer.get("/api/entities/Notification").json()["items"]
    assert n and n[0]["link"].startswith("messages.html?conversationId=")
    assert customer.patch(f"/api/entities/Notification/{n[0]['id']}", json={"read": True, "title": "x"}, headers=H).json()["title"] != "x"
    w = manager.post(f"/api/conversations/{conv}/warnings", json={"reason": "Nói tục"}, headers=H).json()["warning"]
    assert customer.post(f"/api/warnings/{w['id']}/responses", json={"body": "Xin lỗi"}, headers=H).status_code == 200


# ---------------------------------------------------------------- dữ liệu demo và gợi ý ngày trống
def test_demo_seed_is_consistent():
    from sqlalchemy import func, select

    from app import config, db as dbmod, seed
    from app.models import Booking, BookingSlot, Pitch, Review, User, Wallet, WalletTransaction
    config.SEED_DEMO = True
    try:
        seed.reset()
        with dbmod.session_scope() as db:
            for w in db.scalars(select(Wallet)).all():
                total = db.scalar(select(func.sum(WalletTransaction.amount_vnd)).where(WalletTransaction.wallet_id == w.id))
                assert total == w.balance_vnd
                assert w.balance_vnd >= 0, w.user_id
                after = db.scalars(select(WalletTransaction.balance_after_vnd)
                                   .where(WalletTransaction.wallet_id == w.id)).all()
                assert min(after) >= 0, w.user_id
            assert db.scalar(select(func.count()).select_from(Pitch)) == 21
            roles = dict(db.execute(select(User.app_role, func.count()).group_by(User.app_role)).all())
            assert roles == {"admin": 1, "manager": 8, "customer": 15}, roles
            assert {c for (c,) in db.execute(select(Pitch.city)).all()} == {"Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"}
            assert {t for (t,) in db.execute(select(Pitch.type)).all()} == {"5v5", "7v7", "11v11"}
            assert {s for (s,) in db.execute(select(Pitch.status)).all()} == {"active", "paused"}
            assert db.scalar(select(func.count()).select_from(Booking)) >= 60
            assert db.scalar(select(func.count()).select_from(Pitch).where(Pitch.manager_id == "user-manager-5")) == 3
            statuses = {s for (s,) in db.execute(select(Booking.status)).all()}
            assert statuses == {"completed", "confirmed", "cancelled"}
            confirmed = db.scalars(select(Booking).where(Booking.status == "confirmed")).all()
            assert db.scalar(select(func.count()).select_from(BookingSlot)) == sum(len(b.slot_starts) for b in confirmed)
            assert db.scalar(select(func.count()).select_from(Review)) >= 20
    finally:
        config.SEED_DEMO = False
        seed.reset()


def test_search_suggests_next_free_slot(customer, manager):
    r = manager.post("/api/entities/AvailabilityOverride", json={"pitch_id": "pitch-1", "local_date": day(1), "start_time": "00:00",
                                                                 "end_time": "23:59", "status": "blocked"}, headers=H)
    assert r.status_code == 200
    res = customer.get(f"/api/search/pitches?date={day(1)}").json()["results"]
    p1 = next(p for p in res if p["id"] == "pitch-1")
    assert p1["available_count"] == 0 and p1["next_slot"]["local_date"] == day(2)
    assert customer.get("/api/pitches/pitch-1/next-available-date").json()["local_date"] in (day(0), day(2))
