---
name: hss-nginx-tls
description: nginx reverse-proxy and TLS hardening skill for HSS. Use when configuring local or production-like ingress, security headers, host/proxy trust, correlation ID propagation, and routing for web/api/auth/minio endpoints.
---

# HSS nginx + TLS

Use this skill for safe reverse proxy behavior and consistent ingress controls.

## Workflow

1. Confirm all expected hostnames and upstream mappings.
2. Configure TLS termination for `*.hss.local`.
3. Apply strict security headers and safe defaults.
4. Configure and document trusted proxy assumptions.
5. Propagate/request correlation ID to upstream services.
6. Validate direct and proxied behavior with explicit checks.

## Security Controls

- Enforce HSTS and `X-Content-Type-Options: nosniff`.
- Ensure host trust options are enabled only in trusted proxy chains.
- Avoid forwarding insecure or unnecessary headers.
- Keep error responses sanitized.

## Verification Checklist

- All local endpoints resolve through nginx as expected.
- TLS handshake and cert chain are valid for local environment.
- Security headers are present on key routes.
- Correlation ID is passed to API and appears in API logs/responses.
