# AGENTS.md — Engineering Rules (HSS Monorepo)

HSS (Harcerski System Stopni) is a Turborepo monorepo using pnpm.
This document defines **non-negotiable** engineering, security, and quality rules.

> Default language: **English** (code, comments, docs, commit messages, PRs).

---

## 0) Goals and non-goals

### Goals
- Enterprise-grade code quality and security hardening (“max security posture”).
- Stateless-by-default architecture to enable future horizontal scaling.
- Clear API contracts shared via `packages/schemas`.
- Repeatable, production-like local environment (TLS via nginx, infra via Docker).

### Non-goals (today)
- Multi-region / active-active deployments.
- Distributed job processing, distributed locks, or cluster-aware scheduling.
- Guaranteed HA for infra services in local/dev.

### Horizontal scaling stance
- **Target**: API + Web should remain horizontally scalable (stateless).
- Any code that is NOT horizontally safe MUST be marked clearly with:
  - `// [SINGLE-INSTANCE] reason: ...`
  - and a brief note on what would be needed to make it horizontally safe.

---

## 1) Requirements

- Node: >= 24.12.0
- pnpm: >= 10.26.0
- Docker: required for infra stack
- OS: any (Linux/macOS/Windows+WSL2 supported)

---

## 2) Repository structure

- `apps/api` — NestJS API
- `apps/web` — Next.js Web (SSR + next-intl)
- `packages/database` — Prisma (schema, client, enums, migrations/seed if applicable)
- `packages/schemas` — Shared schemas/contracts (zod), shared interfaces/types

Infra stack runs via Docker:
- Keycloak, PostgreSQL, nginx, MinIO

---

## 3) Environments, URLs, ports

### Local base URLs
- APP_URL=https://hss.local
- API_URL=https://api.hss.local
- AUTH_URL=https://auth.hss.local
- S3_URL=https://s3.hss.local
- S3CONSOLE_URL=https://s3console.hss.local

### Local ports (defaults)
- Next.js: 3000
- NestJS: 5000
- PostgreSQL: 5432
- Keycloak: 8080
- MinIO: 9000
- MinIO Console: 9001
- nginx: 80 → 443 (TLS termination)

### TLS
- nginx terminates TLS for *.hss.local
- Production-grade headers expected (HSTS, nosniff, etc.)
- Certificate handling must be documented in `docs/runbook-local-tls.md`

---

## 4) Configuration & secrets policy

### No secrets committed
- Never commit `.env`, private keys, tokens, passwords.
- Use `.env.example` and documented required variables.

### Mandatory env schema validation
- Every app MUST validate env at startup using zod schemas from `packages/schemas`.
- Failure mode: **fail fast** (startup error) with a safe message.

### Config boundaries
- `apps/*` may only read config through a single config module (no scattered `process.env` reads).
- Shared env conventions live in `packages/schemas`.

---

## 5) Mandatory file header

Every code file MUST start with:
`// @file: <repo-path-from-root>`

Example:
`// @file: apps/web/src/components/ui/button.tsx`

(For non-TS files, use the closest equivalent comment syntax.)

---

## 6) Default engineering expectations

- Self-describing code: small functions, single responsibility, clear names.
- Avoid global mutable state and runtime module caches.
- Validate input at boundaries:
  - HTTP DTOs / controllers
  - forms
  - startup config
- Types everywhere:
  - strict TypeScript
  - avoid `any`
  - prefer schema-driven types (zod → inferred types)
- Performance:
  - do not ship unnecessary data
  - keep client components lean
  - SSR/Server Components for critical flows
- Scaling:
  - avoid in-memory sessions, in-memory rate limiting, in-memory locks, local file storage

---

## 7) Security rules (mandatory)

### Auth & RBAC
- RBAC must be enforced **server-side** at the API boundary.
- Client-side RBAC checks are allowed only for UX, never for security.

### Input security
- Validate and sanitize all untrusted input.
- Explicitly handle file uploads (type, size, content checks, malware scanning seam).
- Never trust headers or client-provided roles/ids.

### Cookies & tokens
- Cookies must be configured with correct flags: HttpOnly, Secure, SameSite.
- Implement CSRF protections where cookies are used for auth.
- Never log passwords, tokens, secrets, refresh tokens, authorization headers.

### Error exposure
- Never leak stack traces or internal errors to clients.
- Use consistent error responses with stable error codes.

### Rate limiting & brute-force protection
- Add rate limiting for auth endpoints and sensitive operations.
- If rate limiting is in-memory, mark as:
  - `// [SINGLE-INSTANCE] reason: in-memory rate limit`

---

## 8) Error handling, logging, and correlation IDs

### Error contract
All API errors must return a consistent envelope, e.g.:
- `code` (stable machine-readable code)
- `message` (safe for users)
- `details` (optional, non-sensitive)
- `requestId` (if available)

### Logging
- Structured logs (JSON) preferred.
- Logs must be level-based, secrets/PII-safe, and include `requestId` when available.
- Never log sensitive personal data.

### Correlation
- nginx should pass/request a correlation id.
- API should propagate it to logs and responses.

---

## 9) Frontend rules (apps/web)

- Reusable components MUST live in:
  - `apps/web/src/components/ui`
  - `apps/web/src/components/layout`
- SSR is critical for:
  - auth, RBAC, protected routes
- i18n:
  - `next-intl` with namespaced messages
- Security:
  - do not store tokens in localStorage
  - avoid exposing sensitive data to the client bundle

---

## 10) Backend rules (apps/api)

- Controllers are thin. Business logic lives in services/use-cases.
- DTO validation at the boundary is mandatory.
- Do not expose internal database errors directly.
- Prefer explicit allowlists for filters/sorts.
- For external integrations (S3/Keycloak), isolate in adapters.

---

## 11) Database rules (packages/database)

- Prisma schema is the source of truth for DB structure.
- Migrations must be reproducible and reviewed.
- No destructive migration without a documented plan.
- Add proper indexes/constraints for critical queries and uniqueness rules.

---

## 12) Shared contract rules (packages/schemas)

- Shared schemas define the API contract (requests/responses).
- Breaking changes require coordinated updates across API + Web.
- Prefer zod schemas + inferred types rather than hand-written duplicated types.

---

## 13) Quality gates (required on every PR)

- lint
- typecheck
- test

PRs that fail any gate do not merge.

---

## 14) Testing baseline

- Unit: domain logic + helpers
- Integration: API + DB paths
- E2E: auth, protected routes, core journeys

---

## 15) Dependency hygiene & supply chain

- Pin versions intentionally.
- Lockfile changes must be reviewed.
- Avoid unmaintained libs for core features.
- Run audits in CI (pnpm audit or equivalent).

---

## 16) PR checklist (minimum)

- [ ] lint/typecheck/tests pass
- [ ] security reviewed (no shortcuts)
- [ ] performance considered (no huge payloads)
- [ ] scaling impact noted if relevant
- [ ] docs updated if behavior changes
- [ ] any single-instance logic marked with `[SINGLE-INSTANCE]`

(For full detail, see CONTRIBUTING.md / SECURITY.md / docs/runbook*.md)
