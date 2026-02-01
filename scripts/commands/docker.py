# @file: ./scripts/commands/docker.py
# @description: Docker command handler (stub)

from __future__ import annotations

from pathlib import Path

from scripts.cli.args import DockerArgs
from scripts.utils.console import msg


def run_docker(*, repo_root: Path, opt: DockerArgs) -> int:
    """Stub: implement docker compose orchestration later."""
    msg.info(f"docker: action={opt.action} compose_file={opt.compose_file}")
    return 0
