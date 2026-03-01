# Repository Guidelines

## Project Scope
HSS (Harcerski System Stopni) is a Turborepo monorepo (`pnpm`) with enterprise security and quality expectations.  
Primary goal: keep `apps/web` and `apps/api` horizontally scalable and stateless by default.

## Requirements & Structure
- Runtime: Node `>=24.12.0`, pnpm `>=10.26.0`, Docker required.
- Apps:
  - `apps/web` - Next.js (SSR + `next-intl`)
  - `apps/api` - NestJS API
- Shared packages:
  - `packages/schemas` - shared Zod contracts (source of truth)
  - `packages/database` - Prisma schema, migrations, seed
- Infra: `docker/*` (nginx TLS proxy, Keycloak, PostgreSQL, MinIO)
- Docs: `docs/*`, with security/process details in `CONTRIBUTING.md` and `SECURITY.md`

## Core Engineering Rules (MUST)
- Every code file starts with: `// @file: <repo-path-from-root>`.
- Keep code self-describing: small functions, clear naming, single responsibility.
- Controllers/pages stay thin; business logic belongs in services/use-cases/hooks.
- Validate all boundaries: HTTP DTOs, forms, startup config.
- Use strict TypeScript; avoid `any`; prefer schema-driven types (`zod` -> inferred TS).
- Stateless-first: no in-memory sessions/locks/rate limits for correctness.
- If not horizontal-safe, mark explicitly:
  - `// [SINGLE-INSTANCE] reason: ...`

## Security & Configuration (MUST)
- Never commit secrets (`.env`, keys, tokens, passwords). Keep `.env.example` up to date.
- Env variables must be validated at startup (fail fast), via centralized config modules.
- RBAC is enforced server-side at API boundary; client checks are UX-only.
- No token storage in `localStorage`.
- Cookies/auth must use secure flags and CSRF protection when cookie-based auth is used.
- Never log secrets/PII; do not expose stack traces/internal DB errors to clients.
- API errors should follow a stable envelope: `code`, `message`, optional `details`, `requestId`.

## Build, Test, and Quality Gates
- Core commands:
  - `pnpm dev`, `pnpm stack:up`, `pnpm stack:down`
  - `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm audit`
  - `pnpm db:generate`, `pnpm db:migrate`
- Testing baseline: unit (domain/helpers), integration (API + DB), E2E (auth/protected/core journeys).
- Required PR gates: lint, typecheck, test, dependency audit, secret scanning, SAST.

## Commits & Pull Requests
- Branches: `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*`.
- Prefer Conventional Commits (e.g., `feat(api): ...`); area-prefix style is also used in history.
- PR must include: what changed, why, risk, verification steps, docs updates, and touched MUST controls.
