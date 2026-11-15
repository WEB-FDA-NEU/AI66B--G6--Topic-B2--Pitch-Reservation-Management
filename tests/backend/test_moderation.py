from sqlalchemy import select,func
from conftest import H,client_for,day
from app import db
from app.models import Notification,Report,User
from test_concurrency import at_once,ledger_consistent


def make_hold(c,hour=18):
    r=c.post('/api/bookings/holds',json={'pitch_id':'pitch-1','local_date':day(2),'start_times':[f'{hour:02d}:00']},headers=H)
    assert r.status_code==201,r.text
    return r.json()['booking']


def test_booking_snapshot_survives_pitch_changes():
    manager,customer=client_for('manager'),client_for('customer')
    assert manager.patch('/api/entities/Pitch/pitch-1',json={'facilities':['Đèn chiếu sáng'],'rules':'Giày TF'},headers=H).status_code==200
    b=make_hold(customer)
    assert customer.post(f"/api/bookings/{b['id']}/payment",headers=H).status_code==200
    manager.patch('/api/entities/Pitch/pitch-1',json={'facilities':['Bãi xe'],'rules':'Nội quy mới'},headers=H)
    b=customer.get('/api/entities/Booking/'+b['id']).json()
    assert b['booked_facilities']==['Đèn chiếu sáng'] and b['booked_rules']=='Giày TF'


def test_cancellation_flag_only_after_paid_customer_cancellations():
    customer=client_for('customer')
    b=make_hold(customer)
    customer.post(f"/api/bookings/{b['id']}/cancellation",json={},headers=H)
    for i in range(5):
        b=make_hold(customer)
        assert customer.post(f"/api/bookings/{b['id']}/payment",headers=H).status_code==200
        assert customer.post(f"/api/bookings/{b['id']}/cancellation",json={},headers=H).status_code==200
        with db.session_scope() as session:
            flags=session.scalars(select(Report).where(Report.reporter_id=='system')).all()
            assert len(flags)==(0 if i<3 else 1)
            assert session.get(User,'user-customer').status=='active'
    ledger_consistent()


def test_announcement_published_once_under_concurrent_updates():
    a,b=client_for('admin'),client_for('admin')
    r=a.post('/api/entities/ContentItem',json={'type':'announcement','status':'draft','title':'Thông báo kiểm thử','body':'Hệ thống cập nhật.'},headers=H)
    assert r.status_code==201,r.text
    key=r.json()['id']
    results=at_once(lambda:a.patch('/api/entities/ContentItem/'+key,json={'status':'published'},headers=H),lambda:b.patch('/api/entities/ContentItem/'+key,json={'status':'published'},headers=H))
    assert all(r.status_code==200 for r in results)
    a.patch('/api/entities/ContentItem/'+key,json={'body':'Sửa chính tả'},headers=H)
    with db.session_scope() as session:
        users=session.scalar(select(func.count()).select_from(User))
        notes=session.scalars(select(Notification).where(Notification.title=='Thông báo kiểm thử')).all()
        assert len(notes)==users
        assert len({n.recipient_id for n in notes})==users
