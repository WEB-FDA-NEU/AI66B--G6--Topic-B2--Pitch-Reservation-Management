from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from playwright.sync_api import expect
from conftest import H


def day():
    return (datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'))+timedelta(days=2)).date().isoformat()


def new_pitch(manager,name):
    r=manager.request.post('/api/pitches',data={'request_id':name,'pitch':{'name':name,'address':'1 Hà Nội','base_price_vnd':50000,'open_time':'06:00','close_time':'22:00'}},headers=H)
    assert r.ok,r.text()
    return next(p for p in manager.request.get('/api/entities/Pitch').json()['items'] if p['name']==name)


def test_manager_edit_price_block_hours_and_pause(make_page):
    page=make_page('manager')
    pitch=new_pitch(page,'Sân kiểm thử lịch và giá')
    key=pitch['id']
    page.goto('/edit-pitch.html?id='+key)
    page.locator('#pf-price').fill('100000')
    with page.expect_response('**/api/entities/Pitch/'+key) as response:
        page.get_by_role('button',name='Lưu cập nhật sân',exact=True).click()
    assert response.value.ok
    page.wait_for_url('**/manager-pitches.html*')
    prices=page.request.get('/api/pitches/'+key+'/availability',params={'local_date':day()}).json()
    assert '100000' in str(prices)
    page.goto('/pitch-availability.html?id='+key)
    page.locator('#ov-date').fill(day())
    page.locator('#ov-start').select_option('18:00')
    page.locator('#ov-end').select_option('19:00')
    page.locator('#ov-reason').fill('Bảo trì kiểm thử')
    with page.expect_response('**/api/entities/AvailabilityOverride') as response:
        page.get_by_role('button',name='+ Thêm ngoại lệ',exact=True).click()
    assert response.value.ok
    customer=make_page('customer')
    r=customer.request.post('/api/bookings/holds',data={'pitch_id':key,'local_date':day(),'start_times':['18:00']},headers=H)
    assert r.status==409
    page.goto('/edit-pitch.html?id='+key)
    page.get_by_role('button',name='Tạm dừng nhận đơn',exact=True).click()
    page.locator('#action-reason').fill('Tạm dừng kiểm thử')
    with page.expect_response('**/status') as response:
        page.locator('dialog[open]').get_by_role('button',name='Xác nhận',exact=True).click()
    assert response.value.ok
    assert page.request.get('/api/entities/Pitch/'+key).json()['status']=='paused'
    expect(page.get_by_role('button',name='Mở lại nhận đơn',exact=True)).to_be_visible()
    page.wait_for_load_state('networkidle')
    page.get_by_role('button',name='Mở lại nhận đơn',exact=True).click()
    with page.expect_response('**/status') as response:
        page.locator('dialog[open]').get_by_role('button',name='Xác nhận',exact=True).click()
    assert response.value.ok
    assert page.request.get('/api/entities/Pitch/'+key).json()['status']=='active'
    expect(page.get_by_role('button',name='Tạm dừng nhận đơn',exact=True)).to_be_visible()
    page.wait_for_load_state('networkidle')
    assert not page.errors and not customer.errors


def test_admin_suspend_pitch_refunds_and_restore(make_page):
    manager=make_page('manager')
    pitch=new_pitch(manager,'Sân kiểm thử admin tạm ngưng')
    key=pitch['id']
    customer=make_page('customer')
    before=customer.request.get('/api/entities/Wallet').json()['items'][0]['balance_vnd']
    r=customer.request.post('/api/bookings/holds',data={'pitch_id':key,'local_date':day(),'start_times':['18:00']},headers=H)
    assert r.ok,r.text()
    booking=r.json()['booking']
    assert customer.request.post('/api/bookings/'+booking['id']+'/payment',headers=H).ok
    admin=make_page('admin')
    admin.goto('/admin-pitch-moderation.html')
    article=admin.locator('article').filter(has=admin.get_by_role('heading',name=pitch['name'],exact=True))
    article.get_by_role('button',name='Tạm ngưng sân',exact=True).click()
    admin.locator('#action-reason').fill('Bảo trì khẩn cấp kiểm thử')
    with admin.expect_response('**/api/admin/actions') as response:
        admin.locator('dialog[open]').get_by_role('button',name='Xác nhận',exact=True).click()
    assert response.value.ok
    b=customer.request.get('/api/entities/Booking/'+booking['id']).json()
    assert b['status']=='cancelled' and b['payment_status']=='refunded'
    assert customer.request.get('/api/entities/Wallet').json()['items'][0]['balance_vnd']==before
    article.get_by_role('button',name='Mở lại / ngưng vĩnh viễn',exact=True).click()
    admin.locator('#modal-pitch-action').select_option('restore')
    with admin.expect_response('**/api/admin/actions') as response:
        admin.locator('dialog[open]').get_by_role('button',name='Xác nhận',exact=True).click()
    assert response.value.ok
    assert admin.request.get('/api/entities/Pitch/'+key).json()['status']=='active'
    assert not admin.errors

def test_manager_cancellation_requires_reason_and_refunds(make_page):
    manager=make_page('manager')
    pitch=new_pitch(manager,'Sân kiểm thử chủ sân hủy đơn')
    customer=make_page('customer')
    before=customer.request.get('/api/entities/Wallet').json()['items'][0]['balance_vnd']
    r=customer.request.post('/api/bookings/holds',data={'pitch_id':pitch['id'],'local_date':day(),'start_times':['18:00']},headers=H)
    assert r.ok,r.text()
    booking=r.json()['booking']
    assert customer.request.post('/api/bookings/'+booking['id']+'/payment',headers=H).ok
    manager.goto('/booking-details.html?id='+booking['id'])
    manager.get_by_role('button',name='Hủy đơn và hoàn tiền',exact=True).click()
    confirm=manager.get_by_role('button',name='Xác nhận hủy & hoàn tiền',exact=True)
    confirm.click()
    expect(manager.locator('dialog[open]')).to_contain_text('Vui lòng nhập lý do hủy đơn.')
    assert customer.request.get('/api/entities/Booking/'+booking['id']).json()['status']=='confirmed'
    manager.locator('#cancel-reason-input').fill('Bảo trì mặt sân kiểm thử')
    with manager.expect_response('**/cancellation') as response:
        confirm.click()
    assert response.value.ok
    b=customer.request.get('/api/entities/Booking/'+booking['id']).json()
    assert b['cancel_type']=='manager' and b['payment_status']=='refunded'
    assert customer.request.get('/api/entities/Wallet').json()['items'][0]['balance_vnd']==before
    assert not manager.errors
