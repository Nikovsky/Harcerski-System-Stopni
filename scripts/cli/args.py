# @file: ./scripts/cli/args.py
# @description: Typed argparse setup (commands, help/version, root dir, project actions)

from __future__ import annotations

import argparse
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Sequence

from scripts.core.app_info import APP_INFO
from scripts.core.errors import CliError
from scripts.config.clean_targets import DEFAULT_CLEAN_TARGETS


class Command(StrEnum):
    """Supported CLI commands."""
    CLEAN = "clean"
    DOCKER = "docker"
    DOCTOR = "doctor"
    HELP = "help"
    VERSION = "version"

class DockerAction(StrEnum):
    UP = "up"
    DOWN = "down"
    START = "start"
    STOP = "stop"
    RESTART = "restart"

@dataclass(frozen=True, slots=True)
class GlobalArgs:
    """Arguments shared by all commands."""
    root_dir: Path


@dataclass(frozen=True, slots=True)
class CleanArgs:
    """Clean command options."""
    dry_run: bool = False


@dataclass(frozen=True, slots=True)
class DoctorArgs:
    yes: bool = False
    check_only: bool = False

@dataclass(frozen=True, slots=True)
class DockerArgs:
    """
    Docker compose command arguments (parameters only; functionality later).

    compose_file is resolved relative to root_dir when parsed.
    """
    action: DockerAction = DockerAction.UP
    compose_file: Path = Path("docker/docker-compose.yml")
    volumes: bool = False  # used by down/restart


@dataclass(frozen=True, slots=True)
class HelpArgs:
    """Help command options."""
    topic: str | None = None


@dataclass(frozen=True, slots=True)
class VersionArgs:
    """Version command options (none)."""
    dummy: bool = False


@dataclass(frozen=True, slots=True)
class AppArgs:
    """Fully-typed parsed CLI arguments."""
    global_args: GlobalArgs
    command: Command
    clean: CleanArgs | None = None
    docker: DockerArgs | None = None
    doctor: DoctorArgs | None = None
    help: HelpArgs | None = None
    version: VersionArgs | None = None


@dataclass(frozen=True, slots=True)
class ParserBundle:
    """Parser plus a map of command->subparser (used for `help <command>`)."""
    parser: argparse.ArgumentParser
    command_parsers: dict[str, argparse.ArgumentParser]


def build_parser(*, default_root: Path) -> ParserBundle:
    """
    Build CLI parser.

    Includes:
      - global: -r/--root/--root_dir
      - --version flag
      - subcommands: clean/docker/doctor/project/help/version
    """
    description = (
        f"{APP_INFO.name} — enterprise-grade monorepo tooling (Python).\n"
        f"License: {APP_INFO.license}\n"
        f"Version: {APP_INFO.version}\n"
        f"Authors: {APP_INFO.authors}\n" if APP_INFO.authors else ""
    )

    parser = argparse.ArgumentParser(
        prog="scripts",
        description=description,
        formatter_class=argparse.RawTextHelpFormatter,
        add_help=True,
    )

    parser.add_argument(
        "-r", "--root", "--root_dir",
        dest="root_dir",
        default=str(default_root),
        help="Repository root directory (default: auto-detected).",
    )

    parser.add_argument(
        "--version",
        action="version",
        version=_version_string(),
        help="Print version and exit.",
    )

    sub = parser.add_subparsers(dest="command", required=True)

    cmd_parsers: dict[str, argparse.ArgumentParser] = {}
    cmd_parsers[Command.CLEAN.value] = _add_clean(sub)
    cmd_parsers[Command.DOCKER.value] = _add_docker(sub)
    cmd_parsers[Command.DOCTOR.value] = _add_doctor(sub)
    cmd_parsers[Command.HELP.value] = _add_help(sub)
    cmd_parsers[Command.VERSION.value] = _add_version(sub)

    return ParserBundle(parser=parser, command_parsers=cmd_parsers)


def parse_args(argv: Sequence[str], *, default_root: Path) -> tuple[AppArgs, ParserBundle]:
    """
    Parse argv into AppArgs (typed).

    Rejects unknown arguments (fail-fast).
    """
    bundle = build_parser(default_root=default_root)
    ns, unknown = bundle.parser.parse_known_args(list(argv))

    if unknown:
        raise CliError(f"Unknown arguments: {' '.join(unknown)}")

    root_dir = _validate_root_dir(Path(str(ns.root_dir)))
    g = GlobalArgs(root_dir=root_dir)

    cmd = Command(str(ns.command))

    match cmd:
        case Command.CLEAN:
            return (
                AppArgs(
                    global_args=g,
                    command=cmd,
                    clean=CleanArgs(dry_run=bool(getattr(ns, "dry_run", False))),
                ),
                bundle,
            )

        case Command.DOCTOR:
            return (
                AppArgs(
                    global_args=g,
                    command=cmd,
                    doctor=DoctorArgs(
                        yes=bool(getattr(ns, "yes", False)),
                        check_only=bool(getattr(ns, "check_only", False)),
                    ),
                ),
                bundle,
            )

        case Command.DOCKER:
            action_raw = str(getattr(ns, "action", DockerAction.UP.value))
            try:
                action = DockerAction(action_raw)
            except ValueError:
                allowed = ", ".join(a.value for a in DockerAction)
                raise CliError(f"Invalid docker action: {action_raw!r}. Allowed: {allowed}")

            # default: ./docker/docker-compose.yml (relative to root)
            compose_raw = str(getattr(ns, "compose_file", "docker/docker-compose.yml"))
            compose_file = (root_dir / compose_raw).resolve()

            volumes = bool(getattr(ns, "volumes", False))

            return (
                AppArgs(
                    global_args=g,
                    command=cmd,
                    docker=DockerArgs(
                        action=action,
                        compose_file=compose_file,
                        volumes=volumes,
                    ),
                ),
                bundle,
            )


        case Command.HELP:
            topic = str(ns.topic) if getattr(ns, "topic", None) else None
            return (AppArgs(global_args=g, command=cmd, help=HelpArgs(topic=topic)), bundle)

        case Command.VERSION:
            return (AppArgs(global_args=g, command=cmd, version=VersionArgs()), bundle)

        case _:
            raise CliError(f"Unsupported command: {cmd!s}")


def _add_clean(sub: argparse._SubParsersAction) -> argparse.ArgumentParser:
    targets = DEFAULT_CLEAN_TARGETS.dir_names_recursive

    p = sub.add_parser(
        Command.CLEAN.value,
        help="Clean workspace artifacts using default target list.",
        description=(
            "Clean workspace artifacts.\n"
            "\n"
            "If you run this command without parameters, it removes the default targets\n"
            "listed below (recursively under --root_dir).\n"
            "\n"
            "Default targets (directory names):\n"
            + "\n".join(f"  - {t}" for t in targets)
            + "\n"
            "\n"
            "Notes:\n"
            "  - __pycache__ is safe to remove (it will be regenerated).\n"
            "  - .env and .env.local are intentionally NOT removed (disabled).\n"
        ),
        formatter_class=argparse.RawTextHelpFormatter,
    )

    p.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Print what would be removed without deleting anything.",
    )

    return p

def _add_docker(sub: argparse._SubParsersAction) -> argparse.ArgumentParser:
    p = sub.add_parser(
        Command.DOCKER.value,
        help="Manage docker compose stack (up/down/start/stop/restart).",
        description=(
            "Docker compose stack management.\n"
            "\n"
            "This command prepares parameters for docker-compose operations.\n"
            "Currently it prints what would be executed (no real execution yet),\n"
            "but it already validates Docker availability (docker CLI + daemon).\n"
            "\n"
            "Notes:\n"
            "  - The compose file path is resolved relative to --root_dir.\n"
            "  - --volumes affects only 'down' and 'restart'.\n"
        ),
        epilog=(
            "Examples:\n"
            "  scripts docker up\n"
            "  scripts docker down\n"
            "  scripts docker down --volumes\n"
            "  scripts docker restart --volumes\n"
            "  scripts docker up -f infra/docker/docker-compose.yml\n"
        ),
        formatter_class=argparse.RawTextHelpFormatter,
    )

    p.add_argument(
        "action",
        nargs="?",
        default=DockerAction.UP.value,
        choices=[a.value for a in DockerAction],
        metavar="ACTION",
        help=(
            "Docker action to perform:\n"
            "  up      - create/start containers (equivalent to 'docker compose up -d')\n"
            "  down    - stop and remove containers (optional: --volumes)\n"
            "  start   - start existing containers\n"
            "  stop    - stop running containers\n"
            "  restart - down + up (optional: --volumes)\n"
        ),
    )

    p.add_argument(
        "-f", "--compose-file",
        dest="compose_file",
        default="docker/docker-compose.yml",
        metavar="PATH",
        help=(
            "Path to docker-compose YAML, relative to --root_dir.\n"
            "Default: docker/docker-compose.yml"
        ),
    )

    p.add_argument(
        "--volumes",
        action="store_true",
        default=False,
        help=(
            "Remove named volumes when running 'down' or 'restart'.\n"
            "Equivalent to: docker compose down -v"
        ),
    )

    return p


def _add_doctor(sub: argparse._SubParsersAction) -> argparse.ArgumentParser:
    p = sub.add_parser(
        Command.DOCTOR.value,
        help="Validate (and optionally fix) configuration files using schemas.",
        description=(
            "Doctor runs all registered checks (ENV validation + interactive repair).\n"
            "\n"
            "Default behavior:\n"
            "  - validates all env files registered via decorators\n"
            "  - if issues are found, prints details + expected keys\n"
            "  - asks whether to apply fixes (defaults to 'No')\n"
            "  - creates a backup in ./tmp before patching\n"
            "  - patches only failing keys (does not rewrite unrelated lines)\n"
        ),
        formatter_class=argparse.RawTextHelpFormatter,
    )

    p.add_argument(
        "-y", "--yes",
        action="store_true",
        default=False,
        help="Apply fixes automatically without prompting.",
    )
    p.add_argument(
        "--check-only",
        action="store_true",
        default=False,
        help="Only validate (do not write, do not prompt).",
    )
    return p


def _add_help(sub: argparse._SubParsersAction) -> argparse.ArgumentParser:
    p = sub.add_parser(Command.HELP.value, help="Show help for a command.")
    p.add_argument("topic", nargs="?", default=None, help="Command name, e.g. 'docker'.")
    return p


def _add_version(sub: argparse._SubParsersAction) -> argparse.ArgumentParser:
    p = sub.add_parser(Command.VERSION.value, help="Print version and exit.")
    return p


def _validate_root_dir(path: Path) -> Path:
    """Validate root dir exists (fail-fast)."""
    if not path.exists():
        raise CliError(f"Root dir does not exist: {path}")
    if not path.is_dir():
        raise CliError(f"Root dir is not a directory: {path}")
    return path.resolve()


def _version_string() -> str:
    return f"{APP_INFO.name} {APP_INFO.version} ({APP_INFO.license})"
