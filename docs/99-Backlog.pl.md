# Backlog — HSS (MVP) — priorytety i estymacje

## Skala estymacji

- **T-shirt:** XS / S / M / L / XL
- **Story Points:** 1 / 2 / 3 / 5 / 8 / 13

Konwencja:

- XS=1, S=2–3, M=5, L=8, XL=13

---

## EPIC A — Infra + bootstrap (P0)

| ID     | Zadanie                                                                   | Priorytet | Estymacja |
| ------ | ------------------------------------------------------------------------- | --------: | --------: |
| INF-01 | Monorepo structure: `apps/web`, `apps/api`, `infra/` + podstawowe skrypty |        P0 |     S / 3 |
| INF-02 | docker-compose: web/api/db/minio/keycloak/nginx                           |        P0 |     M / 5 |
| INF-03 | Nginx routing `/` `/api/` `/auth/` + requestId                            |        P0 |     S / 3 |
| INF-04 | Keycloak realm bootstrap (realm export/import template)                   |        P0 |     M / 5 |
| INF-05 | Prisma init + migracje + seed (minimal)                                   |        P0 |     M / 5 |
| INF-06 | Health endpoints + healthchecks                                           |        P0 |     S / 3 |

**AC (EPIC A)**

- Stack uruchamia się `docker compose up -d`.
- `/` działa (web), `/server/health` działa (api), `/auth` działa (keycloak).

---

## EPIC B — Auth (Keycloak OIDC) + RBAC + Admin (P0)

| ID          | Zadanie                                                             | Priorytet | Estymacja |
| ----------- | ------------------------------------------------------------------- | --------: | --------: |
| AUTH-KC-01  | Keycloak: realm `hss`, clients `hss-web`, `hss-api`, role `hss-api` |        P0 |     M / 5 |
| AUTH-KC-02  | Keycloak: self-registration + approval (enabled=false)              |        P0 |     M / 5 |
| AUTH-KC-03  | Keycloak: Google IdP + gate domeny `@zhr.pl`                        |        P0 |     M / 5 |
| AUTH-API-01 | API: JWT validation (issuer/JWKS) + guards                          |        P0 |     M / 5 |
| AUTH-API-02 | API: RBAC mapping + owner-checks (IDOR prevention)                  |        P0 |     M / 5 |
| ADM-API-01  | API: Keycloak Admin API client (service account)                    |        P0 |     M / 5 |
| ADM-API-02  | API: admin endpoints approve/reject + assign role + audit           |        P0 |     M / 5 |
| ADM-UI-01   | Web: panel admina `/admin/pending` (approve/reject)                 |        P0 |     M / 5 |
| ADM-UI-02   | Web: panel admina `/admin/commission` (roles)                       |        P0 |     M / 5 |

**AC (EPIC B)**

- Harcerz rejestruje się i widzi “konto oczekuje na akceptację”.
- Admin akceptuje konto w panelu → harcerz może wejść do app.
- RBAC działa: tylko chair zmienia statusy; brak IDOR.

---

## EPIC C — Trials (formularz + workflow) (P0)

| ID     | Zadanie                                                | Priorytet | Estymacja |
| ------ | ------------------------------------------------------ | --------: | --------: |
| TRY-01 | DB: Trial + status enum + history/audit hooks          |        P0 |     M / 5 |
| TRY-02 | API: create/get/list/update trial (owner + commission) |        P0 |     M / 5 |
| TRY-03 | API: submit trial + blokada edycji                     |        P0 |     S / 3 |
| TRY-04 | API: chair-only status change + state machine          |        P0 |     M / 5 |
| TRY-05 | Web: dashboard harcerza + empty state                  |        P0 |     S / 3 |
| TRY-06 | Web: formularz próby (sekcje) + save                   |        P0 |     L / 8 |
| TRY-07 | Web: read-only view po submit + status badge           |        P0 |     S / 3 |
| TRY-08 | Web: panel komisji — lista prób + szczegóły            |        P0 |     M / 5 |

**AC (EPIC C)**

- Harcerz tworzy próbę, uzupełnia, wysyła, widzi status.
- Komisja widzi próby i szczegóły.
- Chair zmienia statusy zgodnie z regułami.

---

## EPIC D — Tasks (zadania) + Comments (P0)

| ID      | Zadanie                                       | Priorytet | Estymacja |
| ------- | --------------------------------------------- | --------: | --------: |
| TASK-01 | DB: TrialTask                                 |        P0 |     S / 3 |
| TASK-02 | API: CRUD tasks (tylko w DRAFT/NEEDS_CHANGES) |        P0 |     M / 5 |
| TASK-03 | Web: UI zadań (lista, dodaj/edytuj/usuń)      |        P0 |     M / 5 |
| COM-01  | DB: TrialComment                              |        P0 |     S / 3 |
| COM-02  | API: create/list comments (commission write)  |        P0 |     S / 3 |
| COM-03  | Web: komentarze w widoku próby                |        P0 |     S / 3 |

**AC (EPIC D)**

- Komisja dodaje komentarze, harcerz je widzi.
- Zadania da się edytować tylko w dozwolonych statusach.

---

## EPIC E — Attachments (MinIO presigned) (P0)

| ID     | Zadanie                                    | Priorytet | Estymacja |
| ------ | ------------------------------------------ | --------: | --------: |
| ATT-01 | DB: Attachment + status INIT/UPLOADED      |        P0 |     S / 3 |
| ATT-02 | API: init upload (limits + presigned PUT)  |        P0 |     M / 5 |
| ATT-03 | API: complete upload                       |        P0 |     S / 3 |
| ATT-04 | API: download (presigned GET + RBAC/owner) |        P0 |     S / 3 |
| ATT-05 | Web: upload component (progress + errors)  |        P0 |     M / 5 |
| ATT-06 | Web: attachment list + download            |        P0 |     S / 3 |

**AC (EPIC E)**

- Owner uploaduje plik do MinIO przez presigned URL.
- Komisja pobiera plik, nieuprawniony nie może.

---

## EPIC F — Meetings / Slots / Bookings (P0)

| ID      | Zadanie                                  | Priorytet | Estymacja |
| ------- | ---------------------------------------- | --------: | --------: |
| MEET-01 | DB: Meeting, MeetingSlot, SlotBooking    |        P0 |     M / 5 |
| MEET-02 | API: create meeting (secretary/chair)    |        P0 |     S / 3 |
| MEET-03 | API: create slots + validate overlaps    |        P0 |     M / 5 |
| MEET-04 | API: list meetings/slots (all logged-in) |        P0 |     S / 3 |
| MEET-05 | API: book slot (ACCEPTED-only + unique)  |        P0 |     M / 5 |
| MEET-06 | API: cancel booking (commission-only)    |        P0 |     S / 3 |
| MEET-07 | Web: calendar/list meetings + slots view |        P0 |     M / 5 |
| MEET-08 | Web: booking UI (guarded by status)      |        P0 |     S / 3 |
| MEET-09 | Web: commission view — bookings list     |        P0 |     S / 3 |

**AC (EPIC F)**

- Komisja tworzy posiedzenie i sloty.
- Harcerz rezerwuje slot tylko po ACCEPTED.
- Brak overbookingu.

---

## EPIC G — Audit + minimal observability (P0)

| ID     | Zadanie                                             | Priorytet | Estymacja |
| ------ | --------------------------------------------------- | --------: | --------: |
| OBS-01 | requestId middleware + JSON logging                 |        P0 |     S / 3 |
| AUD-01 | DB: AuditEvent                                      |        P0 |     S / 3 |
| AUD-02 | API: audit service + hooks w krytycznych operacjach |        P0 |     M / 5 |
| AUD-03 | API: endpoint odczytu audytu (ADMIN only)           |        P0 |     S / 3 |
| AUD-04 | Web: prosty widok audytu (ADMIN only)               |        P1 |     S / 3 |

**AC (EPIC G)**

- Wszystkie krytyczne akcje tworzą audit event.
- Admin może odczytać audit.

---

## EPIC H — Stabilizacja / Hardening (P1)

| ID        | Zadanie                                   | Priorytet | Estymacja |
| --------- | ----------------------------------------- | --------: | --------: |
| SEC-01    | Nginx hardening: headers, size limits     |        P1 |     S / 3 |
| SEC-02    | Rate limiting (opcjonalnie)               |        P1 |     S / 3 |
| DEVOPS-01 | Backup scripts (pg_dump + minio backup)   |        P1 |     M / 5 |
| QA-01     | E2E: 3 minimalne scenariusze (Playwright) |        P1 |     M / 5 |

---

## EPIC NEXT (po MVP) — P2/P3

- OCR prób papierowych
- Powiadomienia (email/push)
- Rozbudowany panel sekretarza (protokoły, raporty, archiwum)
- Konfigurowalne permisje (permissions UI)
- Multi-komisja (multi-tenancy)
- Kompresja/opt. storage (wideo/zdjęcia)
- Odwołanie slotu przez harcerza

---
