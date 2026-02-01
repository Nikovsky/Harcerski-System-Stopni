# @file: ./scripts/core/errors.py
# @description: Typed error and exit-code definitions for the CLI

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


class ExitCode(IntEnum):
    """Stable process exit codes used by the CLI."""
    OK = 0
    USER_ERROR = 2
    INTERNAL_ERROR = 3


@dataclass(frozen=True, slots=True)
class CliError(Exception):
    """A user-facing error that should not print a stack trace by default."""
    message: str
    code: ExitCode = ExitCode.USER_ERROR

    def __str__(self) -> str:
        return self.message
