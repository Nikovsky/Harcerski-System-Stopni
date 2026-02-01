# @file: ./scripts/runtime/doctor_decorators.py
# @description: Decorators that run doctor checks before executing actions (e.g., docker)

from __future__ import annotations

from functools import wraps
from typing import Callable, ParamSpec, TypeVar

from scripts.core.doctoring import doctor
from scripts.core.errors import CliError
from scripts.schemas.schema import EnvSchema

P = ParamSpec("P")
R = TypeVar("R")


def doctor_env(schema: EnvSchema, rel_path: str) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Run doctor env validation before executing the wrapped function.

    Default behavior is interactive (asks before fixing).
    """
    def _decorator(fn: Callable[P, R]) -> Callable[P, R]:
        @wraps(fn)
        def _wrapped(*args: P.args, **kwargs: P.kwargs) -> R:
            ok = doctor.run_env_check(schema=schema, rel_path=rel_path, yes=False, check_only=False)
            if not ok:
                raise CliError("Environment validation failed; fix the issues and try again.")
            return fn(*args, **kwargs)
        return _wrapped
    return _decorator

def doctor_sh_lf(root_rel: str, *, yes: bool = False) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Ensure *.sh scripts under root_rel use LF endings before running the function.
    Interactive by default (unless yes=True).
    """
    def _decorator(fn: Callable[P, R]) -> Callable[P, R]:
        @wraps(fn)
        def _wrapped(*args: P.args, **kwargs: P.kwargs) -> R:
            doctor.normalize_shell_scripts_lf(root_rel=root_rel, yes=yes, check_only=False)
            return fn(*args, **kwargs)
        return _wrapped
    return _decorator
