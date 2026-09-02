# Better Auth BFF Migration Handoff

Date: 2026-09-02T02:02:06+02:00

## Accepted architecture

- Better Auth `1.7.2` runs in `apps/api` with the Prisma adapter and Redis secondary storage.
- `apps/web` is a BFF only: it proxies authentication and session operations to the API and has no Prisma, PostgreSQL, or `DATABASE_URL` dependency.
- Web still uses Redis directly only for distributed BFF route rate limits.
- Web-to-API authentication routes require the shared internal BFF secret. Never commit or document its value.
- Public browser URLs remain HTTPS: Web at `https://hss.local`, API at `https://api.hss.local`, and Keycloak at `https://auth.hss.local`.

## Identity and Prisma decisions

- Keycloak remains the identity source of truth.
- Domain `User` contains `keycloakUuid` as its identity key; domain relations use that UUID rather than duplicated identity attributes.
- Technical Better Auth models remain separate: `AuthUser`, `AuthAccount`, `AuthSession`, and `AuthVerification`.
- OAuth account identity uses `issuer + accountId`, where Keycloak `sub` is the account ID.
- Keycloak `email_verified=false` does not block login because authorization and domain identity do not depend on e-mail.
- `keycloakUuid`, `givenName`, and `familyName` from the provider profile are accepted only during the verified Keycloak callback. Database hooks reject client-driven changes outside that callback.
- The Better Auth Prisma adapter derives relation names from custom model names. Keep these Prisma relation fields exactly:
  - `AuthAccount.authuser`
  - `AuthSession.authuser`
  - `AuthUser.authaccounts`
  - `AuthUser.authsessions`
- Renaming those Prisma relation fields is client-only and does not require SQL or data migration.
- The data-preserving identity migration is `packages/database/prisma/migrations/20260901205559_keycloak_identity_better_auth/migration.sql`.

## Login and logout behavior

- The BFF sets the trusted Web `Origin` on internal Better Auth calls. This is required when OAuth state cookies cause Better Auth CSRF validation to run.
- Better Auth limits sign-in starts to three requests per ten seconds. Web preserves `429 Too Many Requests` instead of masking it as `503`.
- Never reuse an old OAuth callback URL: its `state` and authorization `code` are one-time values.
- Logout must be submitted as a top-level native form `POST`; do not replace it with `fetch`, because following the Keycloak end-session redirect through AJAX causes CORS failure.
- Logout CSRF validation accepts a matching non-null `Origin`, then a matching `Referer`, or same-origin document-navigation Fetch Metadata. An explicit foreign origin remains denied.
- Manual logout and idle-timeout logout use the same top-level navigation helper.

## Configuration and runtime

- Auth secrets, Keycloak client credentials, Better Auth URL, session policy, and Better Auth Redis settings belong to `apps/api/.env`.
- Web keeps only BFF-facing configuration, its internal BFF secret copy, cookie naming, rate limits, and Web Redis rate-limit configuration.
- Local `.env` files were aligned with their `.env.example` files without committing secret values.
- API repo-root detection must continue walking past `apps/api/package.json` to the workspace root so standard filtered pnpm commands load `apps/api/.env` correctly.
- After Prisma schema or generated-client changes, restart the API process:

```powershell
pnpm db:generate
pnpm db:build
pnpm dev
```

## Infrastructure state

- Container images were moved to current non-Alpine compatibility-oriented variants, including PostgreSQL Bookworm and Redis Trixie.
- Keycloak was updated to `26.7.3`; stale Quarkus build artifacts must not be reused across image versions.
- Redis ACL intentionally avoids broad administrative commands; the API Redis client has `enableReadyCheck: false` because the ioredis ready check requires `INFO`.

## Validation completed

- `pnpm validate:env` passed.
- Workspace typecheck passed after the migration; focused API and Web typechecks also passed after subsequent fixes.
- API tests passed: 6 suites, 49 tests.
- Focused lint for changed auth, API, and Web files passed.
- Prisma schema validation and client generation passed.
- Live Prisma relation queries for `AuthAccount.authuser` and `AuthSession.authuser` passed.
- API smoke checks passed: health returned `200`; internal/auth endpoints denied missing BFF secrets and accepted the configured secret.
- Login tests covered repeated state-cookie requests, correct Keycloak redirects, rate limiting, and trusted-origin handling.
- Logout checks returned `303` for a valid same-origin navigation and `403` for a foreign origin.

## Known follow-up

- Production dependency audit still reports transitive vulnerabilities. The last run found 25 total, including 13 high, primarily through Prisma/Better Auth/Next transitive paths such as `fast-uri`, `sharp`, `postcss`, `browserslist`, `mysql2`, and `nanoid`.
- Do not run an automatic audit fix. Upgrade and validate the affected dependency chains deliberately.
