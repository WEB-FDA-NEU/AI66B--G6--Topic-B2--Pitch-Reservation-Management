import re
from pathlib import Path
import pytest
from playwright.sync_api import expect

PAGES=[p.name for p in (Path(__file__).resolve().parents[2]/'frontend').glob('*.html') if p.name!='screen-template.html']

@pytest.mark.parametrize('role',[None,'customer','manager','admin'])
def test_all_pages_by_role(make_page,role):
    page=make_page(role)
    for name in PAGES:
        page.goto('/'+name)
        page.wait_for_load_state('networkidle')
        expect(page.locator('h1'), f'{name}: {page.url}; errors={page.errors}').to_have_count(1)
        main=page.locator('main')
        if main.count():
            assert not re.search(r'\b(null|undefined)\b',main.inner_text()),name
        assert not page.errors,(name,page.errors)


def test_guest_login_and_role_boundaries(make_page):
    page=make_page()
    page.goto('/booking-history.html')
    page.wait_for_url('**/login.html*')
    page.locator('[name=email]').fill('customer@pitchpoint.test')
    page.locator('[name=password]').fill('123456')
    page.locator('form button').filter(has_text='Đăng nhập').click()
    page.wait_for_url('**/booking-history.html*')
    manager=make_page('manager')
    manager.goto('/booking-history.html')
    manager.wait_for_url('**/403.html*')
    assert not manager.errors
    page.goto('/does-not-exist.html')
    expect(page.locator('h1')).to_be_visible()


@pytest.mark.parametrize('width',[320,375,440,1280])
@pytest.mark.parametrize('role,names',[
    ('customer',['account-settings.html','forgot-password.html','reset-password.html','messages.html']),
    ('admin',['admin-settings.html','admin-users.html','messages.html']),
    ('manager',['add-pitch.html','account-settings.html','messages.html']),
])
def test_responsive_pages(make_page,width,role,names):
    page=make_page(role,width)
    for theme in ['light','dark']:
        page.emulate_media(color_scheme=theme)
        for name in names:
            page.goto('/'+name)
            page.wait_for_load_state('networkidle')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),(name,width,theme)
            assert not page.errors,(name,page.errors)
