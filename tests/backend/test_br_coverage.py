from datetime import timedelta
from sqlalchemy import select
from conftest import H,client_for,day
from app import db
from app.models import Wallet
from app.rules import wallet_move
from app.timeutil import set_clock_offset
from test_concurrency import ledger_consistent


def hold(c,**values):
    return c.post('/api/bookings/holds',json={'pitch_id':'pitch-1','local_date':day(2),'start_times':['18:00'],**values},headers=H)


def pay(c,b):
    return c.post('/api/bookings/'+b['id']+'/payment',headers=H)


def test_booking_auth_past_and_completed_restrictions():
    assert hold(client_for()).status_code==401
    assert hold(client_for('manager')).status_code==403
    c=client_for('customer')
    assert hold(c,local_date=day(-1)).status_code==400
    b=hold(c).json()['booking']
    assert pay(c,b).status_code==200
    set_clock_offset(timedelta(days=3))
    assert c.get('/api/entities/Booking/'+b['id']).json()['status']=='completed'
    assert c.post('/api/bookings/'+b['id']+'/cancellation',json={},headers=H).status_code==409
    assert hold(c,reschedule_from_id=b['id']).status_code==400
    ledger_consistent()


def test_manager_suspension_preserves_finances_and_restoration():
    customer,manager,admin=client_for('customer'),client_for('manager'),client_for('admin')
    b=hold(customer).json()['booking'];assert pay(customer,b).status_code==200
    before=manager.get('/api/entities/Wallet').json()['items'][0]['balance_vnd']
    result=admin.post('/api/admin/actions',json={'action':'suspend_user','user_id':'user-manager','reason':'Kiểm thử BR-6'},headers=H)
    assert result.status_code==200
    assert manager.get('/api/entities/Wallet').json()['items'][0]['balance_vnd']==before
    assert customer.get('/api/entities/Booking/'+b['id']).json()['status']=='confirmed'
    assert hold(customer,start_times=['19:00']).status_code==400
    assert admin.post('/api/admin/actions',json={'action':'restore_user','user_id':'user-manager'},headers=H).status_code==200
    results=customer.get('/api/search/pitches').json()['results']
    assert any(p['id']=='pitch-1' for p in results)
    assert hold(customer,start_times=['19:00']).status_code==200
    ledger_consistent()


def test_confirmed_booking_preserves_price_name_address_and_type():
    customer,manager=client_for('customer'),client_for('manager')
    b=hold(customer).json()['booking'];assert pay(customer,b).status_code==200
    fields=['pitch_name','pitch_type','pitch_address','amount_vnd','local_date','start_time','slot_starts']
    original={key:b[key] for key in fields}
    assert manager.patch('/api/entities/Pitch/pitch-1',json={'name':'Tên sân đã đổi','address':'Địa chỉ mới','type':'7v7','base_price_vnd':300000},headers=H).status_code==200
    saved=customer.get('/api/entities/Booking/'+b['id']).json()
    assert {key:saved[key] for key in fields}==original
    ledger_consistent()


def test_failed_payment_keeps_hold_and_can_retry():
    customer=client_for('customer')
    b=hold(customer).json()['booking']
    with db.session_scope() as session:
        wallet=session.scalar(select(Wallet).where(Wallet.user_id=='user-customer'))
        removed=wallet.balance_vnd
        wallet_move(session,'user-customer',-removed,'test_balance_change',None)
    assert pay(customer,b).status_code==400
    current=customer.get('/api/entities/Booking/'+b['id']).json()
    assert current['status']=='pending' and current['payment_status']=='pending'
    with db.session_scope() as session:
        wallet_move(session,'user-customer',removed,'test_balance_restore',None)
    assert pay(customer,b).status_code==200
    assert customer.get('/api/entities/Booking/'+b['id']).json()['status']=='confirmed'
    ledger_consistent()


def test_permanent_suspension_cannot_be_restored():
    admin,customer=client_for('admin'),client_for('customer')
    assert admin.post('/api/admin/actions',json={'action':'suspend_pitch','pitch_id':'pitch-1','reason':'Kiểm thử ngưng vĩnh viễn','permanent':True},headers=H).status_code==200
    assert admin.get('/api/entities/Pitch/pitch-1').json()['status']=='banned'
    assert admin.post('/api/admin/actions',json={'action':'restore_pitch','pitch_id':'pitch-1'},headers=H).status_code==400
    assert admin.get('/api/entities/Pitch/pitch-1').json()['status']=='banned'
    assert hold(customer).status_code==400
