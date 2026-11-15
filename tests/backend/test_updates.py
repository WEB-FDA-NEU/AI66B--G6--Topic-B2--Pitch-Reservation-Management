from datetime import timedelta

from conftest import H, client_for, set_clock_offset


def updates(c, **query):
    r = c.get("/api/updates", params=query)
    assert r.status_code == 200, r.text
    return r.json()


def test_updates_requires_login():
    assert client_for().get("/api/updates").status_code == 401


def test_updates_returns_only_new_rows_the_viewer_may_see():
    cust, mgr, other = client_for("customer"), client_for("manager"), client_for("dung@pitchpoint.test")
    first = updates(mgr)
    assert first["messages"] == [] and first["conversations"] == [] and first["notifications"] == []
    cursor = first["server_time"]
    unread_before = first["unread_count"]

    set_clock_offset(timedelta(seconds=10))
    r = cust.post("/api/conversations", json={"pitch_id": "pitch-1", "body": "Tối nay còn sân không?"}, headers=H)
    assert r.status_code == 200, r.text
    cid = r.json()["conversation_id"]

    got = updates(mgr, since=cursor, conversations=1, conversation_id=cid)
    assert [m["body"] for m in got["messages"]] == ["Tối nay còn sân không?"]
    assert cid in [c["id"] for c in got["conversations"]]
    assert any(n["title"].startswith("Tin nhắn mới") for n in got["notifications"])
    assert got["unread_count"] == unread_before + 1

    outsider = updates(other, since=cursor, conversations=1, conversation_id=cid)
    assert outsider["messages"] == [] and cid not in [c["id"] for c in outsider["conversations"]]

    set_clock_offset(timedelta(seconds=20))
    overlap = updates(mgr, since=got["server_time"], conversations=1, conversation_id=cid)
    assert len(overlap["messages"]) <= 1
    set_clock_offset(timedelta(seconds=30))
    later = updates(mgr, since=overlap["server_time"], conversations=1, conversation_id=cid)
    assert later["messages"] == [] and later["conversations"] == [] and later["notifications"] == []


def test_updates_ignores_bad_cursor():
    body = updates(client_for("customer"), since="không-phải-ngày")
    assert body["messages"] == [] and "server_time" in body


def test_message_and_hold_validation_messages():
    cust = client_for("customer")
    r = cust.post("/api/conversations", json={"pitch_id": "pitch-1", "body": "y" * 2001}, headers=H)
    assert r.status_code == 400 and "2000" in r.json()["error"]
    r = cust.post("/api/bookings/holds", json={"pitch_id": "khong-ton-tai", "local_date": "2026-12-01", "start_times": ["18:00"]}, headers=H)
    assert r.status_code == 404
