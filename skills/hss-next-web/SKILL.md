---
name: hss-next-web
description: Next.js web implementation skill for HSS. Use when working on routing, SSR protection, UI component placement, i18n with next-intl, data-fetching boundaries, and frontend security/privacy in `apps/web`.
---

# HSS Next Web

Use this skill for predictable web architecture and secure-by-default frontend behavior.

## Workflow

1. Confirm route and feature scope.
2. Place code in the right layer:
   - reusable UI in `src/components/ui` or `src/components/layout`
   - feature logic in feature-local modules
3. Keep protected flows SSR-first (auth/RBAC-sensitive paths).
4. Validate form input client-side for UX, keep API as final authority.
5. Minimize data exposure in client bundles.

## Security Rules

- Do not store auth tokens in `localStorage`.
- Do not rely on client-side RBAC for protection.
- Do not leak sensitive fields to browser state unnecessarily.
- Keep session/auth handling compatible with secure cookies and CSRF controls.

## Quality Checklist

- `next-intl` messages remain namespaced.
- Components are reusable and not duplicated in route files.
- Client components are lean and intentional.
- API contracts follow `packages/schemas`.
