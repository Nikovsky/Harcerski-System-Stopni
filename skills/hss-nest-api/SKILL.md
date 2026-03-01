---
name: hss-nest-api
description: NestJS API delivery skill for HSS. Use when implementing or reviewing controllers, services, DTO validation, error handling, RBAC enforcement, external adapters, and API-side security controls in `apps/api`.
---

# HSS Nest API

Apply this skill to keep API logic thin at boundaries and strong in enforcement.

## Implementation Pattern

1. Keep controllers thin:
   - map HTTP input/output only
   - delegate use-cases to services
2. Validate all boundary inputs:
   - params
   - query
   - body
3. Enforce authorization server-side:
   - JWT verification
   - RBAC guard
   - owner checks where applicable
4. Isolate external systems in adapters/modules (Keycloak, MinIO, etc.).
5. Return consistent safe error envelopes.

## Security Controls

- Never trust client role hints or IDs.
- Never expose raw internal errors/stack traces.
- Never log secrets, auth headers, tokens, or sensitive PII.
- Add rate limiting to auth/sensitive endpoints.
- Mark in-memory control paths with `[SINGLE-INSTANCE]`.

## Quality Checklist

- DTO validation present on every endpoint.
- Business logic lives in services/use-cases.
- Stable machine-readable error codes exist.
- Request correlation ID is propagated to logs and responses.
- Env/config is read only through centralized config service.
