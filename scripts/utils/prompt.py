# @file: ./scripts/utils/prompt.py
# @description: Simple interactive prompts (yes/no)

from __future__ import annotations


def ask_yes_no(question: str, *, default_no: bool = True) -> bool:
    """
    Ask a yes/no question.

    default_no=True => [y/N]
    default_no=False => [Y/n]
    """
    suffix = " [y/N]: " if default_no else " [Y/n]: "
    ans = input(question + suffix).strip().lower()
    if ans == "":
        return not default_no
    return ans in {"y", "yes"}
