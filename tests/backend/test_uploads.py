import base64
import io
from PIL import Image
from conftest import H, client_for
from app import uploads


def picture():
    data=io.BytesIO()
    Image.new('RGB',(160,100),'green').save(data,format='PNG')
    return 'data:image/png;base64,'+base64.b64encode(data.getvalue()).decode()


def test_upload_image_permissions_validation_and_public_read(tmp_path, monkeypatch):
    monkeypatch.setattr(uploads,'UPLOAD_DIR',tmp_path)
    anon,customer,manager=client_for(),client_for('customer'),client_for('manager')
    for client,expected in [(anon,401),(customer,403)]:
        assert client.post('/api/uploads/images',json={'image':picture()},headers=H).status_code==expected
    assert manager.post('/api/uploads/images',json={'image':'data:image/png;base64,YmFk'},headers=H).status_code==400
    result=manager.post('/api/uploads/images',json={'image':picture()},headers=H)
    assert result.status_code==200
    url=result.json()['url']
    assert anon.get(url).status_code==200
    assert anon.get(url).headers['content-type']=='image/png'
    assert manager.post('/api/uploads/images',json={'image':picture()},headers=H).json()['url']==url
    assert len(list(tmp_path.iterdir()))==1
    assert anon.get('/uploads/not-an-image.png').status_code==404


def test_new_pitch_stores_file_url(tmp_path,monkeypatch):
    monkeypatch.setattr(uploads,'UPLOAD_DIR',tmp_path)
    c=client_for('manager')
    response=c.post('/api/pitches',json={'request_id':'image-test','pitch':{'name':'Sân ảnh','address':'1 Hà Nội','base_price_vnd':50000,'open_time':'06:00','close_time':'22:00','images':[picture()]}},headers=H)
    assert response.status_code==200,response.text
    images=c.get('/api/entities/Pitch').json()['items']
    assert next(p for p in images if p['name']=='Sân ảnh')['images'][0].startswith('/uploads/')

def test_corrupt_image_is_a_user_error(tmp_path,monkeypatch):
    monkeypatch.setattr(uploads,'UPLOAD_DIR',tmp_path)
    content=bytearray(base64.b64decode(picture().split(',')[1]))
    content[45] ^= 1
    payload='data:image/png;base64,'+base64.b64encode(content).decode()
    c=client_for('manager')
    assert c.post('/api/uploads/images',json={'image':payload},headers=H).status_code==400
    assert not list(tmp_path.iterdir())
