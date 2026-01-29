# DECISIONS — HSS (MVP)

## 1) Decyzje produktowe (MVP)

### D-PRD-01: Single-tenant

- MVP obsługuje **jedną komisję** działającą lokalnie w skali województwa.

### D-PRD-02: Statusy próby (state machine)

- Statusy:
  - `DRAFT`
  - `SUBMITTED`
  - `NEEDS_CHANGES`
  - `ACCEPTED`
  - `REJECTED`
  - `ARCHIVED`
- Dozwolone przejścia:
  - `DRAFT` → `SUBMITTED`
  - `SUBMITTED` → `NEEDS_CHANGES|ACCEPTED|REJECTED`
  - `NEEDS_CHANGES` → `SUBMITTED`
  - `ACCEPTED` → `ARCHIVED`

### D-PRD-03: Jedna aktywna próba na harcerza

- Harcerz może posiadać tylko jedną aktywną próbę naraz.
- Aktywne statusy: `DRAFT|SUBMITTED|NEEDS_CHANGES|ACCEPTED`.
- Nowa próba dopiero po `REJECTED` lub `ARCHIVED`.

### D-PRD-04: Komunikacja w MVP

- W MVP: **status + komentarze**.

### D-PRD-05: Kalendarz posiedzeń i sloty

- Komisja tworzy posiedzenia i sloty.
- Harcerz może zarezerwować slot **tylko po `ACCEPTED`**.
- Harcerz nie anuluje slotu w MVP (anulowanie/przeniesienie tylko komisja).

### D-PRD-06: Panel sekretarza — tylko fundament w MVP

- W MVP powstaje panel komisji + fundament pod przyszłe funkcje sekretarza, ale bez pełnych raportów/protokołów.

### D-PRD-07: OCR poza MVP

- OCR zdjęć papierowych prób jest poza MVP (NEXT).

---

## 2) Decyzje bezpieczeństwa i dostępu (MVP)

### D-SEC-01: IAM przez Keycloak (OIDC)

- Keycloak jest jedynym mechanizmem auth.
- Web: authorization code + PKCE.
- API: weryfikuje tokeny (bearer-only).

### D-SEC-02: Role (Keycloak client roles dla `hss-api`)

- `SCOUT`
- `COMMISSION_MEMBER`
- `COMMISSION_SECRETARY`
- `COMMISSION_CHAIR`
- `ADMIN`
- `ROOT`

### D-SEC-03: Harcerze — self-registration + approval

- Harcerz rejestruje się email/hasło (dowolna domena).
- Po rejestracji konto jest nieaktywne (`enabled=false`) i wymaga akceptacji admina.

### D-SEC-04: Komisja — Google + domena `@zhr.pl`

- Komisja loguje się przez Google lub email/haslo skonfigurowane w Keycloak.

### D-SEC-05: Zmiana statusu próby tylko przez przewodniczącego

- Tylko `COMMISSION_CHAIR` może zmieniać status próby.

### D-SEC-06: RBAC + owner-checks w API (IDOR prevention)

- API egzekwuje uprawnienia i relacje ownera (nie frontend).
- Harcerz widzi wyłącznie swoje próby/załączniki.

### D-SEC-07: Załączniki przez MinIO (bucket prywatny)

- Upload i download tylko przez presigned URLs wydawane przez API po autoryzacji.
- Limity plików obowiązują (wg docs).

---

## 3) Decyzje techniczne (MVP)

### D-TECH-01: Stack

- Web: Next.js
- API: NestJS (modular monolith)
- DB: PostgreSQL + Prisma
- Storage: MinIO
- Reverse proxy: Nginx
- Deployment: docker-compose

### D-TECH-02: API style

- API jest **REST** (nie GraphQL).
- Endpointy wg `docs/07-API-Spec.md` (Bierz pod uwagę korzystanie z ngnix).

### D-TECH-03: Dane formularza (MVP)

- CandidateProfile/selfAssessment/supervisorOpinion mogą być przechowywane jako JSON (szybkość MVP).

### D-TECH-04: Observability w MVP

- Minimalnie: logi JSON + requestId + audyt domenowy w DB.

---

## 4) Założenia (do czasu potwierdzenia)

### A-01: Retencja danych

- “Bezterminowo”

### A-02: Upload po submit

- Domyślnie: upload załączników dozwolony tylko w `DRAFT|NEEDS_CHANGES`.

---

## 5) Stop conditions (wymagają decyzji człowieka)

Agent musi się zatrzymać, jeśli:

- pojawia się konieczność zmiany status machine,
- zmienia się model ról/uprawnień,
- trzeba zmienić kontrakt API,
- wchodzi retencja/usuwanie danych,
- wchodzi OCR/notyfikacje (poza MVP).
