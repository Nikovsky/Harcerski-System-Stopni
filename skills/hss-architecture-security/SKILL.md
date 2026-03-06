---
name: hss-architecture-security
description: HSS architecture and security guardrail skill for planning and reviewing cross-cutting changes across Next.js, NestJS, Prisma/PostgreSQL, Keycloak, MinIO, and nginx. Use when tasks span multiple services, touch security-critical flows, affect scaling safety, or require explicit threat/control verification.
---

# HSS Architecture and Security

Use this skill to keep decisions aligned with `AGENTS.md` and core security controls.

## Workflow

1. Read current constraints first:
   - `AGENTS.md`
   - `docs/06-Architecture.pl.md`
   - `docs/08-NonFunctional-Requirements.pl.md`
   - `docs/auth-security-fixes.md`
2. Map the requested change to layers:
   - Web (`apps/web`)
   - API (`apps/api`)
   - Contracts (`packages/schemas`)
   - DB (`packages/database`)
   - Infra (`docker`, nginx, Keycloak, MinIO)
3. Identify security and scaling impact:
   - auth/RBAC boundary
   - input validation boundary
   - token/session handling
   - error/log exposure
   - horizontal safety vs `[SINGLE-INSTANCE]`
4. Define controls before coding:
   - server-side enforcement points
   - required schema/env checks
   - audit and observability requirements
5. Implement minimally and verify with explicit commands.
6. Report with evidence: changed files, checks run, residual risks.

## Mandatory Checks

- Enforce RBAC at API boundary, never only in UI.
- Validate untrusted input at every boundary.
- Keep secrets out of logs and responses.
- Keep API/Web stateless by default.
- Keep contracts and env schemas synchronized.
- Return consistent safe error envelopes.
- Mark non-horizontal-safe logic with `[SINGLE-INSTANCE]`.

## Output Contract

Always provide:

1. `Done` (implemented controls)
2. `Changed files` (what and why)
3. `Verification` (lint/typecheck/test/audit/build/manual)
4. `Risks` (what remains and impact)
5. `Decision needed` (only if blocked)
