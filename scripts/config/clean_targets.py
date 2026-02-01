# @file: ./scripts/config/clean_targets.py
# @description: Default clean targets (directory names) used by the clean command

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, Sequence


@dataclass(frozen=True, slots=True)
class CleanTargets:
    """Declarative clean targets (edit this file to extend cleaning)."""
    dir_names_recursive: Sequence[str]
    disabled_file_names: Sequence[str]


DEFAULT_CLEAN_TARGETS: Final[CleanTargets] = CleanTargets(
    dir_names_recursive=(
        "__pycache__",
        ".turbo",
        "dist",
        "node_modules",
        ".next",
        "generated",  # Prisma / codegen outputs
    ),
    disabled_file_names=(
        # ".env",        # disabled (do not remove)
        # ".env.local",  # disabled (do not remove)
    ),
)
