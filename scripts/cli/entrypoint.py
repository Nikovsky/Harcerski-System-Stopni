# @file: ./scripts/cli/entrypoint.py
# @description: CLI decorator that enforces consistent error handling and exit codes

from __future__ import annotations

import traceback
from collections.abc import Callable, Sequence
from functools import wraps

from scripts.core.errors import CliError, ExitCode


def cli_entrypoint(func: Callable[[list[str] | None], int]) -> Callable[[list[str] | None], int]:
    """
    Decorator for the CLI entry function.

    Behavior:
      - no stack trace for CliError (user error)
      - stack trace only when --debug enabled (handled inside run_app)
      - maps unexpected exceptions to INTERNAL_ERROR
    """
    @wraps(func)
    def _wrapped(argv: list[str] | None = None) -> int:
        try:
            return int(func(argv))
        except CliError as e:
            # console may not be initialized yet; keep output plain and stable
            print(f"[e]: {e}")
            return int(e.code)
        except KeyboardInterrupt:
            print("[x]: Interrupted.")
            return int(ExitCode.USER_ERROR)
        except Exception as e:  # noqa: BLE001 (intentional boundary)
            print(f"[x]: Internal error: {e}")
            # keep stack trace minimal by default
            # (when --debug is enabled, run_app will re-raise instead)
            return int(ExitCode.INTERNAL_ERROR)

    return _wrapped
