# Repo Cleanup and Runtime Scripts Handoff

Date: 2026-06-23

## Current state

- HSS is a pnpm workspace monorepo without Turbo.
- `packageManager` is `pnpm@11.8.0`.
- Root `pnpm dev` runs `pnpm validate:env` before Prisma generate, schemas build, database build, and app dev servers.
- `pnpm dev` does not auto-start Docker; use `pnpm stack:up` explicitly.
- Runtime scripts are Node/MJS:
  - `scripts/infra.mjs` backs `pnpm stack:*`.
  - `scripts/clean.mjs` backs `pnpm clean:*`.
  - `scripts/validate-env.mjs` validates `.env` against `.env.example`.
  - `scripts/validate-certs.mjs` validates local cert material.
- Removed repo-local agent/tooling or cache artifacts:
  - `.codex/`
  - `skills/`
  - `CLAUDE.md`
  - `.venv/`
  - `.pnpm-store/`
  - `requirements.txt`
- Root compliance docs are English canonical only:
  - `CODE_OF_CONDUCT.md`
  - `SECURITY.md`
  - `CONTRIBUTING.md`

## Validation note

At the time of this note, `pnpm validate:env` runs but fails on local `.env` drift:

- `apps/api/.env` is missing MinIO variables required by `apps/api/.env.example`.
- `apps/web/.env` is missing E2E variables required by `apps/web/.env.example`.

Do not commit real secrets. Fix local `.env` values from the corresponding `.env.example` files.
