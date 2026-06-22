# Observability — HSS (MVP)

## 1) Zasady ogólne

- Observability w MVP ma umożliwić:
  - diagnozę błędów produkcyjnych,
  - korelację zdarzeń użytkownika z logami,
  - kontrolę działań krytycznych (audyt).

---

## 2) Logging (logi techniczne)

### Format

- Logi w formacie **JSON** (stdout) dla:
  - API (NestJS)
  - Web (Next.js) — minimalnie logi serwerowe, jeśli SSR/route handlers
- Poziomy: `debug|info|warn|error`

### Wymagania twarde

- Każdy log w API zawiera:
  - `timestamp`
  - `level`
  - `message`
  - `requestId`
  - `path`, `method`, `statusCode`
  - `userId` (jeśli dostępny) — jako `sub` z tokena
  - `role(s)` (opcjonalnie)
  - `durationMs`

### Correlation / Request ID

- Nginx generuje `request_id` jeśli brak `X-Request-Id`.
- API czyta `X-Request-Id` i używa go w logach.
- Zalecenie: API zwraca `X-Request-Id` w odpowiedzi (dla debug).

### RODO / dane w logach

**Wymagania twarde**

- Nie logujemy treści prób, komentarzy i załączników (body) wprost.
- Logujemy jedynie identyfikatory:
  - `trialId`, `taskId`, `attachmentId`, `meetingId`, `slotId`.

### Przykład logu API (informacyjny)

```json
{
  "ts": "2026-02-01T12:34:56Z",
  "level": "info",
  "requestId": "abc-123",
  "msg": "TRIAL_SUBMITTED",
  "userId": "kc-sub",
  "role": "SCOUT",
  "trialId": "uuid",
  "durationMs": 124
}
```

---

## 3) Audit trail (audyt domenowy) — WYMAGANIE MVP

### Cel audytu

- Rejestrować “kto/co/kiedy” dla działań krytycznych z perspektywy procesu i RODO.
- Audyt jest źródłem prawdy dla:
  - zmian statusów prób,
  - działań admina,
  - istotnych operacji dot. załączników i slotów.

### Model `AuditEvent` (skrót)

- `ts`, `actorUserId`, `actorRole`
- `action`, `entityType`, `entityId`
- `metadata` (JSON, bez danych wrażliwych)
- `ip` (opcjonalnie), `requestId` (opcjonalnie)

### Akcje audytu (MVP minimum)

- Próby:
  - `TRIAL_CREATED`
  - `TRIAL_SUBMITTED`
  - `TRIAL_STATUS_CHANGED` (from/to/reason)

- Komentarze:
  - `COMMENT_CREATED` (trialId, commentId)

- Załączniki:
  - `ATTACHMENT_UPLOAD_INIT` (attachmentId)
  - `ATTACHMENT_UPLOAD_COMPLETE` (attachmentId)
  - (opcjonalnie) `ATTACHMENT_DOWNLOAD_ISSUED`

- Posiedzenia/sloty:
  - `MEETING_CREATED`
  - `SLOTS_CREATED`
  - `SLOT_BOOKED`
  - `SLOT_CANCELED`

- Admin:
  - `ADMIN_APPROVED_USER`
  - `ADMIN_REJECTED_USER`
  - `ADMIN_ASSIGNED_ROLE`

### Dostęp do audytu

**Wymagania twarde**

- Odczyt audytu w MVP: **tylko `ADMIN` / `ROOT`**.

---

## 4) Alerting (poza MVP)

- W MVP brak automatycznego alertingu.
- Minimum operacyjne: przegląd logów + audytu gdy wystąpi incydent.

---

## 7) Checklist implementacyjny (MVP)

### API

- Middleware/interceptor:
  - generuje/propaguje `requestId`
  - mierzy `durationMs`
  - loguje request summary (bez body)

- Serwis audytu:
  - wspólna funkcja `audit(action, entityType, entityId, metadata)`
  - wywoływana w miejscach krytycznych

### Nginx

- przekazywanie `X-Request-Id` do upstreamów
- limit `client_max_body_size` spójny z upload policy

### Web

- obsługa błędów z `requestId` (pokazanie w UI w razie błędu, np. “Podaj kod: …”)

---
