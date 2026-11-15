from __future__ import annotations

import sys

from sqlalchemy import func, select

from . import db as dbmod
from .models import User
from .rules import audit
from .security import delete_user_sessions, hash_password, temporary_password


def main(email: str) -> int:
    with dbmod.session_scope() as db:
        u = db.scalars(select(User).where(func.lower(User.email) == email.strip().lower())).first()
        if not u:
            print(f"Không tìm thấy tài khoản {email}.")
            return 1
        temp = temporary_password()
        u.password_hash = hash_password(temp)
        u.must_change_password = True
        delete_user_sessions(db, u.id)
        audit(db, u, "reset_password", "Tài khoản", u.id, "Đặt lại mật khẩu từ dòng lệnh máy chủ")
    print(f"Mật khẩu tạm của {email}: {temp}")
    print("Đăng nhập bằng mật khẩu này rồi đặt mật khẩu mới.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Cách dùng: python -m app.reset_password <email>")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
