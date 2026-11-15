"""Phiên bản CSS/JS tự động.

Số phiên bản tính từ thời điểm sửa và kích thước các file trong js/, css/, img/. Khi trả trang HTML,
server gắn ?v=<số> vào thẻ CSS/JS và chèn import map cho các module.
"""
from __future__ import annotations

import hashlib
import json
import re
import threading
import time
from pathlib import Path

from . import config

_ASSET_DIRS = ("js", "css", "img")
_CHECK_INTERVAL = 1.0  # giây giữa hai lần quét thư mục
_lock = threading.Lock()
_cache: dict = {"at": 0.0, "version": "", "import_map": ""}

_REF = re.compile(r'((?:href|src)="(?:css|js)/[^"?#]+\.(?:css|js))(?:\?v=[^"]*)?"')
_OLD_MAP = re.compile(r'[ \t]*<script type="importmap"[^>]*>.*?</script>[ \t]*\n?', re.S)
_FIRST_MODULE = re.compile(r'^([ \t]*)(<script type="module")', re.M)


def _scan(root: Path) -> tuple[str, str]:
    digest = hashlib.sha1()
    js_files: list[str] = []
    for folder in _ASSET_DIRS:
        base = root / folder
        if not base.is_dir():
            continue
        for f in sorted(base.rglob("*")):
            if not f.is_file():
                continue
            rel = f.relative_to(root).as_posix()
            st = f.stat()
            digest.update(f"{rel}:{st.st_mtime_ns}:{st.st_size};".encode())
            if folder == "js" and f.suffix == ".js" and f.name != "page-bootstrap.js":
                js_files.append(rel)
    version = digest.hexdigest()[:10]
    imports = {f"./{rel}": f"./{rel}?v={version}" for rel in js_files}
    import_map = f'<script type="importmap">{json.dumps({"imports": imports}, separators=(",", ":"))}</script>'
    return version, import_map


def current() -> tuple[str, str]:
    """(số phiên bản, thẻ import map) hiện tại."""
    now = time.monotonic()
    with _lock:
        if now - _cache["at"] > _CHECK_INTERVAL or not _cache["version"]:
            _cache["version"], _cache["import_map"] = _scan(config.FRONTEND_DIR)
            _cache["at"] = now
        return _cache["version"], _cache["import_map"]


def render_html(path: Path) -> str:
    """Nội dung trang HTML đã gắn phiên bản và import map."""
    version, import_map = current()
    html = path.read_text(encoding="utf-8")
    html = _OLD_MAP.sub("", html)
    html = _REF.sub(lambda m: f'{m.group(1)}?v={version}"', html)
    return _FIRST_MODULE.sub(lambda m: f"{m.group(1)}{import_map}\n{m.group(1)}{m.group(2)}", html, count=1)
