"""Phiên bản CSS/JS tự động (assets.py), chạy trên thư mục frontend tạm."""
import re

from app import assets, config


def _make_frontend(root):
    (root / "js" / "core").mkdir(parents=True)
    (root / "js" / "pages").mkdir(parents=True)
    (root / "css").mkdir()
    (root / "js" / "core" / "ui.js").write_text("export const x = 1;\n", encoding="utf-8")
    (root / "js" / "pages" / "home.js").write_text("import { x } from '../core/ui.js';\n", encoding="utf-8")
    (root / "css" / "home.css").write_text("body{}\n", encoding="utf-8")
    page = root / "index.html"
    page.write_text(
        '<html><head><link rel="stylesheet" href="css/home.css" /></head><body>\n'
        '    <script type="module" src="js/pages/home.js"></script>\n</body></html>\n', encoding="utf-8")
    return page


def test_html_gets_version_and_import_map(tmp_path, monkeypatch):
    page = _make_frontend(tmp_path)
    monkeypatch.setattr(config, "FRONTEND_DIR", tmp_path)
    monkeypatch.setitem(assets._cache, "at", 0.0)
    html = assets.render_html(page)
    version = re.search(r'css/home\.css\?v=([0-9a-f]+)"', html).group(1)
    assert f'src="js/pages/home.js?v={version}"' in html
    assert f'"./js/core/ui.js":"./js/core/ui.js?v={version}"' in html
    assert html.index('<script type="importmap">') < html.index('<script type="module"')


def test_version_changes_when_a_file_changes(tmp_path, monkeypatch):
    page = _make_frontend(tmp_path)
    monkeypatch.setattr(config, "FRONTEND_DIR", tmp_path)
    monkeypatch.setitem(assets._cache, "at", 0.0)
    before = assets.current()[0]
    (tmp_path / "css" / "home.css").write_text("body{color:red}\n", encoding="utf-8")
    monkeypatch.setitem(assets._cache, "at", 0.0)
    after = assets.current()[0]
    assert before != after
    assert f"?v={after}" in assets.render_html(page)
