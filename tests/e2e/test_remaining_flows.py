from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from playwright.sync_api import expect
from conftest import H


def test_guest_selection_survives_login(make_page):
    page=make_page()
    date=(datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'))+timedelta(days=2)).date().isoformat()
    page.goto('/pitch-detail.html?id=pitch-10&date='+date)
    slot=page.locator('#slots .slot-btn:not([disabled])').first
    slot.click()
    selected=slot.locator('strong').inner_text()
    page.locator('#book').click()
    page.wait_for_url('**/login.html*')
    page.locator('[name=email]').fill('customer@pitchpoint.test')
    page.locator('[name=password]').fill('123456')
    page.locator('form button').filter(has_text='Đăng nhập').click()
    page.wait_for_url('**/pitch-detail.html*')
    expect(page.locator('#slots .slot-btn[aria-pressed=true] strong')).to_have_text(selected)
    assert not page.errors


def test_favorite_report_and_admin_resolution(make_page):
    page=make_page('customer')
    page.goto('/pitch-detail.html?id=pitch-10')
    favorite=page.locator('.favorite-action')
    if favorite.get_attribute('aria-pressed')=='true':
        favorite.click()
        expect(favorite).to_have_attribute('aria-pressed','false')
    favorite.click()
    expect(favorite).to_have_attribute('aria-pressed','true')
    page.get_by_role('button',name='Báo cáo sân',exact=True).click()
    page.locator('#report-reason').fill('Kiểm thử quy trình xử lý báo cáo')
    page.locator('#report-details').fill('Nội dung do bộ E2E tạo trên database riêng.')
    with page.expect_response('**/api/entities/Report') as response:
        page.get_by_role('button',name='Gửi báo cáo',exact=True).click()
    assert response.value.ok
    report=response.value.json()
    admin=make_page('admin')
    admin.goto('/admin-reports.html')
    article=admin.locator('article').filter(has_text='Kiểm thử quy trình xử lý báo cáo')
    article.get_by_role('button',name='Kết luận báo cáo',exact=True).click()
    admin.locator('#action-reason').fill('Đã kiểm tra, báo cáo kiểm thử được xử lý.')
    with admin.expect_response('**/api/admin/actions') as response:
        admin.locator('dialog[open]').get_by_role('button',name='Xác nhận',exact=True).click()
    assert response.value.ok
    assert admin.request.get('/api/entities/Report/'+report['id']).json()['status']=='resolved'
    admin.goto('/admin-activity-log.html')
    expect(admin.locator('main')).to_contain_text('Kiểm thử quy trình xử lý báo cáo')
    assert not page.errors and not admin.errors


def test_completed_booking_review(make_page):
    page=make_page('customer')
    rows=page.request.get('/api/entities/Booking').json()['items']
    reviewed={r['booking_id'] for r in page.request.get('/api/entities/Review').json()['items']}
    b=next(b for b in rows if b['status']=='completed' and b['id'] not in reviewed)
    page.goto('/booking-details.html?id='+b['id'])
    page.locator('textarea[name=body]').fill('Sân tốt, đánh giá từ kiểm thử trình duyệt.')
    with page.expect_response('**/api/reviews') as response:
        page.get_by_role('button',name='Gửi đánh giá',exact=True).click()
    assert response.value.ok
    page.reload()
    expect(page.get_by_role('button',name='Gửi đánh giá',exact=True)).to_have_count(0)
    assert not page.errors


def test_manager_warn_and_admin_readonly_thread(make_page):
    customer=make_page('customer')
    result=customer.request.post('/api/conversations',data={'pitch_id':'pitch-1','body':'Tôi cần hỏi giờ mở cửa'},headers=H)
    assert result.ok,result.text()
    cid=result.json()['conversation_id']
    manager=make_page('manager')
    manager.goto('/messages.html?conversationId='+cid)
    manager.get_by_role('button',name='Cảnh cáo khách',exact=True).click()
    manager.get_by_label('Lý do cảnh cáo khách hàng',exact=True).fill('Kiểm thử cảnh cáo và quyền hội thoại')
    with manager.expect_response('**/warnings') as response:
        manager.get_by_role('button',name='Gửi cảnh cáo',exact=True).click()
    assert response.value.ok
    admin=make_page('admin')
    admin.goto('/messages.html?conversationId='+cid)
    expect(admin.get_by_role('button',name='Gửi tin nhắn',exact=True)).to_have_count(0)
    customer.goto('/account-settings.html')
    expect(customer.locator('main')).to_contain_text('Kiểm thử cảnh cáo và quyền hội thoại')
    assert not manager.errors and not admin.errors and not customer.errors
