import contextvars
import os
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)

import uvicorn  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.main import app  # noqa: E402

current = contextvars.ContextVar("crash_request", default=None)
spec = os.environ.get("CRASH", "").split(" ", 2)
mode = spec[0] if len(spec) == 3 and spec[0] in ("before", "after") else None


class MarkRequest:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            current.set((scope["method"], scope["path"]))
        await self.inner(scope, receive, send)


def _matches() -> bool:
    req = current.get()
    return bool(mode and req and req[0] == spec[1] and re.search(spec[2], req[1]))


_commit = Session.commit


def commit(self):
    if _matches():
        if mode == "before":
            print("CRASH before commit", current.get(), flush=True)
            os._exit(137)
        _commit(self)
        print("CRASH after commit", current.get(), flush=True)
        os._exit(137)
    return _commit(self)


if mode:
    app.add_middleware(MarkRequest)
    Session.commit = commit

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("CRASH_PORT", "8003")), log_level="warning")
