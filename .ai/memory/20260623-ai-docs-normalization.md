# AI Docs Normalization Handoff

Date: 2026-06-23

## What changed

- `.ai/` was normalized after repo cleanup so it reflects the current repository shape.
- `.ai/README.md` now states the active repo contract:
  - pnpm workspace monorepo without Turbo.
  - `pnpm dev` runs `pnpm validate:env` first.
  - `pnpm dev` does not start Docker automatically.
  - runtime scripts are Node/MJS.
- `.ai/CONTEXT.md` now names the project correctly as Harcerski System Stopni and records the current stack:
  - Next.js 16
  - NestJS 11
  - Prisma 7
  - pnpm 11
- `.ai/CODING_GUIDELINES.md` now reflects the real root layout:
  - `apps/api`
  - `apps/web`
  - `packages/database`
  - `packages/schemas`
  - `docker`
  - `docs`
  - `scripts`
- `.ai/TEST_GUIDELINES.md` and `.ai/DEFINITION_OF_DONE.md` include `validate:env` as a quality gate.

## Current rules

- Do not reintroduce repo-local `.codex/`, `skills/`, `CLAUDE.md`, `.venv/`, `.pnpm-store/`, or `requirements.txt`.
- Keep root compliance docs English-only:
  - `CODE_OF_CONDUCT.md`
  - `SECURITY.md`
  - `CONTRIBUTING.md`
- Use `.ai/memory/` only for safe-to-commit handoff notes. Do not store secrets, tokens, logs, auth state, or local session data.

## Follow-up

- Before claiming local dev is ready, run `pnpm validate:env`.
- If validation fails, update local `.env` files from their matching `.env.example` files without committing secrets.
