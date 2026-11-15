from datetime import datetime,timedelta
import io
from zoneinfo import ZoneInfo
from PIL import Image
from playwright.sync_api import expect
from conftest import H


def test_customer_checkout_and_preferences(make_page):
    manager=make_page('manager')
    r=manager.request.post('/api/pitches',data={'request_id':'e2e-checkout','pitch':{'name':'Sân kiểm thử thanh toán','address':'1 Hà Nội','base_price_vnd':50000,'open_time':'06:00','close_time':'22:00'}},headers=H)
    assert r.ok,r.text()
    pitches=manager.request.get('/api/entities/Pitch').json()['items']
    pitch=next(p for p in pitches if p['name']=='Sân kiểm thử thanh toán')
    page=make_page('customer')
    date=(datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'))+timedelta(days=2)).date().isoformat()
    r=page.request.post('/api/bookings/holds',data={'pitch_id':pitch['id'],'local_date':date,'start_times':['18:00']},headers=H)
    assert r.ok,r.text()
    b=r.json()['booking']
    page.goto('/payment.html?id='+b['id'])
    page.locator('#consent').check()
    page.locator('#pay').click()
    page.wait_for_url('**/booking-result.html*')
    page.wait_for_load_state("networkidle")
    assert page.request.get('/api/entities/Booking/'+b['id']).json()['status']=='confirmed'
    page.goto('/booking-details.html?id='+b['id'])
    expect(page.get_by_text('Tiện ích khi đặt:',exact=False)).to_be_visible()
    page.locator('#reschedule').click()
    page.wait_for_url('**/booking-schedule.html*')
    page.wait_for_load_state("networkidle")
    r=page.request.post('/api/bookings/holds',data={'pitch_id':pitch['id'],'local_date':date,'start_times':['19:00'],'reschedule_from_id':b['id']},headers=H)
    assert r.ok,r.text()
    replacement=r.json()['booking']
    page.goto('/payment.html?id='+replacement['id'])
    page.locator('#consent').check()
    page.locator('#pay').click()
    page.wait_for_url('**/booking-result.html*')
    page.wait_for_load_state("networkidle")
    assert page.request.get('/api/entities/Booking/'+b['id']).json()['cancel_type']=='rescheduled'
    page.goto('/booking-details.html?id='+replacement['id'])
    expect(page.locator('#reschedule')).to_have_count(0)
    page.get_by_role('button',name='Hủy đơn và hoàn tiền',exact=True).click()
    with page.expect_response('**/cancellation') as cancelled:
        page.get_by_role('button',name='Xác nhận hủy & hoàn tiền',exact=True).click()
    assert cancelled.value.ok
    page.wait_for_load_state("networkidle")
    assert page.request.get('/api/entities/Booking/'+replacement['id']).json()['payment_status']=='refunded'
    page.goto('/account-settings.html')
    page.locator('[name=notify_messages]').uncheck()
    with page.expect_response('**/api/auth/me') as response:
        page.get_by_role('button',name='Lưu tùy chọn',exact=True).click()
    assert response.value.ok
    assert page.request.get('/api/auth/me').json()['preferences']['notify_messages'] is False
    assert not page.errors


def test_manager_upload_and_create_pitch(make_page):
    page=make_page('manager')
    page.goto('/add-pitch.html')
    page.locator('#pf-name').fill('Sân ảnh E2E')
    page.locator('#pf-address').fill('1 Hà Nội')
    raw=io.BytesIO();Image.new('RGB',(160,100),'green').save(raw,format='PNG')
    with page.expect_response('**/api/uploads/images') as response:
        page.locator('input[type=file]').set_input_files({'name':'pitch.png','mimeType':'image/png','buffer':raw.getvalue()})
    assert response.value.ok,response.value.text()
    expect(page.locator('.image-upload-thumb')).to_have_count(1)
    page.get_by_role('button',name='Tạo sân bóng',exact=True).click()
    page.wait_for_url('**/manager-pitches.html*')
    page.wait_for_load_state("networkidle")
    rows=page.request.get('/api/entities/Pitch').json()['items']
    pitch=next(p for p in rows if p['name']=='Sân ảnh E2E')
    assert pitch['images'][0].startswith('/uploads/')
    assert page.request.get(pitch['images'][0]).ok
    assert not page.errors


def test_admin_settings_propagate(make_page):
    page=make_page('admin')
    page.goto('/admin-settings.html')
    page.locator('[name=hold_minutes]').fill('15')
    with page.expect_response('**/api/admin/actions') as response:
        page.get_by_role('button',name='Lưu cài đặt',exact=True).click()
    assert response.value.ok
    expect(page.locator('[name=hold_minutes]')).to_have_value('15')
    guest=make_page()
    assert guest.request.get('/api/settings').json()['hold_minutes']==15
    assert not page.errors


def test_password_reset_forces_new_password(make_page):
    admin=make_page('admin')
    guest=make_page()
    assert guest.request.post('/api/auth/password-reset',data={'email':'dung@pitchpoint.test'},headers=H).ok
    result=admin.request.post('/api/admin/actions',data={'action':'reset_password','user_id':'user-dung'},headers=H)
    assert result.ok,result.text()
    temporary=result.json()['temporary_password']
    guest.goto('/login.html')
    guest.locator('[name=email]').fill('dung@pitchpoint.test')
    guest.locator('[name=password]').fill(temporary)
    guest.locator('form button').filter(has_text='Đăng nhập').click()
    guest.wait_for_url('**/reset-password.html*')
    guest.locator('[name=current_password]').fill(temporary)
    guest.locator('[name=new_password]').fill('matkhau-moi-123')
    guest.locator('[name=confirm_password]').fill('matkhau-moi-123')
    guest.locator('main form button[type=submit]').click()
    guest.wait_for_url('**/index.html*')
    assert guest.request.get('/api/auth/me').json()['must_change_password'] is False
    assert not guest.errors


def test_support_messages_and_suspension_appeal(make_page):
    customer=make_page('giang')
    customer.goto('/messages.html?to=admin')
    customer.locator('textarea[name=body]').fill('Cần hỗ trợ tài khoản kiểm thử')
    with customer.expect_response('**/api/conversations') as response:
        customer.get_by_role('button',name='Gửi tin nhắn',exact=True).click()
    assert response.value.ok
    cid=response.value.json()['conversation_id']
    admin=make_page('admin')
    assert admin.request.post('/api/conversations/'+cid+'/messages',data={'body':'Đã nhận yêu cầu'},headers=H).ok
    customer.reload()
    expect(customer.get_by_role('region',name='Nội dung hội thoại').get_by_text('Đã nhận yêu cầu',exact=True)).to_be_visible()
    assert admin.request.post('/api/admin/actions',data={'action':'suspend_user','user_id':'user-giang','reason':'Kiểm thử tạm khóa'},headers=H).ok
    customer.goto('/account-settings.html#appeal')
    customer.locator('#appeal-body').fill('Mong quản trị viên xem lại tài khoản của tôi.')
    with customer.expect_response('**/api/appeals') as response:
        customer.get_by_role('button',name='Gửi khiếu nại',exact=True).click()
    assert response.value.ok
    customer.reload()
    expect(customer.locator('#appeal-body')).to_have_count(0)
    assert admin.request.post('/api/admin/actions',data={'action':'restore_user','user_id':'user-giang','reason':'Kết thúc kiểm thử'},headers=H).ok
    assert not customer.errors
