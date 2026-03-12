# Web App Test Harness

`apps/web` now owns the browser-level automation for HSS.

The goal of this setup is to give us one reusable harness for:

- realistic E2E smoke flows through the real Keycloak login,
- automated accessibility checks with `axe`,
- repeatable Lighthouse-based performance audits,
- future module expansion without rebuilding the test stack every time.

## Tooling

- Playwright for browser automation
- `@axe-core/playwright` for accessibility assertions
- Lighthouse via a Playwright-driven runner for protected routes

## Directory layout

```text
apps/web
├── e2e
│   ├── commission
│   │   ├── commission-a11y.e2e.spec.ts
│   │   └── commission-smoke.e2e.spec.ts
│   └── support
│       ├── auth.ts
│       └── test-env.ts
├── generated
│   ├── lighthouse-report
│   ├── playwright-report
│   └── test-results
├── playwright.config.ts
└── scripts
    └── run-lighthouse.mjs
```

`generated/` is intentionally used for browser artifacts so the repo stays clean.

## Required environment

Set the browser-test variables in `apps/web/.env.local` or in the shell before running tests:

- `HSS_E2E_BASE_URL`
- `HSS_E2E_LOCALE`
- `HSS_E2E_IGNORE_HTTPS_ERRORS`
- `HSS_E2E_COMMISSION_USERNAME`
- `HSS_E2E_COMMISSION_PASSWORD`
- `HSS_E2E_READONLY_USERNAME`
- `HSS_E2E_READONLY_PASSWORD`

Notes:

- `COMMISSION_*` is the privileged commission account used for smoke and perf.
- `READONLY_*` is the negative RBAC account used for access-boundary checks.
- The setup uses the real Keycloak login page. There is no test-only auth bypass.
- Playwright smoke and A11y tests log in inside the same browser context they
  verify. This is slower than shared storage state, but it is safer for the
  current opaque-session model.

## Install

From repo root:

```powershell
pnpm install
pnpm test:browser:install
```

## Run

From repo root:

```powershell
pnpm test:e2e
pnpm test:a11y
pnpm test:perf
```

Or directly from `apps/web`:

```powershell
pnpm test:e2e
pnpm test:a11y
pnpm test:perf
```

## Current scope

The first automated suite covers the commission workspace:

- privileged commission smoke,
- negative RBAC smoke for a user without commission role,
- `axe` checks for inbox and application detail,
- Lighthouse reports for inbox and first application detail.

## How to extend for future modules

1. Reuse `e2e/support/test-env.ts` for new personas and URLs.
2. Reuse `e2e/support/auth.ts` for session bootstrap and storage state.
3. Add module-local specs under `apps/web/e2e/<module>/`.
4. Keep selectors semantic first: roles, labels, stable href patterns.
5. Add perf routes in `scripts/run-lighthouse.mjs` only when the route is stable enough to audit.

## Operational guidance

- Browser tests assume the local HSS stack is already up.
- Perf results are most meaningful against a production-like build, but the harness also works for local smoke baselines.
- If a test depends on a persona that is not configured, it should fail clearly or skip intentionally with a useful message.
