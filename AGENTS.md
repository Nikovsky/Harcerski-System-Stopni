# AGENTS.md - Engineering Rules (Monorepo)

This repository is a turborepo monorepo using pnpm.

## Requirements

- Node: >= 24.12.0
- pnpm: >= 10.26.0
- Docker: required for infra stack

## Default expectations

- Communicate in English (code, comments, docs, commit messages).
- Write self-describing code (names, small functions, single responsibility).
- Comments only for: non-obvious "why", tradeoffs, security implications.
- Prefer stateless-by-default architecture (no global mutable state, no runtime module caches).
- Validate inputs at boundaries (HTTP DTOs, forms, startup config). Fail safely.
- Types everywhere (strict TS; avoid `any`; prefer schema-driven types like zod -> inferred types).
- Follow performance rules: avoid shipping unnecessary data; keep client components lean; SSR/Server Components for critical flows.
- Build for future horizontal scaling: avoid in-memory sessions/rate-limit/job-queue/locks.

## Mandatory file header

Every code file MUST start with:
`// @file: <repo-path-from-root>`
Example:
`// @file: apps/web/src/components/ui/button.tsx`

## Frontend rules (apps/web)

- Reusable components MUST live in:
  - `apps/web/src/components/ui`
  - `apps/web/src/components/layout`
- SSR is critical for: auth, RBAC, protected routes (client checks are not sufficient).
- i18n: `next-intl` with namespaced messages.

## Quality gates (required on every PR)

- lint
- typecheck
- test

## Mandatory security rules

- No secrets committed.
- RBAC enforced server-side at API boundary.
- Validate/sanitize all untrusted input.
- Cookies: use HttpOnly, Secure, SameSite appropriately.
- Add rate limiting / brute-force protections where relevant.
- Never log passwords/tokens/secrets/sensitive personal data.

## Error handling & logging

- Never leak stack traces or internal errors to clients.
- Use consistent error responses + error codes.
- Logs must be structured, level-based, free of secrets/PII, and include correlation/request id when available.

## Testing baseline

- Unit: domain logic + helpers
- Integration: API + DB paths
- E2E: auth, protected routes, core journeys

## Dependency hygiene

- Avoid unmaintained libs for core features.
- Pin versions intentionally.
- Run audits in CI.

## PR checklist (minimum)

- [ ] lint/typecheck/tests pass
- [ ] security reviewed (no shortcuts)
- [ ] performance considered (no huge payloads)
- [ ] scaling impact noted if relevant
- [ ] docs updated if behavior changes

(For full detail, see CONTRIBUTING.md / docs.)
