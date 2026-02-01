# @file: ./scripts/runtime/docker_ops.py
# @description: Docker compose operations API (real execution) with Docker and env guards

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from functools import wraps
from pathlib import Path
from typing import Callable, Final, ParamSpec, TypeVar

from scripts.core.errors import CliError
from scripts.runtime.doctor_decorators import doctor_env, doctor_sh_lf
from scripts.schemas.schema import schema
from scripts.utils.console import msgx

P = ParamSpec("P")
R = TypeVar("R")


def requires_docker(func: Callable[P, R]) -> Callable[P, R]:
    """
    Guard decorator:
      - verifies docker CLI exists
      - verifies docker daemon is reachable
      - attempts to start Docker (best-effort)
      - raises CliError with actionable message if still unavailable
    """
    @wraps(func)
    def _wrapped(*args: P.args, **kwargs: P.kwargs) -> R:
        _ensure_docker_ready()
        return func(*args, **kwargs)
    return _wrapped


def _ensure_docker_ready() -> None:
    if not _has_docker_cli():
        raise CliError(
            "Docker is not available.\n"
            "Make sure Docker is installed on this computer and 'docker' is on PATH."
        )

    if _docker_daemon_ok():
        return

    msgx.w("Docker daemon is not reachable. Attempting to start Docker...")
    _try_start_docker_daemon()

    if _docker_daemon_ok():
        msgx.s("Docker daemon is running.")
        return

    raise CliError(
        "Docker could not be started automatically.\n"
        "Start Docker manually and try again.\n"
        "Also make sure Docker is installed on this computer."
    )


def _has_docker_cli() -> bool:
    return shutil.which("docker") is not None


def _docker_daemon_ok() -> bool:
    try:
        r = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
            timeout=4,
            check=False,
        )
        return r.returncode == 0
    except Exception:
        return False


def _try_start_docker_daemon() -> None:
    if os.name == "nt":
        _try_start_docker_desktop_windows()
        _wait_for_daemon()
        return

    if sys.platform == "darwin":
        _try_run(["open", "-a", "Docker"])
        _wait_for_daemon()
        return

    _try_run(["systemctl", "start", "docker"])
    _wait_for_daemon()


def _try_start_docker_desktop_windows() -> None:
    candidates: list[Path] = [
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Docker" / "Docker" / "Docker Desktop.exe",
        Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")) / "Docker" / "Docker" / "Docker Desktop.exe",
    ]

    exe = next((p for p in candidates if p.exists()), None)
    if exe is None:
        msgx.w("Docker Desktop executable not found in standard locations.")
        return

    try:
        subprocess.Popen([str(exe)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)  # noqa: S603
    except Exception:
        msgx.w("Failed to launch Docker Desktop process.")


def _wait_for_daemon() -> None:
    for _ in range(12):
        if _docker_daemon_ok():
            return
        time.sleep(1)


def _try_run(cmd: list[str]) -> None:
    try:
        subprocess.run(cmd, capture_output=True, text=True, timeout=6, check=False)
    except Exception:
        return


def _run(cmd: list[str], *, timeout: int = 300) -> None:
    """
    Run a subprocess command safely (no shell=True).
    Prints stderr on failure.
    """
    msgx.i("[docker] " + " ".join(str(x) for x in cmd))
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
    if r.returncode != 0:
        err = (r.stderr or r.stdout or "").strip()
        raise CliError(f"Docker command failed (exit={r.returncode}).\n{err}")


def _validate_compose(compose_file: Path) -> None:
    """
    Validate compose file using docker compose itself (best and portable).
    """
    if not compose_file.exists():
        raise CliError(f"Compose file not found: {compose_file}")

    _run(["docker", "compose", "-f", str(compose_file), "config", "-q"], timeout=60)
    msgx.s("[docker] compose config OK")


def _list_containers(compose_file: Path) -> list[str]:
    """
    Return container IDs for this compose project (if any).
    """
    r = subprocess.run(
        ["docker", "compose", "-f", str(compose_file), "ps", "-q"],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if r.returncode != 0:
        return []
    ids = [x.strip() for x in (r.stdout or "").splitlines() if x.strip()]
    return ids


def _inspect_container(cid: str) -> dict:
    r = subprocess.run(
        ["docker", "inspect", cid],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if r.returncode != 0:
        return {}
    # json is small; safe to parse
    import json
    arr = json.loads(r.stdout)
    return arr[0] if arr else {}


def _require_running_and_healthy(compose_file: Path) -> None:
    """
    After up: ensure all containers are running; if health exists, require healthy.
    """
    ids = _list_containers(compose_file)
    if not ids:
        raise CliError("No containers found after compose up. Check compose file and logs.")

    bad: list[str] = []
    for cid in ids:
        data = _inspect_container(cid)
        state = (data.get("State") or {})
        status = state.get("Status")
        health = (state.get("Health") or {}).get("Status")

        if status != "running":
            name = (data.get("Name") or cid).lstrip("/")
            bad.append(f"{name}: status={status}")
            continue

        # health is optional; if present, require healthy
        if health is not None and health != "healthy":
            name = (data.get("Name") or cid).lstrip("/")
            bad.append(f"{name}: health={health}")

    if bad:
        msgx.e("[docker] Some containers are not ready:")
        for line in bad:
            msgx.e("  " + line)
        raise CliError("Compose stack is not fully running/healthy.")
    msgx.s("[docker] All containers running (and healthy if healthchecks exist).")


@dataclass(frozen=True, slots=True)
class DockerCompose:
    """Callable docker compose API (real execution)."""

    @doctor_sh_lf("./docker", yes=True)
    @doctor_env(schema.compose, "./docker/.env")
    @requires_docker
    def up(self, *, compose_file: Path) -> None:
        _validate_compose(compose_file)
        _run(["docker", "compose", "-f", str(compose_file), "up", "-d"], timeout=600)
        _require_running_and_healthy(compose_file)

    @doctor_env(schema.compose, "./docker/.env")
    @requires_docker
    def down(self, *, compose_file: Path, volumes: bool) -> None:
        _validate_compose(compose_file)
        cmd = ["docker", "compose", "-f", str(compose_file), "down"]
        if volumes:
            cmd.append("-v")
        _run(cmd, timeout=600)

    @doctor_env(schema.compose, "./docker/.env")
    @requires_docker
    def start(self, *, compose_file: Path) -> None:
        _validate_compose(compose_file)
        _run(["docker", "compose", "-f", str(compose_file), "start"], timeout=300)

    @doctor_env(schema.compose, "./docker/.env")
    @requires_docker
    def stop(self, *, compose_file: Path) -> None:
        _validate_compose(compose_file)
        _run(["docker", "compose", "-f", str(compose_file), "stop"], timeout=300)

    @doctor_env(schema.compose, "./docker/.env")
    @requires_docker
    def restart(self, *, compose_file: Path, volumes: bool) -> None:
        msgx.i("[docker] restart = down + up")
        self.down(compose_file=compose_file, volumes=volumes)
        self.up(compose_file=compose_file)


docker: Final[DockerCompose] = DockerCompose()
