```yaml
title: "CONTRIBUTING (Engineering Rules)"
language: "en"
document_type: "contributing-guide"
project:
  code: "HSS"
  name: "Harcerski System Stopni"
created_at: "2026-01-29"
last_updated: "2026-01-29"

repository:
  type: "monorepo"
  tool: "turborepo"
  package_manager: "pnpm"

requirements:
  node: ">=24.12.0"
  pnpm: ">=10.26.0"
  docker: "required for infra stack"

quality_gates:
  required_on_pr: ["lint", "typecheck", "test"]
  security: ["no-secrets", "rbac-server-side", "input-validation"]

frontend_rules:
  components_folders:
    ["apps/web/src/components/ui", "apps/web/src/components/layout"]
  ssr_critical: ["auth", "rbac", "protected-routes"]
  i18n: "next-intl (namespaced messages)"

code_rules:
  stateless_default: true
  file_header: "// @file: <repo-path>"
  types_required: true
  defensive_inputs: true

scalability_note:
  target: "horizontal"
  avoid_in_memory: ["sessions", "rate-limit", "job-queue", "locks"]
```

# Contributing to HSS (Engineering Rules)

HSS (Harcerski System Stopni) supports the work of ZHR instructor rank commissions and communication with scouts conducting instructor-rank trials. The system digitalizes documentation, enables asynchronous review before meetings, and improves meeting organization (slots), reducing the time per candidate while maintaining a complete digital archive.

These rules exist to keep the codebase:

- maintainable and predictable,
- secure by default (enterprise-level),
- ready for future horizontal scaling,
- consistent across `apps/*` and `packages/*`.

---

## 0) Purpose and scope

This document defines the minimum engineering and security standards for:

- code under `apps/*` and `packages/*`,
- infra and tooling where applicable,
- any change that affects authentication, authorization, data handling, or user-facing behavior.

---

## 1) Language and communication

- Think and write in **English** (code, comments, docs, commit messages).
- Prefer clear technical wording over slang.
- Keep PR descriptions action-oriented: **what changed**, **why**, **risk**, **how tested**.

---

## 2) Code style: self-describing first

- Write self-describing code:
  - meaningful names,
  - small functions,
  - single responsibility.
- Add comments only when:
  - the “why” is not obvious,
  - there is a non-trivial tradeoff,
  - there is a security implication.
- Comments must be in English and explain **intent**, not restate code.

---

## 3) File header requirement (mandatory)

Every code file must start with a single-line header:

```ts
// @file: apps/web/src/components/ui/button.tsx
```

Rules:

- Always use the repo path from root.
- Keep it as the first line (before imports).

---

## 4) Stateless-first architecture

Default rule: code should be **stateless**.

Stateless means:

- no global mutable state,
- no module-level caches that change at runtime,
- no singletons storing request/user data.

Allowed:

- pure helper functions,
- deterministic transformations,
- stateless services created per request.

If state is unavoidable (rare):

- justify it in a short comment,
- explain horizontal scaling impact,
- prefer external state (DB/Redis) over in-memory state.

---

## 5) Defensive programming (bad input ready)

- Assume inputs can be invalid unless:
  - they were validated earlier in the same request flow **and**
  - this is explicitly documented.

- Validate at boundaries:
  - HTTP request DTO validation (API),
  - form validation (Web),
  - config validation (startup).

- Fail safely:
  - return correct HTTP codes,
  - never leak internals,
  - log enough for troubleshooting (without secrets).

---

## 6) Types everywhere

- Prefer strict TypeScript:
  - avoid `any`,
  - avoid unsafe type assertions unless justified.

- Model domain types explicitly (e.g. ranks, trials, commission meetings/slots).
- Shared contracts belong in `packages/*`:
  - `@hss/types`, `@hss/schemas`, etc.

- Prefer schema-driven types:
  - zod schema → inferred types (single source of truth).

---

## 7) Helpers & reuse (reduce duplication)

- Use simple, readable helpers to reduce duplication when they:
  - remove repeated logic across files/features,
  - centralize validation/formatting/mapping,
  - reduce bug surface area.

- Avoid abstraction without value:
  - no “helper for everything”,
  - no over-engineered utility layers.

Recommended patterns:

- pure functions for formatting/parsing/mapping,
- small reusable UI primitives in `components/ui`,
- shared business rules in `packages/*`.

---

## 8) Performance rules (mandatory)

Performance is a feature, not an afterthought.

### 8.1 Avoid shipping unnecessary data to the client

- Do not send large translation dictionaries, large configs, or server-only constants to the browser.
- For i18n, prefer feature/route-group split messages over one massive JSON as the app grows.

### 8.2 Prefer Server Components / SSR for critical flows

Render on the server whenever it benefits:

- authentication state,
- RBAC gating,
- protected routes,
- security-sensitive decisions.

### 8.3 Keep client components lean

- Minimize client-side state.
- Avoid heavy libraries for simple tasks.
- Watch re-render cascades:
  - memoize only when needed,
  - keep props stable,
  - avoid unnecessary context re-renders.

---

## 9) Scalability awareness (vertical now, horizontal later)

HSS must remain ready for multi-instance deployment.

Avoid:

- in-memory sessions,
- per-instance caches without a shared store,
- local-only locks for correctness.

If a vertical shortcut is taken (discouraged):

- add a short comment:

> [!NOTE]
> Not horizontally scalable because …; acceptable for now because …; migration path: ….”

---

## 10) Frontend structure rules (apps/web)

### 10.1 Component location policy

Reusable components must live in:

- `apps/web/src/components/ui` (buttons, inputs, modals, dropdowns, tables, primitives)
- `apps/web/src/components/layout` (Navbar, Footer, AppShell, wrappers, layout composition)

Rules:

- Page files (`app/**/page.tsx`) should be thin:
  - orchestration + composition,
  - no heavy UI duplication.

- Reuse UI primitives instead of rewriting markup.

### 10.2 SSR for auth & protected routes

Resolve on the server when possible (SSR / Server Components / middleware):

- authentication state,
- user role,
- access permissions,
- protected navigation items.

Client-side checks may exist for UX, but must not be the only protection.

### 10.3 i18n

- Use `next-intl` with namespaced messages.
- Keep message payloads scoped; avoid shipping unused namespaces.

---

## 11) Clean Code + Security (no shortcuts)

Security is not optional.

### 11.1 Mandatory security rules

- Secrets must never be committed.
- Validate and sanitize all untrusted input.
- RBAC must be enforced at the API boundary (server-side).
- Rate limiting and brute-force protection where relevant (login, sensitive endpoints).
- Cookies must use `HttpOnly`, `Secure`, `SameSite` appropriately.
- Never log:
  - passwords,
  - tokens,
  - secrets,
  - sensitive personal data.

### 11.2 Security documentation requirement

When introducing or changing auth/session/crypto/storage rules:

- document the threat (1–2 lines),
- document the control (1–2 lines).

---

## 12) Error handling & logging policy

- Never leak stack traces or internal errors to clients.
- Use consistent error responses and error codes.
- Logs must be:
  - structured,
  - level-based (debug/info/warn/error),
  - free of secrets/PII,
  - include correlation/request id where available.

---

## 13) Config & environment rules

- Validate `.env` at startup (fail fast).
- Do not rely on unsafe defaults.
- Separate configuration for dev/test/prod.
- Keep secrets outside Git and outside client bundles.

---

## 14) Testing baseline

- Unit tests for domain logic and helpers.
- Integration tests for API + DB paths.
- E2E tests for critical flows:
  - auth,
  - protected routes,
  - core user journeys (trial submission/review, meeting slots, decision recording where applicable).

---

## 15) Dependency hygiene

- Avoid unmaintained libraries for core features.
- Pin versions intentionally.
- Run audits in CI.
- Prefer official docs and stable ecosystems.

---

## 16) PR / Review checklist (minimum)

Every PR must satisfy:

- [ ] lint/typecheck/tests pass
- [ ] security reviewed (no shortcuts)
- [ ] performance considered (no huge payloads)
- [ ] scaling impact noted if relevant
- [ ] docs updated if behavior changes

---

## 17) Quick “definition of done” for HSS features

A change is considered done only if:

- RBAC is enforced server-side for any protected action,
- inputs are validated at boundaries (API + forms + config),
- no sensitive data is exposed in client payloads or logs,
- the feature remains horizontally scalable (no correctness-critical in-memory state),
- tests cover the critical path.
