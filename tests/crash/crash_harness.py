from __future__ import annotations

import os
import random
import subprocess
import sys
import tempfile
import threading
import time
from datetime import date, timedelta
from pathlib import Path

import httpx
import psycopg
from sqlalchemy.engine import make_url

HERE = Path(__file__).resolve().parent
BACKEND = HERE.parents[1] / "backend"
DEFAULT_DB = "postgresql+psycopg://pitchpoint:pitchpoint@localhost:5432/pitchpoint_test"
PASSWORD = "123456"


class SetupError(RuntimeError):
    pass


def database_url() -> str:
    url = os.environ.get("CRASH_DATABASE_URL") or os.environ.get("TEST_DATABASE_URL") or DEFAULT_DB
    parsed = make_url(url)
    name = parsed.database or ""
    if not parsed.drivername.startswith("postgresql"):
        raise SetupError("Kiểm thử crash cần PostgreSQL (CRASH_DATABASE_URL=postgresql+psycopg://...).")
    if name == "pitchpoint" or not ("test" in name or "crash" in name):
        raise SetupError(f"Database '{name}' sẽ bị xóa sạch. Chỉ dùng database có chữ 'test' hoặc 'crash' trong tên.")
    return url


class Harness:
    def __init__(self, port: int | None = None):
        self.db_url = database_url()
        u = make_url(self.db_url)
        self.pg = (f"host={u.host or 'localhost'} port={u.port or 5432} dbname={u.database} "
                   f"user={u.username} password={u.password or ''}")
        self.port = port or int(os.environ.get("CRASH_PORT", "8003"))
        self.base = f"http://127.0.0.1:{self.port}"
        tmp = Path(tempfile.gettempdir())
        self.log_path = tmp / "pitchpoint-crash-server.log"
        self.env = {**os.environ, "DATABASE_URL": self.db_url, "UPLOAD_DIR": str(tmp / "pitchpoint-crash-uploads"),
                    "PYTHONDONTWRITEBYTECODE": "1", "PYTHONIOENCODING": "utf-8", "SYNC_INTERVAL_SECONDS": "5",
                    "CRASH_PORT": str(self.port)}
        self.env.pop("CRASH", None)
        self.proc: subprocess.Popen | None = None
        self.tokens: dict[str, str] = {}
        self.wallet_base: dict[str, int] = {}
        self.baseline: set[str] = set()
        self.log = None

    # ---- chuẩn bị dữ liệu
    def prepare(self) -> None:
        try:
            with psycopg.connect(self.pg, connect_timeout=5):
                pass
        except psycopg.Error as exc:
            raise SetupError(f"Không kết nối được PostgreSQL ({self.pg.split(' password=')[0]}): {exc}") from exc
        self.log = open(self.log_path, "w", encoding="utf-8")
        for args in (["-m", "app.migrate"], ["-m", "app.seed", "--reset"]):
            subprocess.run([sys.executable, *args], cwd=BACKEND, env=self.env, check=True,
                           stdout=self.log, stderr=subprocess.STDOUT)
        self.wallet_base = {w: bal - s for w, bal, s in self.q(
            "select w.id, w.balance_vnd, coalesce(sum(t.amount_vnd),0) from wallets w "
            "left join wallet_transactions t on t.wallet_id=w.id group by w.id, w.balance_vnd")}
        self.baseline = self.invariants()
        self.start()

    # ---- server
    def start(self, crash: str | None = None) -> None:
        self.kill()
        for _ in range(50):
            try:
                httpx.get(self.base + "/api/settings", timeout=0.5)
                time.sleep(0.2)
            except httpx.HTTPError:
                break
        else:
            raise SetupError(f"Cổng {self.port} đang bị chương trình khác dùng. Đặt CRASH_PORT sang cổng khác.")
        env = dict(self.env)
        if crash:
            env["CRASH"] = crash
        self.log.write(f"\n===== start crash={crash!r}\n")
        self.log.flush()
        self.proc = subprocess.Popen([sys.executable, str(HERE / "crash_server.py")], cwd=BACKEND, env=env,
                                     stdout=self.log, stderr=subprocess.STDOUT)
        for _ in range(150):
            try:
                if httpx.get(self.base + "/api/settings", timeout=2).status_code == 200:
                    return
            except httpx.HTTPError:
                pass
            if self.proc.poll() is not None:
                raise SetupError(f"Server không khởi động được, xem {self.log_path}")
            time.sleep(0.2)
        raise SetupError("Server khởi động quá lâu.")

    def kill(self) -> None:
        if self.proc and self.proc.poll() is None:
            self.proc.kill()
        if self.proc:
            self.proc.wait(10)

    def close(self) -> None:
        self.kill()
        if self.log:
            self.log.close()

    def crash_then_restart(self, crash: str, email: str | None, method: str, path: str, body=None):
        self.start(crash)
        resp = self.call(email, method, path, body)
        self.proc.wait(15)
        self.start()
        return resp

    # ---- gọi API
    def login(self, email: str) -> str:
        if email not in self.tokens:
            r = httpx.post(self.base + "/api/auth/token", json={"email": email, "password": PASSWORD}, timeout=20)
            r.raise_for_status()
            self.tokens[email] = r.json()["access_token"]
        return self.tokens[email]

    def call(self, email, method, path, body=None, timeout=20):
        try:
            headers = {"X-Requested-With": "PitchPoint"}
            if email:
                headers["Authorization"] = "Bearer " + self.login(email)
            r = httpx.request(method, self.base + path, json=body, timeout=timeout, headers=headers)
            try:
                return r.status_code, r.json()
            except ValueError:
                return r.status_code, r.text
        except httpx.HTTPError as exc:
            return "LỖI KẾT NỐI", type(exc).__name__

    def free_slots(self, pitch: str, day: str) -> list[str]:
        status, data = self.call(None, "GET", f"/api/pitches/{pitch}/availability?local_date={day}")
        if status != 200:
            return []
        return [s["start"] for s in data["slots"] if s["state"] == "available"]

    def hold(self, email, pitch, day, slot=None, **extra):
        slot = slot or self.free_slots(pitch, day)[0]
        status, data = self.call(email, "POST", "/api/bookings/holds",
                                 {"pitch_id": pitch, "local_date": day, "start_times": [slot], **extra})
        assert status == 200, f"giữ chỗ {pitch} {day} {slot}: {status} {data}"
        return data["booking"]["id"]

    def book(self, email, pitch, day, slot=None):
        bid = self.hold(email, pitch, day, slot)
        status, data = self.call(email, "POST", f"/api/bookings/{bid}/payment")
        assert status == 200, f"thanh toán: {status} {data}"
        return bid

    # ---- database
    def q(self, sql, *args):
        with psycopg.connect(self.pg) as c:
            return c.execute(sql, args).fetchall()

    def one(self, sql, *args):
        rows = self.q(sql, *args)
        return rows[0][0] if rows else None

    def execute(self, sql, *args):
        with psycopg.connect(self.pg) as c:
            c.execute(sql, args)

    def wallet(self, email):
        return self.one("select w.balance_vnd from wallets w join users u on u.id=w.user_id where u.email=%s", email)

    def booking(self, bid):
        rows = self.q("select code, status, payment_status, cancel_type, amount_vnd from bookings where id=%s", bid)
        return dict(zip(["code", "status", "payment_status", "cancel_type", "amount"], rows[0])) if rows else None

    def invariants(self) -> set[str]:
        bad = set()
        for wid, bal, s in self.q("select w.id, w.balance_vnd, coalesce(sum(t.amount_vnd),0) from wallets w "
                                  "left join wallet_transactions t on t.wallet_id=w.id group by w.id, w.balance_vnd"):
            if bal - s != self.wallet_base.get(wid, 0):
                bad.add(f"ví {wid} lệch sổ giao dịch {bal - s - self.wallet_base.get(wid, 0):,} ₫")
        payments = {b: (p, r) for b, p, r in self.q(
            "select booking_id, count(*) filter (where status='paid'), count(*) filter (where status='refunded') "
            "from payments group by booking_id")}
        refunds = dict(self.q("select booking_id, count(*) from refunds group by booking_id"))
        slots = dict(self.q("select booking_id, count(*) from booking_slots group by booking_id"))
        tx: dict[str, dict[str, tuple[int, int]]] = {}
        for bid, kind, n, total in self.q("select booking_id, kind, count(*), sum(amount_vnd) from wallet_transactions "
                                          "where booking_id is not null group by booking_id, kind"):
            tx.setdefault(bid, {})[kind] = (n, total)
        for bid, code, st, ps, amt, starts in self.q(
                "select id, code, status, payment_status, amount_vnd, slot_starts from bookings"):
            paid, refunded = payments.get(bid, (0, 0))
            moves = tx.get(bid, {})
            n_slots, n_refunds = slots.get(bid, 0), refunds.get(bid, 0)
            if st == "pending" and (paid or refunded or n_refunds or moves):
                bad.add(f"{code} đang giữ chỗ nhưng đã có giao dịch tiền")
            if st in ("pending", "confirmed") and n_slots != len(starts or []):
                bad.add(f"{code} ({st}) giữ {n_slots}/{len(starts or [])} khung giờ")
            if st == "cancelled" and n_slots:
                bad.add(f"{code} đã hủy nhưng vẫn khóa {n_slots} khung giờ")
            if st in ("confirmed", "completed") and (paid != 1 or n_refunds):
                bad.add(f"{code} ({st}) có {paid} thanh toán, {n_refunds} lần hoàn")
            if any(moves.get(k, (0, 0))[0] > 1 for k in ("payment", "payout", "refund", "refund_payout")):
                bad.add(f"{code} bị trừ hoặc hoàn tiền nhiều lần")
            if "payment" in moves and (moves["payment"][1] != -amt or moves.get("payout", (0, 0))[1] != amt):
                bad.add(f"{code} sổ thanh toán lệch số tiền đơn")
            if st == "cancelled" and ps == "refunded" and (
                    n_refunds != 1 or refunded != 1 or moves.get("refund", (0, 0))[1] != amt
                    or moves.get("refund_payout", (0, 0))[1] != -amt):
                bad.add(f"{code} hoàn tiền không khớp")
            if st == "cancelled" and ps != "refunded" and (paid or "payment" in moves):
                bad.add(f"{code} đã hủy nhưng chưa hoàn tiền cho khách")
        for row in self.q("select pitch_id, local_date, start_time from booking_slots "
                          "group by pitch_id, local_date, start_time having count(*) > 1"):
            bad.add(f"khung giờ bị đặt trùng {row}")
        return bad

    def new_violations(self) -> list[str]:
        return sorted(self.invariants() - self.baseline)


def day(n: int) -> str:
    return (date.today() + timedelta(days=n)).isoformat()


def money(v) -> str:
    return f"{v:,}".replace(",", ".") + " ₫" if isinstance(v, int) else str(v)


def error_text(resp) -> str:
    status, data = resp
    return f"{status} \"{data.get('error')}\"" if isinstance(data, dict) and data.get("error") else str(status)


# ---- kịch bản
def register_before_commit(h: Harness):
    email = "crash.register1@pitchpoint.test"
    body = {"full_name": "Khách Thử Crash", "email": email, "password": PASSWORD}
    resp = h.crash_then_restart("before POST ^/api/auth/register$", None, "POST", "/api/auth/register", body)
    exists = h.one("select count(*) from users where email=%s", email)
    again = h.call(None, "POST", "/api/auth/register", body)
    ok = resp[0] == "LỖI KẾT NỐI" and exists == 0 and again[0] == 200 and h.wallet(email) == 2_000_000
    return ok, (f"Người dùng thấy: {resp[0]}. Sau khi bật lại: tài khoản {'có' if exists else 'không'} tồn tại "
                f"(đúng là không). Đăng ký lại: {again[0]}, ví {money(h.wallet(email))}.")


def register_after_commit(h: Harness):
    email = "crash.register2@pitchpoint.test"
    body = {"full_name": "Khách Thử Crash 2", "email": email, "password": PASSWORD}
    resp = h.crash_then_restart("after POST ^/api/auth/register$", None, "POST", "/api/auth/register", body)
    exists = h.one("select count(*) from users where email=%s", email)
    again = h.call(None, "POST", "/api/auth/register", body)
    login = h.call(email, "GET", "/api/auth/me")
    ok = resp[0] == "LỖI KẾT NỐI" and exists == 1 and again[0] == 409 and login[0] == 200
    return ok, (f"Người dùng thấy: {resp[0]}. Sau khi bật lại: tài khoản đã được lưu. "
                f"Bấm đăng ký lại: {error_text(again)}. Đăng nhập: {login[0]}.")


def hold_before_commit(h: Harness):
    email, pitch, d = "dung@pitchpoint.test", "pitch-5", day(3)
    slot = h.free_slots(pitch, d)[0]
    body = {"pitch_id": pitch, "local_date": d, "start_times": [slot]}
    resp = h.crash_then_restart("before POST ^/api/bookings/holds$", email, "POST", "/api/bookings/holds", body)
    pending = h.one("select count(*) from bookings b join users u on u.id=b.customer_id "
                    "where u.email=%s and b.status='pending'", email)
    still_free = slot in h.free_slots(pitch, d)
    bid = h.hold(email, pitch, d, slot)
    h.call(email, "POST", f"/api/bookings/{bid}/cancellation", {})
    ok = resp[0] == "LỖI KẾT NỐI" and pending == 0 and still_free
    return ok, (f"Người dùng thấy: {resp[0]}. Sau khi bật lại: {pending} đơn giữ chỗ (đúng là 0), "
                f"khung {slot} {'vẫn trống' if still_free else 'bị khóa'}. Giữ chỗ lại: thành công.")


def pay_before_commit(h: Harness):
    email = "dung@pitchpoint.test"
    w0 = h.wallet(email)
    bid = h.hold(email, "pitch-5", day(3))
    resp = h.crash_then_restart("before POST ^/api/bookings/.+/payment$", email, "POST", f"/api/bookings/{bid}/payment")
    b, w1 = h.booking(bid), h.wallet(email)
    again = h.call(email, "POST", f"/api/bookings/{bid}/payment")
    b2, w2 = h.booking(bid), h.wallet(email)
    ok = (resp[0] == "LỖI KẾT NỐI" and b["status"] == "pending" and w1 == w0 and again[0] == 200
          and b2["status"] == "confirmed" and w2 == w0 - b["amount"])
    return ok, (f"Người dùng thấy: {resp[0]}. Sau khi bật lại: đơn {b['code']} vẫn đang giữ chỗ, ví {money(w0)} → "
                f"{money(w1)} (không bị trừ). Thanh toán lại: {again[0]}, ví {money(w2)} (trừ đúng 1 lần {money(b['amount'])}).")


def pay_after_commit(h: Harness):
    email = "hai@pitchpoint.test"
    w0 = h.wallet(email)
    bid = h.hold(email, "pitch-5", day(3))
    resp = h.crash_then_restart("after POST ^/api/bookings/.+/payment$", email, "POST", f"/api/bookings/{bid}/payment")
    b, w1 = h.booking(bid), h.wallet(email)
    again = h.call(email, "POST", f"/api/bookings/{bid}/payment")
    w2 = h.wallet(email)
    ok = (resp[0] == "LỖI KẾT NỐI" and b["status"] == "confirmed" and w1 == w0 - b["amount"]
          and again[0] == 409 and w2 == w1)
    return ok, (f"Người dùng thấy: {resp[0]}. Sau khi bật lại: đơn {b['code']} đã xác nhận, ví {money(w0)} → {money(w1)}. "
                f"Bấm thanh toán lại: {error_text(again)}, ví vẫn {money(w2)} (không trừ lần 2).")


def cancel_before_commit(h: Harness):
    email = "dung@pitchpoint.test"
    bid = h.book(email, "pitch-5", day(4))
    w0 = h.wallet(email)
    resp = h.crash_then_restart("before POST ^/api/bookings/.+/cancellation$", email, "POST",
                                f"/api/bookings/{bid}/cancellation", {"reason": "Thử crash"})
    b, w1 = h.booking(bid), h.wallet(email)
    again = h.call(email, "POST", f"/api/bookings/{bid}/cancellation", {"reason": "Thử crash"})
    b2, w2 = h.booking(bid), h.wallet(email)
    ok = (resp[0] == "LỖI KẾT NỐI" and b["status"] == "confirmed" and w1 == w0 and again[0] == 200
          and b2["payment_status"] == "refunded" and w2 == w0 + b["amount"])
    return ok, (f"Người dùng thấy: {resp[0]}. Sau khi bật lại: đơn {b['code']} vẫn đã xác nhận, ví {money(w1)} (chưa hoàn). "
                f"Hủy lại: {again[0]}, ví {money(w2)} (hoàn đúng 1 lần {money(b['amount'])}).")


def cancel_after_commit(h: Harness):
    email = "hai@pitchpoint.test"
    bid = h.book(email, "pitch-5", day(4))
    w0 = h.wallet(email)
    resp = h.crash_then_restart("after POST ^/api/bookings/.+/cancellation$", email, "POST",
                                f"/api/bookings/{bid}/cancellation", {"reason": "Thử crash"})
    b, w1 = h.booking(bid), h.wallet(email)
    again = h.call(email, "POST", f"/api/bookings/{bid}/cancellation", {"reason": "Thử crash"})
    w2 = h.wallet(email)
    ok = (resp[0] == "LỖI KẾT NỐI" and b["status"] == "cancelled" and w1 == w0 + b["amount"]
          and again[0] == 409 and w2 == w1)
    return ok, (f"Người dùng thấy: {resp[0]}. Sau khi bật lại: đơn {b['code']} đã hủy và hoàn, ví {money(w0)} → {money(w1)}. "
                f"Bấm hủy lại: {error_text(again)}, ví vẫn {money(w2)} (không hoàn lần 2).")


def reschedule_before_commit(h: Harness):
    email, pitch, d = "khanh@pitchpoint.test", "pitch-5", day(5)
    free = h.free_slots(pitch, d)
    w0 = h.wallet(email)
    old = h.book(email, pitch, d, free[0])
    new = h.hold(email, pitch, d, free[1], reschedule_from_id=old)
    w1 = h.wallet(email)
    resp = h.crash_then_restart("before POST ^/api/bookings/.+/payment$", email, "POST", f"/api/bookings/{new}/payment")
    o, n, w2 = h.booking(old), h.booking(new), h.wallet(email)
    refunds = h.one("select count(*) from refunds where booking_id=%s", old)
    again = h.call(email, "POST", f"/api/bookings/{new}/payment")
    o2, n2, w3 = h.booking(old), h.booking(new), h.wallet(email)
    ok = (resp[0] == "LỖI KẾT NỐI" and o["status"] == "confirmed" and n["status"] == "pending" and w2 == w1
          and refunds == 0 and again[0] == 200 and o2["cancel_type"] == "rescheduled"
          and n2["status"] == "confirmed" and w3 == w0 - n2["amount"])
    return ok, (f"Người dùng thấy: {resp[0]}. Sau khi bật lại: đơn cũ {o['code']} vẫn đã xác nhận, đơn mới {n['code']} "
                f"vẫn giữ chỗ, chưa hoàn tiền đơn cũ, ví không đổi ({money(w2)}). Thanh toán lại: {again[0]}, đơn cũ hủy "
                f"(đổi lịch), đơn mới xác nhận, ví {money(w3)}.")


def manager_cancel_before_commit(h: Harness):
    email, manager = "binh@pitchpoint.test", "manager2@pitchpoint.test"
    bid = h.book(email, "pitch-5", day(5))
    w0, m0 = h.wallet(email), h.wallet(manager)
    resp = h.crash_then_restart("before POST ^/api/bookings/.+/cancellation$", manager, "POST",
                                f"/api/bookings/{bid}/cancellation", {"reason": "Sân bảo trì"})
    b, w1, m1 = h.booking(bid), h.wallet(email), h.wallet(manager)
    again = h.call(manager, "POST", f"/api/bookings/{bid}/cancellation", {"reason": "Sân bảo trì"})
    b2, w2, m2 = h.booking(bid), h.wallet(email), h.wallet(manager)
    ok = (resp[0] == "LỖI KẾT NỐI" and b["status"] == "confirmed" and (w1, m1) == (w0, m0) and again[0] == 200
          and b2["cancel_type"] == "manager" and w2 == w0 + b["amount"] and m2 == m0 - b["amount"])
    return ok, (f"Chủ sân thấy: {resp[0]}. Sau khi bật lại: đơn {b['code']} vẫn đã xác nhận, ví khách và chủ sân không đổi; "
                f"token đăng nhập của chủ sân vẫn dùng được. Hủy lại: {again[0]}, khách +{money(b['amount'])}, "
                f"chủ sân −{money(b['amount'])}.")


def admin_suspend_before_commit(h: Harness):
    email, admin, pitch = "giang@pitchpoint.test", "admin@pitchpoint.test", "pitch-4"
    h.book(email, pitch, day(5))
    upcoming = [r[0] for r in h.q("select id from bookings where pitch_id=%s and status='confirmed' "
                                  "and starts_at > now() at time zone 'utc'", pitch)]
    total0 = h.one("select sum(balance_vnd) from wallets")
    body = {"action": "suspend_pitch", "pitch_id": pitch, "reason": "Thử crash"}
    resp = h.crash_then_restart("before POST ^/api/admin/actions$", admin, "POST", "/api/admin/actions", body)
    status = h.one("select status from pitches where id=%s", pitch)
    intact = h.one("select count(*) from bookings where id = any(%s) and status='confirmed'", upcoming)
    again = h.call(admin, "POST", "/api/admin/actions", body)
    status2 = h.one("select status from pitches where id=%s", pitch)
    refunded = h.one("select count(*) from bookings where id = any(%s) and payment_status='refunded'", upcoming)
    total1 = h.one("select sum(balance_vnd) from wallets")
    h.call(admin, "POST", "/api/admin/actions", {"action": "restore_pitch", "pitch_id": pitch})
    ok = (resp[0] == "LỖI KẾT NỐI" and status == "active" and intact == len(upcoming) and again[0] == 200
          and status2 == "suspended" and refunded == len(upcoming) and total0 == total1)
    return ok, (f"Admin thấy: {resp[0]}. Sau khi bật lại: sân vẫn hoạt động, {intact}/{len(upcoming)} đơn sắp tới còn nguyên "
                f"(không có đơn nào bị hoàn dở dang). Làm lại: {again[0]}, đã hủy và hoàn {refunded}/{len(upcoming)} đơn. "
                f"Tổng tiền trong hệ thống trước/sau: {money(total0)} = {money(total1)}.")


def hold_expires_while_down(h: Harness):
    email, pitch, d = "chau@pitchpoint.test", "pitch-7", day(6)
    slot = h.free_slots(pitch, d)[0]
    w0 = h.wallet(email)
    bid = h.hold(email, pitch, d, slot)
    h.kill()
    h.execute("update bookings set hold_expires_at = (now() at time zone 'utc') - interval '1 minute' where id=%s", bid)
    h.start()
    time.sleep(6)
    b = h.booking(bid)
    free = slot in h.free_slots(pitch, d)
    again = h.hold(email, pitch, d, slot)
    h.call(email, "POST", f"/api/bookings/{again}/cancellation", {})
    ok = b["status"] == "cancelled" and b["cancel_type"] == "hold_expired" and free and h.wallet(email) == w0
    return ok, (f"Server bị tắt khi khách đang giữ chỗ {b['code']} và chỉ bật lại sau khi hết hạn. Sau khi bật lại: "
                f"đơn tự hủy ({b['cancel_type']}), khung {slot} {'trống lại' if free else 'vẫn bị khóa'}, ví không đổi. "
                f"Khách giữ chỗ lại: thành công.")


def random_kills(h: Harness, rounds: int = 6, seed: int = 2026):
    users = ["customer@pitchpoint.test", "binh@pitchpoint.test", "dung@pitchpoint.test",
             "hai@pitchpoint.test", "khanh@pitchpoint.test", "giang@pitchpoint.test"]
    for email in users:
        h.login(email)
    acked, lock, stop = [], threading.Lock(), threading.Event()
    failed = [0]

    def worker(email: str) -> None:
        rnd = random.Random(f"{seed}-{email}")
        while not stop.is_set():
            pitch, d = rnd.choice(["pitch-1", "pitch-3", "pitch-9", "pitch-10"]), day(rnd.randint(1, 6))
            free = h.free_slots(pitch, d)
            if not free:
                time.sleep(0.2)
                continue
            status, data = h.call(email, "POST", "/api/bookings/holds",
                                  {"pitch_id": pitch, "local_date": d, "start_times": [rnd.choice(free)]}, timeout=8)
            if status == 409 and "đang giữ chỗ" in str(data):
                pending = h.one("select b.id from bookings b join users u on u.id=b.customer_id "
                                "where u.email=%s and b.status='pending'", email)
                if pending:
                    h.call(email, "POST", f"/api/bookings/{pending}/cancellation", {}, timeout=8)
                continue
            if status != 200:
                with lock:
                    failed[0] += 1
                time.sleep(0.2)
                continue
            bid = data["booking"]["id"]
            if h.call(email, "POST", f"/api/bookings/{bid}/payment", timeout=8)[0] != 200:
                with lock:
                    failed[0] += 1
                continue
            with lock:
                acked.append(("pay", bid))
            if rnd.random() < 0.5 and h.call(email, "POST", f"/api/bookings/{bid}/cancellation",
                                             {"reason": "Thử crash"}, timeout=8)[0] == 200:
                with lock:
                    acked.append(("cancel", bid))

    rnd = random.Random(seed)
    h.start()
    threads = [threading.Thread(target=worker, args=(u,), daemon=True) for u in users]
    for t in threads:
        t.start()
    for _ in range(rounds):
        time.sleep(rnd.uniform(1.5, 4.0))
        h.kill()
        time.sleep(0.5)
        h.start()
    time.sleep(3)
    stop.set()
    for t in threads:
        t.join(20)
    lost = []
    for kind, bid in acked:
        b = h.booking(bid)
        kept = (b["status"] in ("confirmed", "completed") or b["payment_status"] == "refunded") if kind == "pay" \
            else b["status"] == "cancelled"
        if not kept:
            lost.append(f"{kind} {b['code']} -> {b['status']}")
    pays = sum(1 for k, _ in acked if k == "pay")
    ok = bool(acked) and not lost
    return ok, (f"Tắt đột ngột {rounds} lần khi 6 khách đang đặt, thanh toán, hủy cùng lúc. Server đã báo thành công "
                f"{len(acked)} thao tác ({pays} thanh toán, {len(acked) - pays} hủy), tất cả còn nguyên sau khi bật lại "
                f"(mất {len(lost)}{': ' + ', '.join(lost[:3]) if lost else ''}). Request bị đứt giữa chừng: {failed[0]}.")


SCENARIOS = [
    ("Đăng ký – server chết trước khi lưu", register_before_commit),
    ("Đăng ký – server chết ngay sau khi lưu", register_after_commit),
    ("Giữ chỗ – server chết trước khi lưu", hold_before_commit),
    ("Thanh toán – server chết khi đang trừ tiền", pay_before_commit),
    ("Thanh toán – server chết ngay sau khi trừ tiền, khách bấm lại", pay_after_commit),
    ("Khách hủy đơn – server chết khi đang hoàn tiền", cancel_before_commit),
    ("Khách hủy đơn – server chết ngay sau khi hoàn tiền, khách bấm lại", cancel_after_commit),
    ("Đổi lịch – server chết khi đang hoàn đơn cũ và trừ đơn mới", reschedule_before_commit),
    ("Chủ sân hủy đơn – server chết khi đang hoàn tiền", manager_cancel_before_commit),
    ("Admin tạm ngưng sân – server chết khi đang hủy và hoàn nhiều đơn", admin_suspend_before_commit),
    ("Server tắt khi khách đang giữ chỗ, bật lại sau 10 phút", hold_expires_while_down),
    ("Tắt đột ngột nhiều lần khi nhiều khách thao tác cùng lúc", random_kills),
]


def run_scenario(h: Harness, fn):
    ok, detail = fn(h)
    violations = h.new_violations()
    if violations:
        ok = False
        detail += " Dữ liệu không nhất quán: " + "; ".join(violations[:5])
    else:
        detail += " Kiểm tra toàn bộ ví, thanh toán, hoàn tiền, khung giờ: khớp."
    return ok, detail
