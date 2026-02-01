# @file: ./scripts/commands/doctor.py
# @description: Doctor command handler (stub)

from __future__ import annotations

from pathlib import Path

from scripts.cli.args import DoctorArgs
from scripts.utils.console import msg


def run_doctor(*, repo_root: Path, opt: DoctorArgs) -> int:
    """Stub: implement schema-driven validation later."""
    msg.info(f"doctor: fix={opt.fix} yes={opt.yes}")
    return 0
