import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.stdout.reconfigure(encoding="utf-8")

from crash_harness import SCENARIOS, Harness, SetupError, run_scenario  # noqa: E402


def main() -> int:
    try:
        h = Harness()
        print(f"Database thử: {h.db_url.split('@')[-1]} (sẽ bị xóa và nạp lại dữ liệu mẫu)")
        print(f"Server thử: {h.base}\n")
        h.prepare()
    except SetupError as exc:
        print("KHÔNG CHẠY ĐƯỢC:", exc)
        return 2
    passed = 0
    started = time.time()
    try:
        for i, (name, fn) in enumerate(SCENARIOS, 1):
            try:
                ok, detail = run_scenario(h, fn)
            except Exception as exc:
                ok, detail = False, f"Lỗi khi chạy kịch bản: {exc!r}\n{traceback.format_exc(limit=3)}"
            passed += ok
            print(f"[{'ĐẠT' if ok else 'LỖI'}] {i:2d}. {name}\n      {detail}\n", flush=True)
    finally:
        h.close()
    print(f"KẾT QUẢ: {passed}/{len(SCENARIOS)} kịch bản đạt ({time.time() - started:.0f} giây). Log server: {h.log_path}")
    return 0 if passed == len(SCENARIOS) else 1


if __name__ == "__main__":
    sys.exit(main())
