---
name: hss-prisma-postgres
description: Prisma and PostgreSQL implementation skill for HSS. Use when changing schema, migrations, indexes, constraints, transaction behavior, query safety, or data consistency in `packages/database` and API persistence paths.
---

# HSS Prisma + PostgreSQL

Use this skill for safe, reproducible DB changes with Prisma as source of truth.

## Workflow

1. Inspect current schema and related API use-cases.
2. Define data change intent:
   - additive vs breaking
   - migration safety
   - rollback strategy
3. Implement schema and migration with explicit constraints/indexes.
4. Update dependent contracts or API logic if shape changed.
5. Verify generation, migration, and application behavior.

## Rules

- Treat `packages/database/prisma/schema.prisma` as source of truth.
- Do not perform destructive migration without a documented plan.
- Prefer DB constraints for uniqueness/integrity where feasible.
- Use transactions for conflict-sensitive operations.
- Avoid silent runtime assumptions; make invariants explicit.

## Verification Commands

- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm -C packages/database build` (if available)
- API tests touching changed persistence behavior

## Review Checklist

- Are indexes present for critical queries?
- Are uniqueness constraints aligned with domain rules?
- Are conflict paths mapped to stable API errors (for example `409`)?
- Are breaking changes reflected in `packages/schemas` and consumers?
