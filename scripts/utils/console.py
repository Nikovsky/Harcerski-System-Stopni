# @file: ./scripts/utils/console.py
# @description: Console logger with optional ANSI colors and two modes: msg (no prefix) and msgx (with prefix)

from __future__ import annotations

import sys
from dataclasses import dataclass
from enum import StrEnum
from typing import Final, TextIO

from scripts.core.global_vars import gv


class Level(StrEnum):
    INFO = "i"
    SUCCESS = "s"
    WARNING = "w"
    ERROR = "e"
    FATAL = "x"


@dataclass(frozen=True, slots=True)
class _Ansi:
    reset: str = "\033[0m"
    green: str = "\033[32m"
    yellow: str = "\033[33m"
    red: str = "\033[31m"
    cyan: str = "\033[36m"
    bold: str = "\033[1m"


class Console:
    """
    Two intended instances:
      - msg  : no prefix, color if supported
      - msgx : prefix always, color if supported
    """

    _ansi: Final[_Ansi] = _Ansi()

    def __init__(self, *, with_prefix: bool) -> None:
        self._with_prefix = with_prefix

    def i(self, message: str) -> None:
        self._write(Level.INFO, message)

    def s(self, message: str) -> None:
        self._write(Level.SUCCESS, message)

    def w(self, message: str) -> None:
        self._write(Level.WARNING, message)

    def e(self, message: str) -> None:
        self._write(Level.ERROR, message)

    def x(self, message: str) -> None:
        self._write(Level.FATAL, message)

    def _write(self, level: Level, message: str) -> None:
        stream = self._stream_for(level)
        use_color = self._use_color_for(stream)

        prefix = f"[{level.value}]: " if self._with_prefix else ""

        if not use_color:
            stream.write(f"{prefix}{message}\n")
            stream.flush()
            return

        stream.write(self._colorize(level, prefix, message) + "\n")
        stream.flush()

    def _use_color_for(self, stream: TextIO) -> bool:
        g = gv()
        return g.use_color_stderr if stream is sys.stderr else g.use_color_stdout

    def _stream_for(self, level: Level) -> TextIO:
        if level in {Level.WARNING, Level.ERROR, Level.FATAL}:
            return sys.stderr
        return sys.stdout

    def _colorize(self, level: Level, prefix: str, message: str) -> str:
        a = self._ansi
        color = {
            Level.INFO: a.cyan,
            Level.SUCCESS: a.green,
            Level.WARNING: a.yellow,
            Level.ERROR: a.red,
            Level.FATAL: a.red,
        }[level]

        if prefix:
            prefix_col = f"{a.bold}{color}{prefix.rstrip()}{a.reset} "
            msg_col = f"{color}{message}{a.reset}"
            return prefix_col + msg_col

        return f"{color}{message}{a.reset}"


msg: Final[Console] = Console(with_prefix=False)   # no prefix
msgx: Final[Console] = Console(with_prefix=True)  # prefix always
