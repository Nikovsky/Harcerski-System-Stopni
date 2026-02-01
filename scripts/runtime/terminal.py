# @file: ./scripts/runtime/terminal.py
# @description: Terminal capability detection (ANSI color support) with Windows VT enabling

from __future__ import annotations

import os
import sys
from typing import Final, TextIO


def supports_ansi(stream: TextIO) -> bool:
    """
    Return True if ANSI escape sequences should be used for this stream.

    Rules:
      - respects NO_COLOR
      - requires TTY
      - avoids TERM=dumb
      - on Windows: attempts to enable Virtual Terminal Processing (VT) and returns success
    """
    if os.environ.get("NO_COLOR") is not None:
        return False

    if not hasattr(stream, "isatty") or not stream.isatty():
        return False

    term = os.environ.get("TERM", "").lower()
    if term == "dumb":
        return False

    if os.name != "nt":
        return True

    # Windows: do not guess; try enabling VT mode.
    return _try_enable_windows_vt(stream)


def _try_enable_windows_vt(stream: TextIO) -> bool:
    """
    Enable ANSI/VT processing on Windows console for the given stream.

    If enabling fails (e.g., redirected stream, unsupported console host),
    returns False.
    """
    try:
        import ctypes
        import msvcrt
    except Exception:
        return False

    if not hasattr(stream, "fileno"):
        return False

    try:
        fd = stream.fileno()
        handle = msvcrt.get_osfhandle(fd)
    except Exception:
        return False

    kernel32 = ctypes.windll.kernel32

    mode = ctypes.c_uint32()
    if kernel32.GetConsoleMode(handle, ctypes.byref(mode)) == 0:
        return False

    ENABLE_VIRTUAL_TERMINAL_PROCESSING: Final[int] = 0x0004
    new_mode = mode.value | ENABLE_VIRTUAL_TERMINAL_PROCESSING

    if kernel32.SetConsoleMode(handle, new_mode) == 0:
        return False

    return True
