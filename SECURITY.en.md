<!-- @file: SECURITY.en.md -->

# SECURITY.md - Security Policy (HSS)

**Language:** [Polski](./SECURITY.md) | English

This document defines HSS security posture, vulnerability reporting workflow,
and non-negotiable engineering security rules.

## 1) Supported versions

HSS is under active development. Only the `main` branch
(or the latest tagged release, if used) is considered supported for security fixes.

## 2) Reporting a vulnerability

### Do NOT open a public GitHub Issue
Public issues can expose users to real risk (immediate disclosure).
Use a private channel.

### Preferred reporting channels (choose one)
1. **GitHub Private Vulnerability Reporting (preferred)**
   - URL: `https://github.com/Nikovsky/Harcerski-System-Stopni/security/advisories/new`
2. **Security email**
   - `hss@zhr.pl`
   - Suggested subject: `[HSS][SECURITY] <short title>`
3. **Private/internal tracker**
   - Use only if access is limited to trusted maintainers.

> If you accidentally created a public issue, remove sensitive details immediately
> and contact maintainers to move the report to a private channel.

### What to include in a report
Please provide:
- clear description of the issue and affected component(s),
- reproduction steps / proof of concept (safe and minimal),
- impact assessment,
- logs/screenshots with secrets removed,
- version/branch/commit hash where the issue was observed,
- suggested remediation if available.

### Scope of reports
In scope (examples):
- authentication/authorization bypass,
- privilege escalation or RBAC/owner-check bypass,
- IDOR/data exposure (trials, attachments, user data),
- secrets/token leakage,
- CSRF affecting state-changing actions,
- injection vulnerabilities (SQL/NoSQL/header/template).

Out of scope (unless real security impact is demonstrated):
- purely informational findings without exploit path,
- self-XSS requiring unrealistic self-compromise,
- missing best-practice headers without an exploit scenario,
- social engineering/phishing unrelated to this repository code/infrastructure.

### Response timelines (best effort)
- Acknowledgement: within **72 hours**
- Initial triage and severity classification: within **7 days**
- Ongoing updates for valid reports: at least every **14 days**
- Target remediation windows (best effort):
  - **Critical**: up to 7 days
  - **High**: up to 30 days
  - **Medium/Low**: planned by risk and release cycle

### Coordinated disclosure
We prefer coordinated disclosure:
- do not publish details before a fix is available,
- disclosure timeline is agreed based on severity.

## 3) Security goals and threat model (high level)

### Primary goals
- Prevent unauthorized access to accounts and protected resources
  (RBAC enforced server-side).
- Prevent leakage of secrets, tokens, and PII (especially in logs).
- Maintain integrity of data stored in PostgreSQL and objects stored in MinIO (S3).
- Reduce attack surface via strict boundary validation, secure defaults,
  and least-privilege access.

### Primary trust boundaries
- Internet/clients -> nginx -> API (NestJS)
- Web (Next.js SSR) -> API
- API -> Keycloak (OIDC)
- API -> PostgreSQL
- API -> MinIO (S3)

## 4) Mandatory security rules (non-negotiable)

### 4.1 Secrets and credentials
- Never commit secrets, tokens, passwords, private keys, or `.env` files.
- Use `.env.example` and documented required variables.
- Rotate credentials immediately if exposure is suspected.
- Avoid long-lived tokens when possible.

### 4.2 Authentication and authorization (Keycloak / RBAC)
- RBAC must be enforced **server-side** at the API boundary.
- Client-side checks are UX-only.
- Never trust unverified role claims provided by users.
- Use least privilege: default roles must not grant admin capabilities.

### 4.3 Sessions, cookies, CSRF
If cookies are used for auth:
- Cookies must use `HttpOnly`, `Secure`, and appropriate `SameSite` policy.
- CSRF protections must exist for state-changing requests authenticated by cookies.
- Do not store auth tokens in `localStorage` or expose them in client bundles.

### 4.4 Input validation and sanitization
- Validate every untrusted input at boundaries:
  - HTTP DTO / route params / query params,
  - forms,
  - startup configuration (env).
- Prefer schema-driven validation (Zod in `packages/schemas`, DTO validation in API).
- Use allowlists for sortable/filterable fields (no arbitrary SQL/Prisma field access).
- Prevent injection risks (SQL/NoSQL/header/template injection).

### 4.5 File uploads and S3 (MinIO)
- Enforce strict file-size limits and content-type allowlists.
- Do not trust file extensions; validate real content where possible.
- Store uploads as private by default.
- Keep a seam for malware scanning (even if not implemented yet).

### 4.6 Error handling and information disclosure
- Never leak stack traces, internal errors, or config details to clients.
- Use consistent error envelopes with stable codes.
- Avoid detailed auth failure reasons that can help attackers.

### 4.7 Logging (PII/secrets redaction)
- Never log:
  - passwords, tokens, refresh tokens,
  - authorization headers,
  - session cookies,
  - secrets or private keys.
- Logs must be structured, leveled, and include request/correlation id where available.
- Treat personal data as sensitive; log only minimum necessary data.

### 4.8 Dependency and supply-chain hygiene
- Lockfile changes must be reviewed.
- Avoid unmaintained libraries for security-critical functions.
- Run security audits in CI (`pnpm audit` or equivalent).
- Keep Docker images pinned and up to date.

## 5) Infrastructure security baseline

### nginx / TLS
- TLS termination happens at nginx (HTTPS required).
- Security headers must be enabled (HSTS, nosniff, frame protection, referrer policy, etc.).
- Prefer modern TLS versions and disable weak ciphers.

### PostgreSQL
- Use least-privilege DB users (split migration/admin roles if needed).
- Ensure backup and restore procedures exist (even if initially manual).
- Avoid exposing PostgreSQL directly to the public internet.

### Keycloak
- Keep Keycloak protected behind TLS.
- Harden admin access (strong credentials, minimal exposure).
- Ensure realm/import procedures are deterministic and repeatable.

### MinIO
- Do not expose buckets publicly by default.
- Restrict console access to trusted networks where possible.

## 6) Horizontal scaling note

HSS is designed as stateless-by-default. Any in-memory security control
(for example rate limiting) must be marked as:

`// [SINGLE-INSTANCE] reason: in-memory security control`

and documented with a future horizontal-safe replacement
(for example Redis-backed rate limiting).

## 7) Security testing expectations

Minimum baseline:
- unit tests for auth helpers and boundary validators,
- integration tests for protected API routes,
- E2E tests for critical auth flows and protected routes.

Recommended (future):
- SAST/secret scanning in CI,
- container scanning for Docker images,
- dependency vulnerability scanning as a quality gate.

## 8) Incident response (basic)

If a security incident is suspected:
1. Contain: revoke/rotate exposed credentials and tokens.
2. Assess impact: identify affected users/data.
3. Patch: implement and deploy fixes.
4. Communicate: notify relevant stakeholders (internally first).
5. Postmortem: document root cause and preventive actions.

## 9) Security contacts

- GitHub Private Vulnerability Reporting:
  - `https://github.com/Nikovsky/Harcerski-System-Stopni/security/advisories/new`
- Security email:
  - `hss@zhr.pl`

Public GitHub Issues are not an accepted vulnerability disclosure channel.

---

Thank you for helping keep HSS secure.
