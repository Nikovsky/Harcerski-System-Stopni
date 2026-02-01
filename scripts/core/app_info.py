# @file: ./scripts/core/app_info.py
# @description: Application metadata (name, version, license)

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AppInfo:
    """Immutable application metadata used by CLI help and version output."""
    name: str
    version: str
    license: str
    authors: str | None = None


APP_INFO = AppInfo(
    name="HSS Tooling CLI",
    version="0.1.0",
    license="AGPL-3.0",
    authors="Kacper Boś <https://github.com/bos-8>",
)
