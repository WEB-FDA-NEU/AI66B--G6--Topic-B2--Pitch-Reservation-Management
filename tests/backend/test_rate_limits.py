from concurrent.futures import ThreadPoolExecutor
import importlib
from sqlalchemy import select
from app import rate_limit, db
from app.models import AuthRateBucket


def test_limit_survives_module_reload_and_expires():
    for _ in range(3):
        assert rate_limit.consume('reset-email:test', 3, 3600)
    importlib.reload(rate_limit)
    assert not rate_limit.consume('reset-email:test', 3, 3600)
    with db.session_scope() as session:
        row = session.scalar(select(AuthRateBucket))
        row.attempts = [t - 3601 for t in row.attempts]
    assert rate_limit.consume('reset-email:test', 3, 3600)


def test_limit_is_atomic_under_contention():
    with ThreadPoolExecutor(max_workers=16) as pool:
        accepted = list(pool.map(lambda _: rate_limit.consume('race-limit', 10, 900), range(24)))
    assert sum(accepted) == 10


def test_successful_login_clears_failures():
    from conftest import client_for, H
    c = client_for()
    for _ in range(9):
        assert c.post('/api/auth/login', json={'email':'customer@pitchpoint.test','password':'wrong'}, headers=H).status_code == 401
    assert c.post('/api/auth/login', json={'email':'customer@pitchpoint.test','password':'123456'}, headers=H).status_code == 200
    assert c.post('/api/auth/login', json={'email':'customer@pitchpoint.test','password':'wrong'}, headers=H).status_code == 401

def test_invalid_new_password_does_not_count_as_wrong_current_password():
    from conftest import client_for,H
    c=client_for('customer')
    for _ in range(11):
        assert c.post('/api/auth/password',json={'current_password':'123456','new_password':'x'},headers=H).status_code==400
    assert c.post('/api/auth/password',json={'current_password':'123456','new_password':'password-new'},headers=H).status_code==200
