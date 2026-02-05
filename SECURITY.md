<!-- @file: SECURITY.md -->

# SECURITY.md — Security Policy (HSS)

This document defines the security posture, reporting process, and non-negotiable rules
for HSS (Harcerski System Stopni).

## 1) Supported versions

HSS is under active development. Only the `main` branch (or the latest tagged release, if used)
is considered supported for security fixes.

## 2) Reporting a vulnerability

### Do NOT open a public GitHub Issue
Public issues can expose users to real risk (immediate disclosure). Please use a private channel.

### Preferred reporting channels (choose one)
1. **GitHub Security Advisories / Private Vulnerability Report** (recommended if enabled)
2. **Private contact email** (recommended for external reporters)
3. **Private/internal tracker** (only if access is restricted to trusted maintainers)

> If you accidentally created a public issue, remove sensitive details immediately
> and contact maintainers to migrate the report to a private channel.

### What to include
Please provide:
- A clear description of the issue and affected component(s)
- Steps to reproduce / proof of concept (safe and minimal)
- Impact assessment (what can be compromised)
- Any logs/screenshots with secrets removed
- Suggested remediation if you have one

### Our response process (best effort)
- We acknowledge receipt as soon as possible
- We confirm whether it is a valid issue and estimate severity
- We coordinate a fix and release plan
- We may request verification of the fix from the reporter

### Coordinated disclosure
We prefer coordinated disclosure:
- Please do not publish details before a fix is available
- We will agree on a disclosure timeline depending on severity

## 3) Security goals and threat model (high level)

### Primary goals
- Prevent unauthorized access to accounts and protected resources (RBAC enforced server-side)
- Prevent leakage of secrets, tokens, and PII (especially in logs)
- Maintain integrity of data stored in PostgreSQL and objects stored in MinIO (S3)
- Reduce attack surface via strict input validation, secure defaults, and minimal privileges

### Primary trust boundaries
- Internet/clients → nginx → API (NestJS)
- Web (Next.js SSR) → API
- API → Keycloak (OIDC)
- API → PostgreSQL
- API → MinIO (S3)

## 4) Mandatory security rules (non-negotiable)

### 4.1 Secrets and credentials
- Never commit secrets, tokens, passwords, private keys, or `.env` files.
- Use `.env.example` + documented required variables.
- Rotate credentials immediately if exposure is suspected.
- Avoid long-lived tokens where possible.

### 4.2 Authentication and authorization (Keycloak / RBAC)
- RBAC must be enforced **server-side** at the API boundary.
- Client-side checks are UX only.
- Never trust user-provided role claims without verification.
- Use least privilege: default role should not grant admin capabilities.

### 4.3 Sessions, cookies, CSRF
If cookies are used for auth:
- Cookies must be `HttpOnly`, `Secure`, and have an appropriate `SameSite` policy.
- CSRF protections must exist where cookies authenticate state-changing requests.
- Do not store auth tokens in `localStorage` or expose them to the client bundle.

### 4.4 Input validation and sanitization
- Validate all untrusted input at boundaries:
  - HTTP DTOs / route params / query params
  - Forms
  - Startup config (env)
- Use schema-driven validation (zod in `packages/schemas`, DTO validation in API).
- Apply allowlists for sorting/filtering fields (no arbitrary SQL/Prisma field access).
- Prevent injection risks (SQL/NoSQL injection, header injection, template injection).

### 4.5 File upload & S3 (MinIO)
- Enforce strict file size limits and content-type allowlists.
- Do not trust file extensions; validate actual content where possible.
- Store uploads as private by default.
- Consider a malware scanning seam (even if not implemented yet).

### 4.6 Error handling and information disclosure
- Never leak stack traces, internal errors, or configuration details to clients.
- Use consistent error envelopes with stable error codes.
- Avoid returning detailed auth failure reasons that help attackers.

### 4.7 Logging (PII / secrets redaction)
- Never log:
  - passwords, tokens, refresh tokens
  - authorization headers
  - session cookies
  - secrets or private keys
- Logs must be structured, level-based, and include a request/correlation id when available.
- Treat personal data as sensitive; log the minimum.

### 4.8 Dependency and supply-chain hygiene
- Lockfile changes must be reviewed.
- Avoid unmaintained libraries for security-critical functionality.
- Run audits in CI (pnpm audit or equivalent).
- Keep Docker images pinned and updated.

## 5) Infrastructure security baseline

### nginx / TLS
- TLS termination happens at nginx (HTTPS required).
- Security headers must be enabled (HSTS, nosniff, frame protection, referrer policy, etc.).
- Prefer modern TLS versions and disable weak ciphers.

### PostgreSQL
- Use least-privilege DB users (separate migration/admin if needed).
- Ensure backups and restore procedures exist (even if manual initially).
- Avoid exposing PostgreSQL to the public internet.

### Keycloak
- Keep Keycloak protected behind TLS.
- Harden admin access (strong credentials, minimal exposure).
- Verify realm/import procedures are deterministic and repeatable.

### MinIO
- Do not expose buckets publicly by default.
- Restrict console access to trusted networks where possible.

## 6) Horizontal scaling note

HSS aims to be stateless-by-default. Any security control implemented in-memory
(e.g., rate limiting) must be marked as:

`// [SINGLE-INSTANCE] reason: in-memory security control`

and documented with the future horizontal-safe replacement (e.g., Redis-backed rate limit).

## 7) Security testing expectations

Minimum baseline:
- Unit tests for auth helpers and boundary validators
- Integration tests for auth-protected API routes
- E2E tests for core auth flows and protected routes

Recommended (future):
- SAST/secret scanning in CI
- Container scanning for Docker images
- Dependency vulnerability scanning as a gate

## 8) Incident response (basic)

If a security incident is suspected:
1. Contain: revoke/rotate exposed credentials and tokens
2. Assess impact: identify affected data/users
3. Patch: apply fixes and deploy
4. Communicate: notify relevant stakeholders (internally first)
5. Postmortem: document root cause and prevention steps

## 9) Security contact (placeholder)

Add at least one private contact route here (email or secure form).
Example placeholders:
- security@hss.local (replace with real address)
- GitHub Security Advisories enabled on the repository

---

Thank you for helping keep HSS secure.
