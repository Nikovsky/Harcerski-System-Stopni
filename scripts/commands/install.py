# @file: ./scripts/commands/install.py
# @description: Install command handler (stub)

from __future__ import annotations

from pathlib import Path

from scripts.cli.args import InstallArgs
from scripts.utils.console import msg


def run_install(*, repo_root: Path, opt: InstallArgs) -> int:
    """Stub: implement pnpm install later."""
    msg.info(f"install: frozen_lockfile={opt.frozen_lockfile}")
    return 0
