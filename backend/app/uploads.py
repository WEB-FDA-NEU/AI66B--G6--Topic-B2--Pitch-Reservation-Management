import base64
import binascii
import hashlib
import io
import os
import re
import time
import warnings
from pathlib import Path

from PIL import Image
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse
from . import config
from .deps import run
from .rules import ApiError

router = APIRouter()
MAX_BYTES = 450 * 1024
UPLOAD_DIR = Path(__import__('os').environ.get('UPLOAD_DIR', str(config.BACKEND_DIR / 'uploads'))).resolve()
FORMATS = {'image/jpeg': ('JPEG', 'jpg'), 'image/png': ('PNG', 'png'), 'image/webp': ('WEBP', 'webp')}


def save_image(data: str) -> str:
    if not isinstance(data, str) or len(data) > MAX_BYTES * 4 // 3 + 128:
        raise ApiError('Ảnh quá lớn. Vui lòng chọn ảnh dưới 450 KB.')
    try:
        header, encoded = data.split(',', 1)
        mime = header.removeprefix('data:').removesuffix(';base64')
        if header != f'data:{mime};base64' or mime not in FORMATS:
            raise ValueError()
        content = base64.b64decode(encoded, validate=True)
        if len(content) > MAX_BYTES:
            raise ValueError()
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as image:
                if image.format != FORMATS[mime][0] or image.width * image.height > 16_000_000:
                    raise ValueError()
                image.verify()
    except (ValueError, binascii.Error, OSError, SyntaxError, Image.DecompressionBombWarning, Image.DecompressionBombError) as exc:
        raise ApiError('Ảnh không hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc WebP dưới 450 KB.') from exc
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    name = hashlib.sha256(content).hexdigest() + '.' + FORMATS[mime][1]
    target = UPLOAD_DIR / name
    if target.exists():
        try:
            os.utime(target)
        except OSError:
            pass
    if not target.exists():
        import uuid
        temporary = UPLOAD_DIR / ('.' + uuid.uuid4().hex + '.tmp')
        try:
            temporary.write_bytes(content)
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
    return '/uploads/' + name


FILE_RE = re.compile(r'[0-9a-f]{64}\.(jpg|png|webp)')
ORPHAN_GRACE_SECONDS = int(os.environ.get('UPLOAD_ORPHAN_GRACE_SECONDS', str(6 * 3600)))


def referenced_images(db) -> set[str]:
    from sqlalchemy import select
    from .models import Pitch
    names = set()
    for images in db.scalars(select(Pitch.images)):
        for src in images or []:
            if isinstance(src, str) and src.startswith('/uploads/'):
                names.add(src.rsplit('/', 1)[-1])
    return names


def cleanup_orphans(db, grace_seconds: int | None = None) -> tuple[int, int]:
    if not UPLOAD_DIR.is_dir():
        return 0, 0
    grace = ORPHAN_GRACE_SECONDS if grace_seconds is None else grace_seconds
    keep = referenced_images(db)
    cutoff = time.time() - grace
    count = freed = 0
    for path in UPLOAD_DIR.iterdir():
        if not path.is_file():
            continue
        is_temp = path.name.startswith('.') and path.name.endswith('.tmp')
        if not is_temp and (not FILE_RE.fullmatch(path.name) or path.name in keep):
            continue
        try:
            stat = path.stat()
            if stat.st_mtime > (time.time() - 3600 if is_temp else cutoff):
                continue
            path.unlink()
            count += 1
            freed += stat.st_size
        except FileNotFoundError:
            continue
    return count, freed


@router.post('/api/uploads/images')
def upload(request: Request, body: dict):
    def work(db, user):
        if not user:
            raise ApiError('Vui lòng đăng nhập.', 401)
        if user.app_role not in ('manager', 'admin'):
            raise ApiError('Chỉ chủ sân và quản trị viên được tải ảnh sân.', 403)
        return {'url': save_image(body.get('image'))}
    return run(request, work, allow_suspended=False)


@router.get('/uploads/{name}', include_in_schema=False)
def image(name: str):
    import re
    if not re.fullmatch(r'[0-9a-f]{64}\.(jpg|png|webp)', name) or not (UPLOAD_DIR / name).is_file():
        from starlette.exceptions import HTTPException
        raise HTTPException(404)
    return FileResponse(UPLOAD_DIR / name, headers={'X-Content-Type-Options':'nosniff', 'Cache-Control':'public, max-age=31536000, immutable'})
