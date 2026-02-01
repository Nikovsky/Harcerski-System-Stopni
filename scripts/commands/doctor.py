# @file: ./scripts/commands/doctor.py
# @description: Doctor command handler (runs all registered checks)

from __future__ import annotations

import importlib
from pathlib import Path

from scripts.cli.args import DoctorArgs
from scripts.core.doctoring import doctor
from scripts.core.errors import CliError
from scripts.utils.console import msgx


def run_doctor(*, repo_root: Path, opt: DoctorArgs) -> int:
    _import_checks_module()

    doctor.normalize_shell_scripts_lf(
        root_rel="./docker",
        yes=True,
        check_only=opt.check_only,
    )

    msgx.i(f"[doctor] Running all checks (yes={opt.yes}, check_only={opt.check_only})")
    return doctor.run_all(yes=opt.yes, check_only=opt.check_only)


def _import_checks_module() -> None:
    try:
        importlib.import_module("scripts.doctor.checks")
    except ModuleNotFoundError as e:
        raise CliError(
            "Doctor checks module not found.\n"
            "Expected file: ./scripts/doctor/checks.py"
        ) from e
