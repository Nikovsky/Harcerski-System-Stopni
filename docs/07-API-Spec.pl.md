# API Spec — HSS (REST, MVP)

## 1) Konwencje

### Base URL

- Za Nginx: `/server/` → API (NestJS)
- Przykład: `GET /server/trials`

### Format dat

- `ISO 8601` dla timestampów (UTC): `2026-02-01T12:34:56Z`

### Autoryzacja (Keycloak OIDC)

- Wszystkie endpointy (poza `health`) wymagają tokena:
  - `Authorization: Bearer <access_token>`
- Role (client roles w Keycloak dla `hss-api`):
  - `SCOUT`, `COMMISSION_MEMBER`, `COMMISSION_SECRETARY`, `COMMISSION_CHAIR`, `ADMIN`

### Correlation / requestId

- Klient może przekazać `X-Request-Id`.
- API propaguje `requestId` w logach i (opcjonalnie) w odpowiedziach.

---

## 2) Standard odpowiedzi błędów

### Error envelope

```json
{
  "error": {
    "code": "BAD_REQUEST|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|INTERNAL",
    "message": "string",
    "details": {}
  }
}
```

### Typowe kody

- `400 BAD_REQUEST` — walidacja/format
- `401 UNAUTHORIZED` — brak/niepoprawny token
- `403 FORBIDDEN` — brak roli/owner-check nie przeszedł
- `404 NOT_FOUND` — zasób nie istnieje lub ukryty
- `409 CONFLICT` — konflikt domenowy (np. overbooking, niedozwolony status)
- `500 INTERNAL` — błąd serwera

---

## 3) Health

### GET `/server/health`

**Auth:** brak
**200**

```json
{ "status": "ok" }
```

---

## 4) Users (shadow profile)

### GET `/server/me`

Zwraca “me” na podstawie tokena (sub, email, role).
**Auth:** dowolna zalogowana rola
**200**

```json
{
  "userId": "kc-sub",
  "email": "user@example.com",
  "fullName": "Jan Kowalski",
  "roles": ["SCOUT"]
}
```

**Wymagania twarde**

- `userId` = `sub` z Keycloak.
- `roles` pochodzi z tokena (nie z DB).

---

## 5) Trials (próby)

### Model: Trial (response)

```json
{
  "id": "uuid",
  "ownerUserId": "kc-sub",
  "status": "DRAFT",
  "templateVersion": "paper-v1",
  "candidateProfile": {},
  "selfAssessment": {},
  "supervisorOpinion": {},
  "createdAt": "2026-02-01T12:00:00Z",
  "updatedAt": "2026-02-01T12:10:00Z"
}
```

### GET `/server/trials`

**Auth:**

- `SCOUT`: tylko własne
- `COMMISSION_*`: wszystkie
- `ADMIN`: wszystkie
  **Query:**
- `status` (optional)
- `q` (optional: nazwisko/email — opcjonalne w MVP)

**200**

```json
{
  "items": [
    /* Trial[] */
  ]
}
```

**AC**

- Harcerz widzi tylko swoje próby.
- Komisja widzi wszystkie.

---

### POST `/server/trials`

Tworzy próbę w statusie `DRAFT`.
**Auth:** `SCOUT`
**Body (minimal)**

```json
{ "templateVersion": "paper-v1" }
```

**201**

```json
{ "id": "uuid", "status": "DRAFT" }
```

**409 (CONFLICT)**

- jeśli istnieje aktywna próba (DRAFT/SUBMITTED/NEEDS_CHANGES/ACCEPTED)

---

### GET `/server/trials/{trialId}`

**Auth:**

- owner (`SCOUT`) lub `COMMISSION_*` lub `ADMIN`
  **200** Trial

**403**

- jeśli brak dostępu (IDOR)

---

### PATCH `/server/trials/{trialId}`

Aktualizacja danych formularza próby.
**Auth:** owner `SCOUT`
**Wymóg statusu:** `DRAFT|NEEDS_CHANGES`
**Body (partial)**

```json
{
  "candidateProfile": {},
  "selfAssessment": {},
  "supervisorOpinion": {}
}
```

**200** Trial

**409**

- jeśli status nie pozwala na edycję

---

### POST `/server/trials/{trialId}/submit`

**Auth:** owner `SCOUT`
**Wymóg statusu:** `DRAFT|NEEDS_CHANGES`
**200**

```json
{ "id": "uuid", "status": "SUBMITTED" }
```

**409**

- jeśli status nie pozwala na submit

**Audit**

- `TRIAL_SUBMITTED`

---

### POST `/server/trials/{trialId}/status`

Zmiana statusu próby.
**Auth:** `COMMISSION_CHAIR`
**Body**

```json
{
  "to": "NEEDS_CHANGES|ACCEPTED|REJECTED|ARCHIVED",
  "reason": "string|null"
}
```

**200**

```json
{ "id": "uuid", "from": "SUBMITTED", "to": "ACCEPTED" }
```

**409**

- niedozwolone przejście statusu

**Audit**

- `TRIAL_STATUS_CHANGED` (+ metadata from/to/reason)

---

## 6) Tasks (zadania w próbie)

### Model: Task

```json
{
  "id": "uuid",
  "trialId": "uuid",
  "category": "string",
  "title": "string",
  "description": "string",
  "evidenceType": "FILE|TEXT|CONFIRMER",
  "confirmerName": "string|null",
  "status": "OPEN|DONE",
  "createdAt": "2026-02-01T12:00:00Z",
  "updatedAt": "2026-02-01T12:10:00Z"
}
```

### GET `/server/trials/{trialId}/tasks`

**Auth:** owner lub komisja lub admin
**200**

```json
{
  "items": [
    /* Task[] */
  ]
}
```

### POST `/server/trials/{trialId}/tasks`

**Auth:** owner `SCOUT`
**Wymóg statusu:** `DRAFT|NEEDS_CHANGES`
**Body**

```json
{
  "category": "string",
  "title": "string",
  "description": "string",
  "evidenceType": "FILE|TEXT|CONFIRMER",
  "confirmerName": "string|null"
}
```

**201** Task

### PATCH `/server/tasks/{taskId}`

**Auth:** owner `SCOUT`
**Wymóg statusu:** `DRAFT|NEEDS_CHANGES`
**200** Task

### DELETE `/server/tasks/{taskId}`

**Auth:** owner `SCOUT`
**Wymóg statusu:** `DRAFT|NEEDS_CHANGES`
**204**

---

## 7) Comments (komentarze komisji)

### Model: Comment

```json
{
  "id": "uuid",
  "trialId": "uuid",
  "authorUserId": "kc-sub",
  "authorRole": "COMMISSION_MEMBER",
  "body": "string",
  "createdAt": "2026-02-01T12:00:00Z"
}
```

### GET `/server/trials/{trialId}/comments`

**Auth:** owner lub komisja lub admin
**200**

```json
{
  "items": [
    /* Comment[] */
  ]
}
```

### POST `/server/trials/{trialId}/comments`

**Auth:** `COMMISSION_MEMBER|COMMISSION_SECRETARY|COMMISSION_CHAIR`
**Body**

```json
{ "body": "string" }
```

**201** Comment

**Audit**

- `COMMENT_CREATED`

---

## 8) Attachments (MinIO presigned)

### Model: Attachment

```json
{
  "id": "uuid",
  "trialId": "uuid",
  "taskId": "uuid|null",
  "fileName": "string",
  "mimeType": "string",
  "sizeBytes": 123,
  "status": "INIT|UPLOADED",
  "createdAt": "2026-02-01T12:00:00Z"
}
```

### POST `/server/attachments/init`

**Auth:** owner `SCOUT` (oraz komisja/admin jeśli dopuszczone; MVP: owner)
**Wymóg statusu:** `DRAFT|NEEDS_CHANGES` (domyślnie)
**Body**

```json
{
  "trialId": "uuid",
  "taskId": "uuid|null",
  "fileName": "string",
  "mimeType": "image/png",
  "sizeBytes": 12345
}
```

**200**

```json
{
  "attachment": { "id": "uuid", "status": "INIT" },
  "upload": {
    "url": "https://presigned-put-url",
    "expiresInSeconds": 300
  }
}
```

**409**

- limit per type / per trial exceeded

**Audit**

- `ATTACHMENT_UPLOAD_INIT`

---

### POST `/server/attachments/{attachmentId}/complete`

**Auth:** owner `SCOUT`
**200**

```json
{ "id": "uuid", "status": "UPLOADED" }
```

**Audit**

- `ATTACHMENT_UPLOAD_COMPLETE`

---

### GET `/server/attachments/{attachmentId}/download`

**Auth:** owner lub komisja lub admin
**200**

```json
{
  "url": "https://presigned-get-url",
  "expiresInSeconds": 300
}
```

**403**

- brak uprawnień

---

## 9) Meetings / Slots / Bookings

### Model: Meeting

```json
{
  "id": "uuid",
  "date": "2026-02-20",
  "title": "Posiedzenie komisji",
  "notes": "string|null"
}
```

### Model: Slot

```json
{
  "id": "uuid",
  "meetingId": "uuid",
  "startTime": "2026-02-20T16:00:00Z",
  "endTime": "2026-02-20T16:15:00Z",
  "isBooked": true
}
```

### GET `/server/meetings`

**Auth:** dowolny zalogowany (SCOUT/COMMISSION/ADMIN)
**200**

```json
{
  "items": [
    /* Meeting[] */
  ]
}
```

### POST `/server/meetings`

**Auth:** `COMMISSION_SECRETARY|COMMISSION_CHAIR`
**Body**

```json
{ "date": "2026-02-20", "title": "string", "notes": "string|null" }
```

**201** Meeting
**Audit:** `MEETING_CREATED`

---

### GET `/server/meetings/{meetingId}/slots`

**Auth:** dowolny zalogowany
**200**

```json
{
  "items": [
    /* Slot[] */
  ]
}
```

### POST `/server/meetings/{meetingId}/slots`

Tworzy sloty.
**Auth:** `COMMISSION_SECRETARY|COMMISSION_CHAIR`
**Body**

```json
{
  "slots": [
    { "startTime": "2026-02-20T16:00:00Z", "endTime": "2026-02-20T16:15:00Z" }
  ]
}
```

**201**

```json
{ "created": 10 }
```

**409**

- jeśli sloty się nakładają

**Audit:** `SLOTS_CREATED`

---

### POST `/server/slots/{slotId}/book`

Rezerwacja slotu.
**Auth:** `SCOUT`
**Body**

```json
{ "trialId": "uuid" }
```

**200**

```json
{ "bookingId": "uuid" }
```

**409**

- próba nie ma statusu `ACCEPTED`
- slot zajęty

**Audit:** `SLOT_BOOKED`

---

### POST `/server/slots/{slotId}/cancel`

Anulowanie slotu (MVP tylko komisja).
**Auth:** `COMMISSION_SECRETARY|COMMISSION_CHAIR`
**Body**

```json
{ "reason": "string|null" }
```

**204**

**Audit:** `SLOT_CANCELED`

---

### GET `/server/meetings/{meetingId}/bookings`

Lista zapisanych.
**Auth:** `COMMISSION_MEMBER|COMMISSION_SECRETARY|COMMISSION_CHAIR|ADMIN`
**200**

```json
{
  "items": [
    {
      "slotId": "uuid",
      "trialId": "uuid",
      "scoutUserId": "kc-sub",
      "scoutName": "string|null",
      "createdAt": "2026-02-01T12:00:00Z"
    }
  ]
}
```

---

## 10) Admin (panel w aplikacji) — Keycloak Admin API via Backend

### GET `/server/admin/scouts?status=PENDING_APPROVAL`

**Auth:** `ADMIN`
**200**

```json
{
  "items": [
    {
      "userId": "kc-sub",
      "email": "user@example.com",
      "fullName": "Jan Kowalski",
      "enabled": false,
      "createdAt": "2026-02-01T12:00:00Z"
    }
  ]
}
```

### POST `/server/admin/scouts/{userId}/approve`

**Auth:** `ADMIN`
**204**
**Audit:** `ADMIN_APPROVED_USER`

### POST `/server/admin/scouts/{userId}/reject`

**Auth:** `ADMIN`
**Body**

```json
{ "reason": "string|null" }
```

**204**
**Audit:** `ADMIN_REJECTED_USER`

### POST `/server/admin/commission/{userId}/role`

Nadaje lub zmienia rolę komisji (client role).
**Auth:** `ADMIN`
**Body**

```json
{ "role": "COMMISSION_MEMBER|COMMISSION_SECRETARY|COMMISSION_CHAIR" }
```

**204**
**Audit:** `ADMIN_ASSIGNED_ROLE`

### POST `/server/admin/commission/{userId}/role/clear`

Zdejmuje role komisji.
**Auth:** `ADMIN`
**204**
**Audit:** `ADMIN_ASSIGNED_ROLE` (metadata: cleared)

---
