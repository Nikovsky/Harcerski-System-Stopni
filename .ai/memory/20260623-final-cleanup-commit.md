# Final Cleanup Commit Handoff

Date: 2026-06-23

## Current commit scope

The current workspace cleanup covers repository tooling, runtime scripts, docs, and AI memory normalization.

Main areas:

- Removed Turbo and moved root scripts to pnpm workspace commands.
- Updated package manager/runtime expectations to pnpm `11.8.0`.
- Replaced legacy PowerShell runtime scripts with Node/MJS scripts:
  - `scripts/infra.mjs`
  - `scripts/clean.mjs`
  - `scripts/validate-env.mjs`
  - `scripts/validate-certs.mjs`
- Root `pnpm dev` now runs `pnpm validate:env` before generate/build/dev startup steps.
- Root `pnpm dev` does not auto-start Docker; use `pnpm stack:up` explicitly.
- Removed repo-local agent/tooling/cache artifacts:
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
- `.ai/` has been normalized to reflect the current repo shape and runtime contract.
- `audit.json` and `tmp_audit_extract.ps1` are legacy audit artifacts and can be removed.

## Suggested commit message

`CHORE - Remove legacy tooling and normalize runtime docs`

## Validation notes

- `scripts/infra.mjs` syntax/help/is-running smoke checks were run.
- `scripts/clean.mjs` syntax and dry-run checks were run.
- JSON package files parsed successfully after script changes.
- `pnpm validate:env` runs but currently fails on local `.env` drift:
  - missing MinIO values in `apps/api/.env`
  - missing E2E values in `apps/web/.env`

Do not commit real secrets. Fix local `.env` values from matching `.env.example` files when local dev needs to run.
