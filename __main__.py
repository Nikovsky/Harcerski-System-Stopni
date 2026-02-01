# @file: ./__main__.py
# @description: Repo root entrypoint for `py .`

from __future__ import annotations

import sys
from pathlib import Path

# Ensure repo root is on sys.path even when called from outside.
_repo_root = Path(__file__).resolve().parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from scripts.main import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
