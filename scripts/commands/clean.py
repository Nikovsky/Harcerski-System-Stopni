# @file: ./scripts/commands/clean.py
# @description: Clean command handler (stub)

from __future__ import annotations

from pathlib import Path

from scripts.cli.args import CleanArgs
from scripts.utils.console import msg


def run_clean(*, repo_root: Path, opt: CleanArgs) -> int:
    """Stub: implement actual cleanup later."""
    msg.info(f"clean: deps={opt.deps} build={opt.build} all={opt.all} dry_run={opt.dry_run} force={opt.force}")
    return 0
