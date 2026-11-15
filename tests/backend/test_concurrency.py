import threading
from datetime import timedelta

from sqlalchemy import func, select

from conftest import H, client_for, day

from app import db as dbmod
from app.models import Booking, Pitch, Refund, Wallet, WalletTransaction
from app.timeutil import set_clock_offset

CUSTOMERS = ["customer", "dung@pitchpoint.test", "giang@pitchpoint.test", "hai@pitchpoint.test",
             "khanh@pitchpoint.test"]


def at_once(*calls):
    barrier = threading.Barrier(len(calls))
    out = [None] * len(calls)

    def go(i, fn):
        barrier.wait()
        out[i] = fn()

    threads = [threading.Thread(target=go, args=(i, fn)) for i, fn in enumerate(calls)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    return out


def hold(c, pitch="pitch-1", date=None, starts=("18:00",)):
    return c.post("/api/bookings/holds", json={"pitch_id": pitch, "local_date": date or day(2),
                                              "start_times": list(starts)}, headers=H)


def ledger_consistent():
    with dbmod.session_scope() as db:
        for w in db.scalars(select(Wallet)).all():
            total = db.scalar(select(func.sum(WalletTransaction.amount_vnd)).where(WalletTransaction.wallet_id == w.id))
            assert (total or 0) == w.balance_vnd, w.user_id


def balance(c):
    return c.get("/api/entities/Wallet").json()["items"][0]["balance_vnd"]


def test_many_customers_same_slot():
    clients = [client_for(e) for e in CUSTOMERS]
    for i in range(3):
        anon = client_for()
        anon.post("/api/auth/register", json={"email": f"race{i}@pitchpoint.test", "password": "123456"}, headers=H)
        clients.append(client_for(f"race{i}@pitchpoint.test"))
    codes = [r.status_code for r in at_once(*[lambda c=c: hold(c) for c in clients])]
    assert codes.count(201) == 1 and codes.count(409) == len(clients) - 1, codes
    with dbmod.session_scope() as db:
        assert db.scalar(select(func.count()).select_from(Booking).where(Booking.status == "pending")) == 1


def test_overlapping_multi_slot_holds():
    a, b = client_for("dung@pitchpoint.test"), client_for("giang@pitchpoint.test")
    r1, r2 = at_once(lambda: hold(a, starts=("17:00", "18:00")), lambda: hold(b, starts=("18:00", "19:00")))
    assert sorted([r1.status_code, r2.status_code]) == [201, 409]


def test_double_pay_charges_once():
    c1, c2 = client_for("customer"), client_for("customer")
    b = hold(c1).json()["booking"]
    before = balance(c1)
    r1, r2 = at_once(lambda: c1.post(f"/api/bookings/{b['id']}/payment", headers=H),
                     lambda: c2.post(f"/api/bookings/{b['id']}/payment", headers=H))
    assert sorted([r1.status_code, r2.status_code]) == [200, 409]
    assert balance(c1) == before - b["amount_vnd"]
    ledger_consistent()


def test_customer_and_manager_cancel_at_once_refund_once():
    cust, mgr = client_for("customer"), client_for("manager")
    b = hold(cust).json()["booking"]
    assert cust.post(f"/api/bookings/{b['id']}/payment", headers=H).status_code == 200
    paid = balance(cust)
    r1, r2 = at_once(lambda: cust.post(f"/api/bookings/{b['id']}/cancellation", json={}, headers=H),
                     lambda: mgr.post(f"/api/bookings/{b['id']}/cancellation", json={"reason": "Bảo trì"}, headers=H))
    assert sorted([r1.status_code, r2.status_code]) == [200, 409], (r1.text, r2.text)
    assert balance(cust) == paid + b["amount_vnd"]
    with dbmod.session_scope() as db:
        assert db.scalar(select(func.count()).select_from(Refund).where(Refund.booking_id == b["id"])) == 1
    ledger_consistent()


def test_parallel_payments_to_same_manager_wallet():
    clients = [client_for(e) for e in CUSTOMERS]
    mgr = client_for("manager")
    start = balance(mgr)
    bookings = [hold(c, pitch=f"pitch-{1 + i % 3}", starts=(f"{8 + i:02d}:00",)).json()["booking"]
                for i, c in enumerate(clients)]
    codes = [r.status_code for r in at_once(*[lambda c=c, b=b: c.post(f"/api/bookings/{b['id']}/payment", headers=H)
                                             for c, b in zip(clients, bookings)])]
    assert codes == [200] * len(clients)
    assert balance(mgr) == start + sum(b["amount_vnd"] for b in bookings)
    ledger_consistent()


def test_pay_racing_hold_expiry():
    cust, other = client_for("customer"), client_for("dung@pitchpoint.test")
    b = hold(cust).json()["booking"]
    before = balance(cust)
    set_clock_offset(timedelta(minutes=10, seconds=1))
    r_pay, _ = at_once(lambda: cust.post(f"/api/bookings/{b['id']}/payment", headers=H),
                       lambda: other.post("/api/bookings/sync", headers=H))
    booking = cust.get(f"/api/entities/Booking/{b['id']}").json()
    set_clock_offset(timedelta(0))
    assert r_pay.status_code == 409 and booking["status"] == "cancelled" and balance(cust) == before
    ledger_consistent()


def test_double_submit_create_pitch():
    m1, m2 = client_for("manager2"), client_for("manager2")
    body = {"request_id": "same-click", "pitch": {"name": "Sân Mới", "address": "1 Láng", "base_price_vnd": 300000,
                                                  "open_time": "07:00", "close_time": "21:00"}}
    r1, r2 = at_once(lambda: m1.post("/api/pitches", json=body, headers=H),
                     lambda: m2.post("/api/pitches", json=body, headers=H))
    assert r1.status_code in (201, 409) and r2.status_code in (201, 409) and 201 in (r1.status_code, r2.status_code)
    with dbmod.session_scope() as db:
        assert db.scalar(select(func.count()).select_from(Pitch).where(Pitch.name == "Sân Mới")) == 1
