import os
from pathlib import Path
import subprocess
import sys
import time

import httpx
import pytest
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
BASE=os.environ.get('E2E_BASE_URL','http://127.0.0.1:8002').rstrip('/')
H={'X-Requested-With':'PitchPoint'}

@pytest.fixture(scope='module',autouse=True)
def server(tmp_path_factory):
    url=os.environ.get('E2E_DATABASE_URL')
    if not url:
        pytest.fail('Set E2E_DATABASE_URL to a disposable database; this suite resets it.')
    env={**os.environ,'DATABASE_URL':url,'SEED_DEMO':'true','SERVE_FRONTEND':'true','PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8','UPLOAD_DIR':str(tmp_path_factory.mktemp('uploads'))}
    subprocess.run([sys.executable,'-m','app.seed','--reset'],cwd=ROOT/'backend',env=env,check=True,capture_output=True)
    log_path=tmp_path_factory.mktemp('server')/'uvicorn.log'
    with log_path.open('w',encoding='utf-8') as log:
        proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--port','8002'],cwd=ROOT/'backend',env=env,stdout=log,stderr=log,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        try:
            for _ in range(100):
                if proc.poll() is not None:
                    pytest.fail(log_path.read_text(encoding='utf-8'))
                try:
                    if httpx.get(BASE+'/api/health',timeout=1).status_code==200:
                        break
                except httpx.HTTPError:
                    pass
                time.sleep(.2)
            else:
                pytest.fail('Backend startup timed out')
            yield
        finally:
            proc.terminate()
            proc.wait(timeout=15)
    log_text=log_path.read_text(encoding='utf-8')
    blocks=log_text.split('Traceback (most recent call last):')[1:]
    real=[b for b in blocks if 'ConnectionResetError: [WinError 10054]' not in b.split('\nINFO:')[0]]
    assert not real,log_text

@pytest.fixture(scope='session')
def browser():
    with sync_playwright() as pw:
        engine=os.environ.get('E2E_BROWSER','chromium')
        if engine not in ('chromium','webkit'):
            pytest.fail('E2E_BROWSER must be chromium or webkit')
        options={'channel':'chrome','args':['--disable-save-password-bubble']} if engine=='chromium' else {}
        browser=getattr(pw,engine).launch(headless=True,**options)
        yield browser
        browser.close()

@pytest.fixture
def make_page(browser):
    contexts=[]
    def make(role=None,width=1280):
        context=browser.new_context(base_url=BASE,viewport={'width':width,'height':900})
        contexts.append(context)
        if role:
            r=context.request.post('/api/auth/login',data={'email':f'{role}@pitchpoint.test','password':'123456'},headers=H)
            assert r.ok,r.text()
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda exc:errors.append(str(exc)))
        page.errors=errors
        return page
    yield make
    for c in contexts:
        c.close()
