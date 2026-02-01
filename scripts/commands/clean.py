# @file: ./scripts/commands/clean.py
# @description: Clean command handler (removes default targets recursively under repo root)

from __future__ import annotations

import os
import shutil
import stat
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

from scripts.cli.args import CleanArgs
from scripts.config.clean_targets import DEFAULT_CLEAN_TARGETS
from scripts.utils.console import msgx


@dataclass(frozen=True, slots=True)
class CleanResult:
    """Result of clean operation."""
    found: int
    removed: int
    failed: int


def run_clean(*, repo_root: Path, opt: CleanArgs) -> int:
    """
    Remove configured target directories recursively under repo_root.

    Deletion policy:
      - operates only within repo_root
      - skips .git traversal
      - does not follow symlinks (removes symlink itself)
      - deterministic order of output
    """
    targets = set(DEFAULT_CLEAN_TARGETS.dir_names_recursive)

    msgx.i(f"clean: root={repo_root} dry_run={opt.dry_run}")
    msgx.i("Scanning for targets...")

    candidates = _find_target_dirs(repo_root=repo_root, target_names=targets)
    if not candidates:
        msgx.s("Nothing to clean.")
        return 0

    msgx.i(f"Found {len(candidates)} target(s).")
    result = _remove_all(candidates, dry_run=opt.dry_run)

    if opt.dry_run:
        msgx.s("Dry-run completed.")
        return 0

    if result.failed == 0:
        msgx.s(f"Clean completed: removed={result.removed}")
        return 0

    msgx.e(f"Clean completed with errors: removed={result.removed} failed={result.failed}")
    return 2


def _find_target_dirs(*, repo_root: Path, target_names: set[str]) -> list[Path]:
    """
    Find directories by name anywhere under repo_root.

    Uses os.walk for performance and to avoid descending into directories that will be removed.
    """
    out: list[Path] = []

    for dirpath, dirnames, _filenames in os.walk(repo_root):
        # Prevent scanning VCS metadata (safety + speed).
        if ".git" in dirnames:
            dirnames.remove(".git")

        # Detect target directories at this level.
        for name in list(dirnames):
            if name in target_names:
                p = Path(dirpath) / name
                out.append(p)
                # Do not descend into directories we plan to delete.
                dirnames.remove(name)

    # Delete deeper paths first (safer ordering), deterministic tie-break.
    out.sort(key=lambda p: (len(p.parts), str(p).lower()), reverse=True)
    return out


def _remove_all(paths: Sequence[Path], *, dry_run: bool) -> CleanResult:
    found = len(paths)
    removed = 0
    failed = 0

    for idx, p in enumerate(paths, start=1):
        msgx.i(f"[{idx}/{found}] Removing: {p}")

        if dry_run:
            continue

        try:
            _remove_path(p)
            removed += 1
        except Exception as e:  # noqa: BLE001 (tool boundary)
            failed += 1
            msgx.e(f"Failed to remove: {p} ({e})")

    return CleanResult(found=found, removed=removed, failed=failed)


def _remove_path(path: Path) -> None:
    """
    Remove directory or symlink safely.
    """
    if not path.exists():
        return

    if path.is_symlink():
        path.unlink(missing_ok=True)
        return

    if path.is_dir():
        shutil.rmtree(path, onerror=_on_rmtree_error)
        return

    # Should not happen (we scan dirs), but keep safe.
    path.unlink(missing_ok=True)


def _on_rmtree_error(func, p: str, exc_info) -> None:
    """
    Windows-friendly removal: if a file is read-only, make it writable and retry.

    This is a standard approach to handle npm/Windows permission quirks.
    """
    try:
        os.chmod(p, stat.S_IWRITE)
        func(p)
    except Exception:
        # Re-raise the original error if we cannot recover.
        raise
