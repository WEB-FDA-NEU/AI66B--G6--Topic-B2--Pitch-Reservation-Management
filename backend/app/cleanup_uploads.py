import sys

from . import db
from .uploads import UPLOAD_DIR, cleanup_orphans

if __name__ == "__main__":
    now = "--now" in sys.argv[1:]
    with db.session_scope() as session:
        count, freed = cleanup_orphans(session, 0 if now else None)
    print(f"Thư mục ảnh: {UPLOAD_DIR}")
    print(f"Đã xóa {count} ảnh không còn dùng, giải phóng {freed / 1024:.1f} KB.")
