---
name: hss-docker-infra
description: Docker infrastructure operations skill for HSS local stack. Use when starting, stopping, validating, or troubleshooting PostgreSQL, Keycloak, nginx, and MinIO services, or when checking production-like local readiness.
---

# HSS Docker Infra

Use this skill for reliable local infrastructure lifecycle and diagnostics.

## Workflow

1. Start from scripted lifecycle commands, not ad-hoc container edits.
2. Bring stack up and verify readiness service-by-service.
3. Check cross-service connectivity for API and Web dependencies.
4. Diagnose failures with targeted logs and health checks.
5. Keep resets intentional and avoid destructive operations by default.

## Preferred Commands

- `pnpm stack:up`
- `pnpm stack:status`
- `pnpm stack:stop`
- `pnpm stack:start`
- `pnpm stack:down`

## Operational Rules

- Keep config in env files and documented examples.
- Do not hardcode secrets in compose or source files.
- Verify TLS-local routing behavior via nginx entrypoints.
- Confirm dependent services before app startup to reduce noisy failures.
