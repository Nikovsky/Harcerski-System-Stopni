# @file: ./scripts/main.py
# @description: Main CLI dispatcher (args parsing + help/version + command stubs)

from __future__ import annotations

import sys
from pathlib import Path

from scripts.cli.args import Command, parse_args
from scripts.core.app_info import APP_INFO
from scripts.core.global_vars import init_global_vars
from scripts.core.errors import CliError
from scripts.utils.console import msgx


def _default_repo_root() -> Path:
    """Auto-detect repo root based on this file location."""
    return Path(__file__).resolve().parent.parent


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv

    default_root = _default_repo_root()
    args, bundle = parse_args(argv, default_root=default_root)

    init_global_vars(repo_root=args.global_args.root_dir)

    match args.command:
        case Command.HELP:
            assert args.help is not None
            _print_help(bundle, topic=args.help.topic)
            return 0

        case Command.VERSION:
            msgx.i(f"{APP_INFO.name} {APP_INFO.version} ({APP_INFO.license})")
            return 0

        case Command.CLEAN:
            assert args.clean is not None
            from scripts.commands.clean import run_clean
            return run_clean(repo_root=args.global_args.root_dir, opt=args.clean)


        case Command.DOCTOR:
            assert args.doctor is not None
            from scripts.commands.doctor import run_doctor
            return run_doctor(repo_root=args.global_args.root_dir, opt=args.doctor)


        case Command.DOCKER:
            assert args.docker is not None
            from scripts.commands.docker import run_docker
            return run_docker(repo_root=args.global_args.root_dir, opt=args.docker)

        case _:
            raise CliError(f"Unsupported command: {args.command!s}")


def _print_help(bundle, *, topic: str | None) -> None:
    if not topic:
        bundle.parser.print_help()
        return

    sub = bundle.command_parsers.get(topic)
    if sub is None:
        msgx.e(f"Unknown help topic: {topic!r}")
        msgx.i("Available topics: " + ", ".join(sorted(bundle.command_parsers.keys())))
        return

    sub.print_help()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
