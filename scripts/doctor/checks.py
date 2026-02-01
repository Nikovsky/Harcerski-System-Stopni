# @file: ./scripts/doctor/checks.py
# @description: Doctor checks registered via decorators (edit to add more files)

from __future__ import annotations

from scripts.core.doctoring import doctor
from scripts.schemas.schema import schema


@doctor(schema.prisma, "./packages/database/.env")
def _check_prisma_env() -> None:
    return

@doctor(schema.compose, "./docker/.env")
def _check_compose_env() -> None:
    return

@doctor(schema.nest, "./apps/api/.env")
def _check_nest_env() -> None:
    return

@doctor(schema.next, "./apps/web/.env")
def _check_next_env() -> None:
    return