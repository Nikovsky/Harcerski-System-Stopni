# @file: ./scripts/runtime/paths.py
# @description: Repo root resolution utilities

from __future__ import annotations

from pathlib import Path


def resolve_repo_root() -> Path:
    """
    Resolve repo root deterministically.

    Strategy:
      - when executing as a package, this file is always under ./scripts/runtime/
      - repo root is therefore 3 parents up from this file
    """
    return Path(__file__).resolve().parents[3]
