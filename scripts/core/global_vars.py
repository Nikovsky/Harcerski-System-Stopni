# @file: ./scripts/core/global_vars.py
# @description: Global runtime settings initialized once at startup (stdout/stderr color flags)

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

from scripts.runtime.terminal import supports_ansi


@dataclass(frozen=True, slots=True)
class GlobalVars:
    """Process-wide runtime settings (kept minimal by design)."""
    repo_root: Path
    use_color_stdout: bool
    use_color_stderr: bool


_GLOBAL: GlobalVars | None = None


def init_global_vars(*, repo_root: Path, force_color: bool = False, no_color: bool = False) -> GlobalVars:
    """Initialize global vars exactly once (idempotent)."""
    global _GLOBAL

    if _GLOBAL is not None:
        return _GLOBAL

    if no_color:
        out = False
        err = False
    elif force_color:
        out = True
        err = True
    else:
        out = supports_ansi(sys.stdout)
        err = supports_ansi(sys.stderr)

    _GLOBAL = GlobalVars(repo_root=repo_root, use_color_stdout=out, use_color_stderr=err)
    return _GLOBAL


def gv() -> GlobalVars:
    """Return initialized global vars (fail-fast if not initialized)."""
    if _GLOBAL is None:
        raise RuntimeError("GlobalVars not initialized.")
    return _GLOBAL
