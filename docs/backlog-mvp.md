# Backlog MVP (epiki → user stories → AC)

## E0 Fundament (P0)

### US0.1 Monorepo + standardy

AC:

- repo z apps/api, apps/frontend, apps/worker (worker może być pusty na start)
- pnpm workspaces, lint/format, .editorconfig, .env.example

### US0.2 Docker Compose (dev)

AC:

- Postgres, Redis, MinIO, Keycloak
- healthchecks, wolumeny, instrukcja uruchomienia

### US0.3 Prisma migracje + seed

AC:

- schema.prisma w API
- migrate dev działa
- seed: role + RequirementTemplate(Przewodnik v1)

### US0.4 Reverse proxy (dev-proxy + prod-ready baseline)

AC:

- opcjonalny profil compose: `dev-proxy` (obok zwykłego `dev`)
- routing domen:
  - `hss.local` → Next.js
  - `api.hss.local` → NestJS
  - `auth.hss.local` → Keycloak
- w profilu `dev-proxy` publicznie wystawiony jest tylko reverse proxy (80; TLS w staging/prod)
- Keycloak redirect/callback działają za proxy (prawidłowe host/proto)
- forwarding headers skonfigurowane (Host, X-Forwarded-Proto/For)
- podstawowe limity proxy pod upload (np. max body size) + timeouts
- instrukcja: wpisy do `/etc/hosts` dla domen dev

## E1 AuthN/AuthZ (P0)

### US1.1 Logowanie OIDC (Keycloak + Auth.js/NextAuth)

AC:

- FE loguje przez Keycloak (OIDC) z użyciem Auth.js (NextAuth)
- sesja webowa przez httpOnly cookies (bez tokenów w localStorage)
- BE weryfikuje JWT (issuer/audience/jwks/signature/exp)
- działa `/me` (min: id/email/displayName/roles)

### US1.2 RBAC w API

AC: guardy + testy dla ról

## E2 Trials (P0)

### US2.1 Utworzenie DRAFT

AC: tworzy Trial + instancje TrialRequirement z template

### US2.2 TrialForm (payload) zapis

AC: zapis payload; synchronizacja Trial.unitHufiec/unitDruzyna

### US2.3 Edycja wymagań

AC: planText + verificationText + declarationAtOpen + progressStatus

### US2.4 Evidence/Witness

AC: dowód (StoredFile + Evidence), witness (user lub wpis ręczny)

### US2.5 SUBMITTED + panel kapituły

AC: submit; lista filtr: status + hufiec/drużyna; szczegóły + historia

### US2.6 Komentarze + zmiany statusu kapituły

AC: komentarze; status transitions; TrialStatusHistory + AuditLog

## E3 Meetings (P0)

### US3.1 CRUD terminów

AC: sekretarz/chair dodaje i edytuje meeting

### US3.2 Zapisy z limitem miejsc

AC: brak overbookingu (transakcja/lock); CANCELLED

## E4 Audit (P0)

### US4.1 AuditLog

AC: wpisy dla kluczowych zdarzeń: create/update trial, submit, status change, file upload/download, meeting CRUD, registration
