# Architecture — HSS (MVP)

## 1) Architektura wysokiego poziomu

### Styl

- **Modular Monolith** dla API (NestJS) — moduły domenowe w jednej aplikacji.
- Web (Next.js) jako UI oraz BFF dla harcerzy/komisji/admina.
- **Better Auth** w API jako orkiestrator logowania i sesji.
- **Keycloak** jako centralny IdP (OIDC), źródło tożsamości i ról.
- **Nginx** jako reverse proxy i routing wejścia.
- PostgreSQL jako DB.
- MinIO jako storage obiektów dla załączników.
- Dostarczenie przez docker-compose (self-hosted).

### Diagram komponentów

```mermaid
flowchart LR
  U[Użytkownik] -.->|"HTTP 80 -> HTTPS 443"| N[Nginx]
  U --> |HTTPS| N
  N -->|/| W[Web: Next.js]
  N -->|api.hss.local| A[API: NestJS]
  N -->|auth.hss.local| K[Keycloak: OIDC]
  W -->|BFF auth i sesja| A
  W -->|Bearer access token| A
  A --> DB[(PostgreSQL)]
  A --> R[(Redis)]
  A --> S[(MinIO: private bucket)]
  A -->|OAuth, JWKS, Admin API| K
```

### Routing (Nginx)

- `https://hss.local` → Web/BFF
- `https://api.hss.local` → API
- `https://auth.hss.local` → publiczne endpointy Keycloak
- `https://authconsole.hss.local` → konsola administracyjna Keycloak

---

## 2) Moduły backend (NestJS)

### Moduły domenowe (MVP)

- `auth` — Better Auth, sesje, OAuth z Keycloak i chronione endpointy wewnętrzne BFF
- `authz` — weryfikacja JWT Keycloak dla endpointów domenowych, RBAC, guards, owner-checks
- `users` — shadow profile (cache minimalny) + synchronizacja “na żądanie”
- `trials` — próby, statusy, reguły aktywności (jedna aktywna próba)
- `tasks` — zadania w ramach próby
- `comments` — komentarze komisji
- `attachments` — init/complete upload, download URL, limity, autoryzacja
- `meetings` — posiedzenia, sloty, rezerwacje, anulowanie przez komisję
- `audit` — zapis zdarzeń domenowych do DB
- `admin` — endpointy admina (approve/reject, role management) + Keycloak Admin API client
- `health` — `/server/health`

### Wymagania twarde

- Backend egzekwuje RBAC i owner-checks (frontend nie jest źródłem prawdy).
- Wszystkie operacje wrażliwe (statusy, admin, attachments, booking) są audytowane.

---

## 3) Tożsamość, sesja i autoryzacja

Szczegółowy kontrakt znajduje się w [0207-authentication-better-auth.pl.md](./0207-authentication-better-auth.pl.md).

### Podział odpowiedzialności

- Keycloak jest źródłem tożsamości, ról oraz tokenów OIDC.
- Better Auth `1.7.2` działa w `apps/api`, prowadzi flow OAuth i zarządza sesją aplikacyjną.
- Web jest BFF: wystawia przeglądarce trasy `/api/auth/*` i `/api/backend/*`, ale nie łączy się z PostgreSQL ani Prisma.
- Techniczne modele Better Auth i dane OAuth są obsługiwane przez Prisma/PostgreSQL; aktywna sesja i polityka czasu życia korzystają z Redis.
- Endpointy domenowe API nadal przyjmują token Keycloak w `Authorization: Bearer` i egzekwują RBAC oraz owner-checks.

### Przepływ

1. Przeglądarka rozpoczyna logowanie przez trasę Web BFF.
2. Web przekazuje żądanie do Better Auth w API, dodając współdzielony sekret BFF i zaufany `Origin` Web.
3. Better Auth realizuje Authorization Code Flow z PKCE przez Keycloak i ustanawia bezpieczne cookie sesyjne.
4. Dla chronionego wywołania domenowego Web pobiera sesję przez chroniony endpoint wewnętrzny, uzyskuje lub odświeża access token Keycloak i przekazuje go do API.
5. API waliduje issuer, podpis JWKS, audience oraz role tokenu, a następnie wykonuje kontrole RBAC i ownera.

Tokenów nie wolno udostępniać JavaScriptowi przeglądarki ani zapisywać w `localStorage`.

### Role (client roles w Keycloak dla `hss-api`)

- `SCOUT`
- `COMMISSION_MEMBER`
- `COMMISSION_SECRETARY`
- `COMMISSION_CHAIR`
- `ADMIN`
- `ROOT`

### Harcerze (MVP)

- Self-registration w Keycloak (dowolna domena email).
- **Approval flow (WYMAGANIE):** po rejestracji konto ma `enabled=false`.
- Admin akceptuje konto (enable) w panelu admina w aplikacji (UI) → API → Keycloak Admin API.

### Komisja (MVP)

- Self-registration w Keycloak (dowolna domena email).
- Role komisji są przypisywane i mogą być zmieniane przez `ADMIN`.

### Wymagania twarde

- Endpointy domenowe API akceptują wyłącznie tokeny wystawione przez Keycloak (JWKS).
- Wewnętrzne endpointy auth BFF wymagają poprawnego `HSS_BFF_INTERNAL_SECRET`.
- Dostęp do danych prób tylko dla ownera + komisji + admina + root.
- Zmiana statusu tylko `COMMISSION_SECRETARY|COMMISSION_CHAIR`.

---

## 4) Model autoryzacji (RBAC + owner)

### RBAC

- `SCOUT`:
  - CRUD na własnej próbie w `DRAFT|NEEDS_CHANGES`
  - submit próby
  - podgląd komentarzy i statusu
  - rezerwacja slotu tylko po `ACCEPTED`

- `COMMISSION_MEMBER`:
  - list/details prób
  - komentarze

- `COMMISSION_SECRETARY`:
  - wszystko co member +
  - posiedzenia/sloty + anulowanie/przeniesienie rezerwacji
  - zmiana statusów prób

- `COMMISSION_CHAIR`:
  - wszystko co secretary
  - w obecnym MVP bez dodatkowych uprawnień systemowych w workflow prób

- `ADMIN`:
  - admin endpoints (approval, role management)
  - read-only audit
  - techniczny nadzór

- `ROOT`:
  - pełny dostęp do wszystkich komponentów

### Owner-checks (IDOR prevention)

- Harcerz może widzieć tylko swoje próby/załączniki.
- Komisja ma dostęp do prób/załączników w ramach roli.
- Załączniki pobierane wyłącznie przez endpoint autoryzowany w API.

---

## 5) Statusy próby i reguły

### Status machine

- `DRAFT` → `SUBMITTED`
- `SUBMITTED` → `NEEDS_CHANGES | ACCEPTED | REJECTED`
- `NEEDS_CHANGES` → `SUBMITTED`
- `ACCEPTED` → `ARCHIVED`

### Reguły edycji

- Edycja tylko w `DRAFT|NEEDS_CHANGES`.
- Po submit (`SUBMITTED`) próba read-only.
- Jedna aktywna próba per harcerz:
  - aktywne: `DRAFT|SUBMITTED|NEEDS_CHANGES|ACCEPTED`
  - nowa próba dopiero po `REJECTED|ARCHIVED`.

---

## 6) Załączniki (MinIO, presigned URLs)

### Workflow upload

1. `attachments/init` — walidacja MIME/rozmiaru + utworzenie rekordu
2. API generuje presigned PUT (TTL)
3. Web uploaduje plik bezpośrednio do MinIO
4. `attachments/complete` — potwierdzenie uploadu
5. Download: autoryzowany endpoint generuje presigned GET (TTL)

### Wymagania twarde

- Bucket prywatny (brak publicznych URL).
- Limity uploadu egzekwowane w API (startowo: 5/10/50 MB + 100MB/próba).

---

## 7) Posiedzenia i sloty

### Encje

- `Meeting` (data, opis)
- `MeetingSlot` (start/end)
- `SlotBooking` (slot ↔ próba ↔ harcerz)
- `MeetingDay` (cały dzień posiedzenia)

### Reguły (MVP)

- Rezerwacja slotu/dnia tylko jeśli próba ma status `ACCEPTED`.
- Jeden slot może być zarezerwowany tylko raz (unikalność).
- Anulowanie/przeniesienie:
  - **MVP:** tylko komisja (`COMMISSION_SECRETARY|COMMISSION_CHAIR`), nie harcerz.

- Wszystko audytowane.

---

## 8) Admin panel w aplikacji (MVP)

### Zakres

- Pending accounts:
  - lista kont oczekujących (enabled=false)
  - approve (enable=true)
  - reject (pozostaje disabled + reason)

- Commission roles:
  - assign/change/clear role komisji (client roles w Keycloak)

### Integracja techniczna

- Web → API (admin endpoints) → Keycloak Admin REST API
- Autoryzacja admin endpoints:
  - wymagane role `ADMIN` w tokenie

- Operacje admina tworzą wpisy w `AuditEvent`.

---

## 9) Observability (MVP)

- Logi JSON do stdout (api/web) + `requestId` z Nginx.
- Audit trail w DB dla działań krytycznych (statusy, booking, attachments, admin).

---

## 10) Przepływy krytyczne (sequence)

### 10A) Submit próby

```mermaid
sequenceDiagram
  participant S as Scout (Web)
  participant API as API (NestJS)
  participant DB as Postgres
  S->>API: POST /server/trials/{id}/submit (Bearer token)
  API->>API: RBAC + owner-check + status gate
  API->>DB: update status -> SUBMITTED
  API->>DB: insert Audit(TRIAL_SUBMITTED)
  API-->>S: 200
```

### 10B) Zmiana statusu (sekretarz/przewodniczący)

```mermaid
sequenceDiagram
  participant C as Sekretarz/Przewodniczący (Web)
  participant API as API (NestJS)
  participant DB as Postgres
  C->>API: POST server/trials/{id}/status {to}
  API->>API: RBAC (sekretarz/przewodniczący) + transition validation
  API->>DB: update status
  API->>DB: insert Audit(TRIAL_STATUS_CHANGED)
  API-->>C: 200
```

### 10C) Booking slotu (ACCEPTED-only)

```mermaid
sequenceDiagram
  participant S as Scout (Web)
  participant API as API (NestJS)
  participant DB as Postgres
  S->>API: POST server/slots/{slotId}/book
  API->>DB: validate trial.status == ACCEPTED
  API->>DB: insert booking (unique slot)
  API->>DB: insert Audit(SLOT_BOOKED)
  API-->>S: 200/409
```

---

## Wymagania twarde

- Keycloak jako źródło tożsamości i tokenów; Better Auth w API jako warstwa OAuth i sesji.
- RBAC + owner-checks w API.
- Zmiana statusu tylko `COMMISSION_SECRETARY|COMMISSION_CHAIR`.
- Approval kont harcerzy przez `ADMIN`.
- Presigned upload/download + prywatny bucket.
