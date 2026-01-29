# Zakres — MVP vs Next — HSS

## Cel dokumentu

Jednoznacznie rozdzielić, co wchodzi do MVP (czerwiec 2026), a co jest planowane jako rozwój po MVP.
Dokument jest źródłem prawdy dla backlogu, API i pracy agentów AI.

---

## MVP — zakres (MUST HAVE)

### 1) Tożsamość i dostęp (Keycloak + RBAC)

- Keycloak jako IdP (OIDC) dla całego systemu.
- Logowanie/rejestracja przez UI Keycloak (redirect).
- Harcerz i Komisja: self-registration (email/hasło).
- **Approval flow:** konto harcerza wymaga akceptacji admina (enabled=false → enable).
- Role jako client roles w Keycloak:
  - `SCOUT`, `COMMISSION_MEMBER`, `COMMISSION_SECRETARY`, `COMMISSION_CHAIR`, `ADMIN`, `ROOT`.
- RBAC + owner-checks egzekwowane w API.

**Kryteria akceptacji**

- Konto harcerza po rejestracji nie pozwala się zalogować do czasu akceptacji.
- Komisja nie może się zalogować bez `@zhr.pl`.
- Tylko przewodniczący ma możliwość zmiany statusu próby.

---

### 2) Próba (formularz + statusy)

- Utworzenie próby (status `DRAFT`).
- Formularz odwzorowujący papierową próbę.
- Statusy próby i reguły:
  - `DRAFT`, `SUBMITTED`, `NEEDS_CHANGES`, `ACCEPTED`, `REJECTED`, `ARCHIVED`.
- Asynchroniczne komentarze komisji.
- **Jedna aktywna próba na harcerza** (aktywne: `DRAFT|SUBMITTED|NEEDS_CHANGES|ACCEPTED`).
- Submit blokuje edycję.

**Kryteria akceptacji**

- Edycja możliwa tylko w `DRAFT` i `NEEDS_CHANGES`.
- Po `SUBMITTED` brak edycji aż do `NEEDS_CHANGES`.
- Harcerz nie może utworzyć nowej próby, jeśli ma aktywną.

---

### 3) Załączniki (dowody wykonania zadań)

- Dodawanie załączników do zadań próby.
- Storage: MinIO (bucket prywatny).
- Upload przez presigned PUT, download przez presigned GET (czasowe).
- Limity plików (default):
  - image: 5MB
  - pdf/doc: 10MB
  - video mp4: 50MB
  - total per trial: 100MB

**Kryteria akceptacji**

- Osoba bez uprawnień nie pobierze załącznika (brak IDOR).
- Limity są egzekwowane backendowo.

---

### 4) Posiedzenia komisji (kalendarz + sloty + zapisy)

- Komisja tworzy posiedzenia.
- Komisja generuje sloty czasowe lub konkretny dzień.
- Harcerz przegląda kalendarz posiedzeń.
- Harcerz rezerwuje slot tylko, gdy próba `ACCEPTED`.
- Komisja widzi listę zapisanych na posiedzenie.
- **MVP:** anulowanie/przeniesienie slotu tylko przez komisję (sekretarz/przewodniczący) – nie przez harcerza.

**Kryteria akceptacji**

- Rezerwacja slotu blokowana, jeśli próba nie jest `ACCEPTED`.
- Slot może być zajęty przez jedną osobę (brak overbookingu). W przypadku rezerwacji tylko na dzień - bez limitu.

---

### 5) Admin panel (w aplikacji)

- Panel admina w web:
  - lista kont `PENDING_APPROVAL` + approve/reject,
  - przypisywanie i zmiana ról komisji.
- API integruje się z Keycloak Admin API (service account).
- Wszystkie akcje admina są audytowane.

**Kryteria akceptacji**

- Dostęp do panelu tylko dla roli `ADMIN`.
- Approve/reject wpływa na możliwość logowania.
- Zmiana roli wpływa na uprawnienia (np. status change tylko dla chair).

---

### 6) Wdrożenie

- docker-compose: web/api/db/minio/keycloak/nginx.
- Reverse proxy routing:
  - `/` → web
  - `/server/` → api
  - `/auth/` → keycloak
  - `/s3/` → minio
  - 80 → 443
- Uruchomienie możliwe na serwerze organizacji.

**Kryteria akceptacji**

- `docker compose up -d` podnosi wszystkie usługi w środowisku docelowym.
- Aplikacja działa przez Nginx.

---

## Poza MVP — zakres (NEXT)

### A) OCR prób papierowych

- OCR zdjęcia papierowej próby.
- Uzupełnianie formularza danymi z OCR + weryfikacja przez użytkownika.

### B) Panel sekretarza (rozbudowany)

- Protokółowanie posiedzeń.
- Generowanie raportów.
- Archiwum i wyszukiwarka.
- Eksport danych (np. PDF).

### C) Konfigurowalne permisje

- System uprawnień konfigurowany z poziomu panelu (kto może zmieniać statusy itd.).

### D) Multi-komisja (multi-tenancy)

- Obsługa wielu komisji (oddzielne jednostki, separacja danych).

### E) Kompresja / optymalizacja storage

- Automatyczna kompresja wideo/zdjęć.

---

## Wymagania twarde (globalne)

- RODO: minimalizacja dostępu, kontrola ról, audyt działań.
- Brak IDOR (owner-checks i RBAC).
- Single-tenant w MVP (jedna komisja).

---
