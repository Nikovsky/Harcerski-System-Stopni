# @file: ./scripts/cli/args.py
# @description: Argparse setup producing typed dataclass arguments for the dispatcher

from __future__ import annotations

import argparse
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Sequence

from scripts.core.errors import CliError


class Command(StrEnum):
    CLEAN = "clean"
    INSTALL = "install"
    DOCKER = "docker"
    DOCTOR = "doctor"


@dataclass(frozen=True, slots=True)
class GlobalArgs:
    no_color: bool = False
    color: bool = False
    debug: bool = False


@dataclass(frozen=True, slots=True)
class CleanArgs:
    deps: bool = False
    build: bool = False
    all: bool = False
    dry_run: bool = False
    force: bool = False


@dataclass(frozen=True, slots=True)
class InstallArgs:
    frozen_lockfile: bool = False


@dataclass(frozen=True, slots=True)
class DockerArgs:
    action: str = "ps"
    compose_file: Path | None = None


@dataclass(frozen=True, slots=True)
class DoctorArgs:
    fix: bool = False
    yes: bool = False


@dataclass(frozen=True, slots=True)
class AppArgs:
    global_args: GlobalArgs
    command: Command
    clean: CleanArgs | None = None
    install: InstallArgs | None = None
    docker: DockerArgs | None = None
    doctor: DoctorArgs | None = None


def parse_args(argv: Sequence[str]) -> AppArgs:
    """Parse CLI args and return a fully-typed AppArgs object."""
    parser = _build_parser()
    ns, unknown = parser.parse_known_args(list(argv))

    if unknown:
        raise CliError(f"Unknown arguments: {' '.join(unknown)}")

    g = GlobalArgs(
        no_color=bool(ns.no_color),
        color=bool(ns.color),
        debug=bool(ns.debug),
    )

    cmd = Command(str(ns.command))

    match cmd:
        case Command.CLEAN:
            return AppArgs(
                global_args=g,
                command=cmd,
                clean=CleanArgs(
                    deps=bool(ns.deps),
                    build=bool(ns.build),
                    all=bool(ns.all),
                    dry_run=bool(ns.dry_run),
                    force=bool(ns.force),
                ),
            )
        case Command.INSTALL:
            return AppArgs(
                global_args=g,
                command=cmd,
                install=InstallArgs(frozen_lockfile=bool(ns.frozen_lockfile)),
            )
        case Command.DOCKER:
            cf = Path(ns.compose_file) if ns.compose_file else None
            return AppArgs(
                global_args=g,
                command=cmd,
                docker=DockerArgs(action=str(ns.action), compose_file=cf),
            )
        case Command.DOCTOR:
            return AppArgs(
                global_args=g,
                command=cmd,
                doctor=DoctorArgs(fix=bool(ns.fix), yes=bool(ns.yes)),
            )
        case _:
            raise CliError(f"Unsupported command: {cmd!s}")


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="scripts",
        add_help=True,
    )

    p.add_argument("--no-color", action="store_true", default=False, help="Disable ANSI colors.")
    p.add_argument("--color", action="store_true", default=False, help="Force ANSI colors.")
    p.add_argument("--debug", action="store_true", default=False, help="Enable debug mode (stack traces).")

    sub = p.add_subparsers(dest="command", required=True)

    _add_clean(sub)
    _add_install(sub)
    _add_docker(sub)
    _add_doctor(sub)

    return p


def _add_clean(sub: argparse._SubParsersAction) -> None:
    c = sub.add_parser(Command.CLEAN.value, help="Remove workspace artifacts (deps/build).")
    c.add_argument("--deps", action="store_true", default=False, help="Remove node_modules.")
    c.add_argument("--build", action="store_true", default=False, help="Remove build outputs.")
    c.add_argument("--all", action="store_true", default=False, help="Equivalent to --deps + --build.")
    c.add_argument("--dry-run", action="store_true", default=False, help="Print what would be removed.")
    c.add_argument("--force", action="store_true", default=False, help="Do not prompt for confirmation.")


def _add_install(sub: argparse._SubParsersAction) -> None:
    i = sub.add_parser(Command.INSTALL.value, help="Install dependencies using pnpm.")
    i.add_argument("--frozen-lockfile", action="store_true", default=False, help="Disallow lockfile changes.")


def _add_docker(sub: argparse._SubParsersAction) -> None:
    d = sub.add_parser(Command.DOCKER.value, help="Manage docker compose stack.")
    d.add_argument("action", nargs="?", default="ps", help="Action: up/down/start/stop/ps/logs/remove/hard-reset")
    d.add_argument("-f", "--compose-file", default=None, help="Override compose file path.")


def _add_doctor(sub: argparse._SubParsersAction) -> None:
    d = sub.add_parser(Command.DOCTOR.value, help="Validate/fix config files using schemas.")
    d.add_argument("--fix", action="store_true", default=False, help="Offer to apply fixes.")
    d.add_argument("-y", "--yes", action="store_true", default=False, help="Apply fixes without prompting.")
