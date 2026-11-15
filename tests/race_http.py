import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path
import sys
import threading
import uuid
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from app.db import engine

H = {'X-Requested-With': 'PitchPoint'}


def together(calls):
    barrier = threading.Barrier(len(calls), timeout=15)
    def invoke(fn):
        barrier.wait()
        return fn()
    with ThreadPoolExecutor(max_workers=len(calls)) as pool:
        return list(pool.map(invoke, calls))


def checked(r):
    assert r.status_code == 200, (r.status_code, r.text)
    return r.json()


def invariants():
    queries = [
        'SELECT count(*) FROM wallets w WHERE balance_vnd <> (SELECT coalesce(sum(amount_vnd),0) FROM wallet_transactions t WHERE t.wallet_id=w.id)',
        'SELECT count(*) FROM wallets WHERE balance_vnd < 0',
        'SELECT count(*) FROM (SELECT 1 FROM booking_slots GROUP BY pitch_id,local_date,start_time HAVING count(*)>1) x',
        "SELECT count(*) FROM (SELECT 1 FROM bookings WHERE status='pending' GROUP BY customer_id HAVING count(*)>1) x",
        'SELECT count(*) FROM (SELECT 1 FROM refunds GROUP BY payment_id HAVING count(*)>1) x',
    ]
    with engine.connect() as conn:
        assert [conn.scalar(text(q)) for q in queries] == [0]*5


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', required=True)
    parser.add_argument('--rounds', type=int, default=3)
    args = parser.parse_args()
    prefix = uuid.uuid4().hex[:12]
    clients = []
    def client(email=None):
        c = httpx.Client(base_url=args.base_url, headers=H, timeout=20)
        clients.append(c)
        if email:
            checked(c.post('/api/auth/login', json={'email':email,'password':'123456'}))
        return c
    try:
        manager = client('manager@pitchpoint.test')
        manager2 = client('manager@pitchpoint.test')
        request_id = 'race-' + prefix
        body = {'request_id':request_id, 'pitch':{'name':'Sân kiểm thử '+prefix,'address':'Địa chỉ kiểm thử','base_price_vnd':50000,'open_time':'06:00','close_time':'22:00'}}
        results = together([lambda:manager.post('/api/pitches', json=body),lambda:manager2.post('/api/pitches',json=body)])
        assert all(r.status_code in (200,409) for r in results)
        with engine.connect() as conn:
            ids = conn.execute(text('SELECT id FROM pitches WHERE creation_request_id=:r'), {'r':request_id}).scalars().all()
        assert len(ids)==1
        pitch=ids[0]
        customers=[]
        for i in range(7):
            email=f'race-{prefix}-{i}@pitchpoint.test'
            c=client()
            checked(c.post('/api/auth/register',json={'email':email,'password':'123456','full_name':'Khách kiểm thử'}))
            checked(c.post('/api/auth/login',json={'email':email,'password':'123456'}))
            customers.append(c)
        date=(datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'))+timedelta(days=2)).date().isoformat()
        def hold(c,hour):
            return c.post('/api/bookings/holds',json={'pitch_id':pitch,'local_date':date,'start_times':[f'{hour:02d}:00']})
        def cancel(c,b):
            return c.post(f"/api/bookings/{b['id']}/cancellation",json={'reason':'Kết thúc kiểm thử'})
        def pay(c,b):
            return c.post(f"/api/bookings/{b['id']}/payment")
        def balance(c):
            return checked(c.get('/api/entities/Wallet'))['items'][0]['balance_vnd']
        for _ in range(args.rounds):
            results=together([lambda c=c:hold(c,18) for c in customers])
            assert [r.status_code for r in results].count(200)==1
            assert all(r.status_code in (200,409) for r in results)
            winner=next(i for i,r in enumerate(results) if r.status_code==200)
            b=results[winner].json()['booking']; c=customers[winner]
            before=balance(c)
            results=together([lambda:pay(c,b),lambda:pay(c,b)])
            assert sorted(r.status_code for r in results)==[200,409]
            assert balance(c)==before-b['amount_vnd']
            results=together([lambda:cancel(c,b),lambda:cancel(manager,b)])
            assert sorted(r.status_code for r in results)==[200,409]
            assert balance(c)==before
            bookings=[checked(hold(c,8+i))['booking'] for i,c in enumerate(customers)]
            before=balance(manager)
            results=together([lambda c=c,b=b:pay(c,b) for c,b in zip(customers,bookings)])
            assert all(r.status_code==200 for r in results)
            assert balance(manager)==before+sum(b['amount_vnd'] for b in bookings)
            for c,b in zip(customers,bookings):
                checked(cancel(c,b))
            invariants()
        print(f'PASS: {args.rounds} rounds, 5 HTTP race scenarios, 5 SQL invariants')
    finally:
        for c in clients:
            c.close()

if __name__ == '__main__':
    main()
