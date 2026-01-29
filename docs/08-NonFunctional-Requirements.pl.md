# Non-Functional Requirements — HSS (MVP)

## 1) Performance (wydajność)

### Kontekst obciążenia

- ~100 zarejestrowanych harcerzy + ~8 komisja.
- Peak równoczesny: ~10 użytkowników.
- Użycie okazjonalne (wokół terminów posiedzeń).

### Wymagania twarde

- Endpointy listujące muszą mieć indeksy na polach filtrowania (ownerUserId, status, meetingId).
- Operacje upload/download nie mogą proxy’ować plików przez API (tylko presigned URLs).

### Założenia

- Nie ma potrzeby cachowania w MVP poza ewentualnym in-memory dla JWKS/metadata.
- Formularz próby (JSON) ogranicza złożoność zapytań.

### Ryzyka

- Zbyt duże załączniki (storage + transfer) → konieczne egzekwowanie limitów.

---

## 2) Availability (dostępność)

### Cel (MVP)

- System działa stabilnie w modelu self-hosted w organizacji.
- Brak formalnego SLA, ale oczekiwana dostępność “produkcyjna” w dniach posiedzeń.

### Wymagania twarde

- Usługi uruchamiane przez docker-compose muszą mieć:
  - healthcheck,
  - odporność na restart (restart policy w deploy doc).
- Backup DB i MinIO musi być skonfigurowany (minimum dzienny).

### Założenia

- Organizacja zapewnia infrastrukturę (serwer, sieć, domena/HTTPS).
- Keycloak działa jako część stacku compose.

### Ryzyka

- Awaria storage (MinIO) = utrata dowodów zadań bez backupu.

---

## 3) Security (bezpieczeństwo)

### Threat model (minimum)

- Nieuprawniony dostęp do prób/załączników (IDOR).
- Nadużycie uprawnień komisji.
- Konto troll (samorejestracja).
- Wyciek danych osobowych w logach/backupach.

### Wymagania twarde

- **OIDC (Keycloak)** jako jedyny mechanizm auth.
- **RBAC + owner-checks w API** (frontend nie jest źródłem prawdy).
- Komisja: dostęp przez Google + domena `@zhr.pl` lub email/hasło.
- Harcerze: self-registration + **approval flow** (enabled=false do akceptacji).
- Presigned URLs do MinIO + bucket prywatny.
- Brak publicznych URL do załączników.
- Walidacja limitów plików (MIME/size) w API.
- Zmiana statusu próby tylko przez `COMMISSION_CHAIR`.
- Admin endpoints tylko dla `ADMIN`.
- Rate limiting na newralgicznych endpointach (MVP minimal): login/oidc callback (po stronie Keycloak) + API (opcjonalnie).

### Hardening (zalecane w MVP)

- TLS/HTTPS w prod (obowiązkowe).
- Nginx: `client_max_body_size` spójny z limitami upload.
- Sekrety w `.env` poza repo; rotowalne.

---

## 4) Privacy / RODO (ochrona danych)

### Zakres danych

- PII: imię i nazwisko, adres, email, stopień, drużyna, historia służby.
- Dane potencjalnie wrażliwe: samoocena (wady/zalety), opinia przełożonego, zadania indywidualne.
- Załączniki: pliki dowodowe (zdjęcia, dokumenty, mp4).

### Wymagania twarde

- Zasada minimalnego dostępu:
  - owner próby + komisja + root (w ramach funkcji).
- Brak logowania treści prób i PII do logów technicznych (maskowanie/wykluczenie).
- Audit zdarzeń domenowych (kto/co/kiedy) — bez treści wrażliwych.
- Backupy muszą być zabezpieczone (dostęp ograniczony) i zgodne z polityką organizacji.
  x

### Otwarte kwestie / ryzyka

- Formalna polityka retencji/archiwizacji prób i załączników vs RODO.
- Potrzeba anonimizacji/usuwania danych na żądanie (może być wymagane prawnie).

---

## 5) Maintainability (utrzymanie)

### Wymagania twarde

- Kod modułowy (NestJS modules), czytelne granice domen.
- Kontrakty API stabilne i udokumentowane (docs/07).
- Testy:
  - unit: state machine statusów, reguła “jedna aktywna próba”
  - integration: RBAC/IDOR, booking, attachments
- Migracje DB przez Prisma.

---

## 6) Observability (minimalna w MVP)

- Logi JSON (stdout) z `requestId`.
- Audit trail w DB dla operacji krytycznych.
- Brak pełnego Prometheus/Grafana w MVP (opcjonalne w Next).

---

## 7) Compatibility / UX

- UI: PL.
- Desktop-first, ale responsywny podgląd na telefonie (statusy, kalendarz).
- Przeglądarki: nowoczesne Chrome/Edge/Firefox (MVP).

---

## 8) Wymagania twarde — podsumowanie

- Keycloak OIDC + RBAC + owner-checks
- Presigned URLs + prywatny bucket MinIO
- Chair-only status change
- Approval kont harcerzy (enabled=false → admin enable)
- Audit działań krytycznych
- Backup DB + MinIO
- HTTPS w prod

---

## 9) Założenia — podsumowanie

- Peak ~10 użytkowników
- Brak OCR w MVP

---
