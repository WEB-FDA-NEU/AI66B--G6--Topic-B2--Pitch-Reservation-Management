import os
import time

from conftest import H, client_for, day
from test_uploads import picture

from app import db, uploads

PITCH = {"address": "1 Hà Nội", "base_price_vnd": 100000, "open_time": "06:00", "close_time": "22:00"}


def test_too_long_or_too_large_input_is_a_user_error_not_500():
    m, a = client_for("manager"), client_for("admin")
    cases = [
        m.patch("/api/entities/Pitch/pitch-1", json={"name": "x" * 151}, headers=H),
        m.patch("/api/entities/Pitch/pitch-1", json={"address": "x" * 301}, headers=H),
        m.patch("/api/entities/Pitch/pitch-1", json={"city": "x" * 101}, headers=H),
        m.patch("/api/entities/Pitch/pitch-1", json={"rules": "x" * 2001}, headers=H),
        m.patch("/api/entities/Pitch/pitch-1", json={"base_price_vnd": 3_000_000_000}, headers=H),
        m.patch("/api/entities/Pitch/pitch-1", json={"base_price_vnd": 1e20}, headers=H),
        m.patch("/api/entities/Pitch/pitch-1", content='{"base_price_vnd": Infinity}',
                headers={**H, "content-type": "application/json"}),
        m.post("/api/entities/PitchSchedule", json={"pitch_id": "pitch-1", "weekday": 1, "local_start": "06:00",
                                                    "local_end": "07:00", "price_vnd": 3_000_000_000}, headers=H),
        m.post("/api/pitches", json={"request_id": "long-name", "pitch": {**PITCH, "name": "x" * 151}}, headers=H),
        m.post("/api/pitches", json={"request_id": "big-price", "pitch": {**PITCH, "name": "Giá lớn",
                                                                          "base_price_vnd": 3_000_000_000}}, headers=H),
        a.post("/api/entities/ContentItem", json={"type": "banner", "title": "x" * 201, "body": "b"}, headers=H),
        a.post("/api/entities/ContentItem", json={"type": "banner", "title": "T", "body": "b", "cta_label": "x" * 61}, headers=H),
        a.post("/api/entities/ContentItem", json={"type": "popup", "title": "T", "body": "b"}, headers=H),
    ]
    assert [r.status_code for r in cases] == [400] * len(cases), [r.text for r in cases]
    assert "tối đa 150 ký tự" in cases[0].json()["error"]
    assert "20.000.000 ₫" in cases[4].json()["error"]
    assert m.patch("/api/entities/Pitch/pitch-1", json={"name": "x" * 150, "base_price_vnd": 20_000_000}, headers=H).status_code == 200


def test_report_target_must_exist():
    c = client_for("customer")
    r = c.post("/api/entities/Report", json={"target_type": "pitch", "target_id": "khong-co", "target_name": "x" * 500,
                                             "reason": "Spam"}, headers=H)
    assert r.status_code == 404
    ok = c.post("/api/entities/Report", json={"target_type": "pitch", "target_id": "pitch-2", "target_name": "Tên giả",
                                              "reason": "Sai giá"}, headers=H)
    assert ok.status_code == 201 and ok.json()["target_name"] != "Tên giả"


def test_manager_cannot_block_hours_that_customers_hold_or_booked():
    m, c = client_for("manager"), client_for("customer")
    hold = c.post("/api/bookings/holds", json={"pitch_id": "pitch-1", "local_date": day(2), "start_times": ["18:00"]}, headers=H)
    assert hold.status_code == 201, hold.text
    block = {"pitch_id": "pitch-1", "local_date": day(2), "status": "blocked", "reason": "Bảo trì"}
    r = m.post("/api/entities/AvailabilityOverride", json={**block, "start_time": "17:00", "end_time": "19:00"}, headers=H)
    assert r.status_code == 409 and hold.json()["booking"]["code"] in r.json()["error"]
    assert m.post("/api/entities/AvailabilityOverride", json={**block, "start_time": "06:00", "end_time": "08:00"}, headers=H).status_code == 201
    assert c.post(f"/api/bookings/{hold.json()['booking']['id']}/payment", headers=H).status_code == 200
    r = m.post("/api/entities/AvailabilityOverride", json={**block, "start_time": "18:00", "end_time": "19:00"}, headers=H)
    assert r.status_code == 409


def test_cleanup_removes_only_unused_old_photos(tmp_path, monkeypatch):
    monkeypatch.setattr(uploads, "UPLOAD_DIR", tmp_path)
    m = client_for("manager")
    used = m.post("/api/uploads/images", json={"image": picture()}, headers=H).json()["url"]
    assert m.patch("/api/entities/Pitch/pitch-1", json={"images": [used]}, headers=H).status_code == 200
    orphan = tmp_path / ("a" * 64 + ".jpg")
    fresh = tmp_path / ("b" * 64 + ".jpg")
    stale_tmp = tmp_path / ".abc.tmp"
    unrelated = tmp_path / "ghi-chu.txt"
    for f in (orphan, fresh, stale_tmp, unrelated):
        f.write_bytes(b"x" * 100)
    old = time.time() - 7 * 3600
    for f in (orphan, stale_tmp, tmp_path / used.rsplit("/", 1)[-1]):
        os.utime(f, (old, old))
    with db.session_scope() as session:
        count, freed = uploads.cleanup_orphans(session)
    assert (count, freed) == (2, 200)
    assert not orphan.exists() and not stale_tmp.exists()
    assert fresh.exists() and unrelated.exists() and (tmp_path / used.rsplit("/", 1)[-1]).exists()
    assert m.patch("/api/entities/Pitch/pitch-1", json={"images": []}, headers=H).status_code == 200
    with db.session_scope() as session:
        count, _ = uploads.cleanup_orphans(session, 0)
    assert count == 2 and not any(p.name.endswith(".jpg") or p.name.endswith(".png") for p in tmp_path.iterdir())
