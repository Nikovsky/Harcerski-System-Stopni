# @file: ./scripts/commands/docker.py
# @description: Docker command handler (dispatch to runtime docker API; prints only for now)

from __future__ import annotations

from pathlib import Path

from scripts.cli.args import DockerAction, DockerArgs
from scripts.runtime.docker_ops import docker
from scripts.utils.console import msgx


def run_docker(*, repo_root: Path, opt: DockerArgs) -> int:
    """
    Docker CLI handler.

    For now: prints what would be executed (but validates docker availability).
    """
    msgx.i(f"docker: action={opt.action.value} compose_file={opt.compose_file} volumes={opt.volumes}")

    match opt.action:
        case DockerAction.UP:
            docker.up(compose_file=opt.compose_file)

        case DockerAction.DOWN:
            docker.down(compose_file=opt.compose_file, volumes=opt.volumes)

        case DockerAction.START:
            docker.start(compose_file=opt.compose_file)

        case DockerAction.STOP:
            docker.stop(compose_file=opt.compose_file)

        case DockerAction.RESTART:
            docker.restart(compose_file=opt.compose_file, volumes=opt.volumes)

        case _:
            msgx.e(f"Unsupported docker action: {opt.action!s}")
            return 2

    return 0
