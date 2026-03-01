---
name: hss-auth-keycloak
description: HSS authentication and authorization skill for Keycloak-based OIDC/JWT flows. Use when implementing login/session behavior, token handling, role mapping, refresh lifecycle, API auth guards, or security hardening of identity boundaries.
---

# HSS Auth + Keycloak

Use this skill to implement identity flows without weakening API-side security.

## Workflow

1. Confirm auth boundary and affected clients/services.
2. Validate Keycloak token/claims expectations:
   - issuer/audience
   - signature/JWKS behavior
   - role claim mapping for `hss-api`
3. Enforce authz server-side in API guards and policies.
4. Align session policy:
   - short-lived access tokens
   - refresh behavior
   - idle/absolute timeout expectations
5. Verify failure paths (expired, revoked, malformed, insufficient role).

## Security Rules

- Treat frontend role checks as UX only.
- Never trust user-provided role data.
- Never log credentials, tokens, refresh tokens, or auth headers.
- Use secure cookie flags where cookies are used (`HttpOnly`, `Secure`, `SameSite`).
- Ensure CSRF controls are active for cookie-based auth flows.

## Role Baseline

Default HSS roles:

- `SCOUT`
- `COMMISSION_MEMBER`
- `COMMISSION_SECRETARY`
- `COMMISSION_CHAIR`
- `ADMIN`
- `ROOT`

Map and enforce these roles at API boundary, not only in UI.
