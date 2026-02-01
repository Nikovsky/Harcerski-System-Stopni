# @file: ./scripts/main.py
# @description: Demo main printing console output using msg (no prefix) and msgx (with prefix)

from __future__ import annotations

import sys
from pathlib import Path

from scripts.core.global_vars import init_global_vars
from scripts.runtime.terminal import supports_ansi
from scripts.utils.console import msg, msgx


def _resolve_repo_root() -> Path:
    """Resolve repo root based on file location."""
    return Path(__file__).resolve().parent.parent


def main(argv: list[str] | None = None) -> int:
    """Demo only: prints all levels in both modes."""
    _ = argv

    repo_root = _resolve_repo_root()
    init_global_vars(repo_root=repo_root)

    ansi_ok = supports_ansi(sys.stdout)

    # msgx = prefix
    msgx.i(f"Console demo (repo_root={repo_root})")
    msgx.i(f"ANSI supported (stdout): {ansi_ok}")
    msgx.i("Below: msgx = prefix, msg = no prefix.")

    msgx.i("----- msgx (with prefix) -----")
    msgx.i("Info message")
    msgx.s("Success message")
    msgx.w("Warning message")
    msgx.e("Error message")
    msgx.x("Fatal message")

    msgx.i("----- msg (no prefix) -----")
    msg.i("Info message")
    msg.s("Success message")
    msg.w("Warning message")
    msg.e("Error message")
    msg.x("Fatal message")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
