# pnpm 11 and Audit Fixes Handoff

Date: 2026-06-22

## Summary

The repository package manager was upgraded to `pnpm@11.8.0`, and vulnerabilities from `audit.txt` were remediated.

## Important Decisions

- `packageManager` is now `pnpm@11.8.0`.
- pnpm 11 no longer reads `pnpm.overrides` from `package.json`, so overrides live in `pnpm-workspace.yaml`.
- pnpm 11 strict dependency build approval is handled through explicit `allowBuilds` in `pnpm-workspace.yaml`.
- Do not replace `allowBuilds` with `dangerouslyAllowAllBuilds`; keep build script approval explicit.

## Audit Fix Pattern

- Direct bumps were used for first-party direct dependencies where appropriate, including `next` and `next-intl`. Turbo was later removed in favor of pnpm workspace scripts.
- Transitive security fixes are enforced through root `overrides` in `pnpm-workspace.yaml`.
- `js-yaml@4.1.2` and `@babel/core@7.29.1` from audit guidance were not published in npm; real available safe versions were used instead.

## Validation Evidence

- `pnpm audit --audit-level moderate` returned `No known vulnerabilities found`.
- `CI=true pnpm typecheck` passed with 4 successful packages.

## Watchouts

- Local Node observed during validation was `v25.9.0`.
- Prisma install output warned it supports Node lines `20.19+`, `22.12+`, and `24.0+`; consider constraining project Node to 24 LTS instead of open-ended `>=24.12.0`.
