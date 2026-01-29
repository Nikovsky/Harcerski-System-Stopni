# User Stories + Acceptance Criteria — HSS (MVP)

## Konwencje

- Role: `SCOUT`, `COMMISSION_MEMBER`, `COMMISSION_SECRETARY`, `COMMISSION_CHAIR`, `ADMIN`
- Status próby: `DRAFT`, `SUBMITTED`, `NEEDS_CHANGES`, `ACCEPTED`, `REJECTED`, `ARCHIVED`
- Auth: Keycloak OIDC (redirect do Keycloak UI). API przyjmuje Bearer token.

---

## EPIC 0 — Infrastruktura i fundamenty

### US-INF-01: Uruchomienie systemu w docker-compose

**Jako** developer/admin  
**Chcę** uruchomić system lokalnie i na serwerze organizacji przez docker-compose  
**Aby** móc wdrażać i testować MVP

**Acceptance criteria**

- `docker compose up -d` uruchamia: web/api/db/minio/keycloak/nginx
- Aplikacja działa przez Nginx:
  - `/` → web
  - `/server/` → api
  - `/auth/` → keycloak
  - `/s3/` → minio
  - 80 → 443
- API ma endpoint `GET /server/health` zwracający 200
- SSL wgrany do Nginx

---

## EPIC 1 — Tożsamość i dostęp (Keycloak + RBAC)

### US-AUTH-01: Rejestracja harcerza (Keycloak)

**Jako** harcerz  
**Chcę** zarejestrować konto (email/hasło)  
**Aby** móc korzystać z systemu

**Acceptance criteria**

- Rejestracja odbywa się w UI Keycloak (redirect)
- Po rejestracji konto jest nieaktywne (`enabled=false`) i wymaga akceptacji admina
- Użytkownik widzi komunikat: „Konto oczekuje na akceptację administratora”

---

### US-AUTH-02: Logowanie harcerza po akceptacji

**Jako** harcerz  
**Chcę** zalogować się do systemu po akceptacji konta  
**Aby** utworzyć i prowadzić próbę

**Acceptance criteria**

- Konto bez akceptacji nie może się zalogować do aplikacji (brak dostępu do zasobów)
- Konto po akceptacji (`enabled=true`) może przejść OIDC flow i uzyskać dostęp do web + API
- API odrzuca requesty bez poprawnego tokena (401)

---

### US-AUTH-03: Logowanie komisji

**Jako** członek komisji  
**Chcę** zalogować się przez Google  
**Aby** mieć dostęp do panelu komisji

**Acceptance criteria**

- Logowanie przez Google lub email/hasło działa przez Keycloak (Identity Provider)
- Role komisji są przypisywane i zarządzane przez `ADMIN`

---

### US-AUTH-04: RBAC + owner-checks w API

**Jako** właściciel systemu  
**Chcę** aby API egzekwowało role i dostęp do zasobów  
**Aby** nie doszło do wycieku danych lub nadużyć

**Acceptance criteria**

- `SCOUT` nie ma dostępu do cudzych prób ani załączników (403)
- `COMMISSION_*` ma dostęp do prób i załączników zgodnie z rolą
- `COMMISSION_CHAIR` jako jedyny może zmieniać status próby
- `ADMIN` ma dostęp do admin panel i audytu
- `ROOT` full access
- Testy integracyjne pokrywają przypadki forbidden/IDOR

---

## EPIC 2 — Próby (formularz + workflow)

### US-TRY-01: Utworzenie próby (DRAFT)

**Jako** harcerz  
**Chcę** utworzyć próbę  
**Aby** rozpocząć jej wypełnianie

**Acceptance criteria**

- Utworzenie tworzy próbę ze statusem `DRAFT`
- Próba jest przypisana do ownera (userId = `sub` z tokena Keycloak)
- Jeśli istnieje aktywna próba, system blokuje utworzenie nowej (409)

---

### US-TRY-02: Edycja próby (tylko DRAFT i NEEDS_CHANGES)

**Jako** harcerz  
**Chcę** edytować swoją próbę  
**Aby** uzupełnić dane i zadania

**Acceptance criteria**

- Edycja możliwa tylko w statusach `DRAFT` i `NEEDS_CHANGES`
- Próba w `SUBMITTED|ACCEPTED|REJECTED|ARCHIVED` nie jest edytowalna (409)
- API waliduje dane wejściowe (DTO + validation)

---

### US-TRY-03: Formularz próby zgodny z papierową wersją

**Jako** harcerz  
**Chcę** wypełnić próbę w systemie na wzór papierowego formularza  
**Aby** komisja otrzymała komplet informacji

**Acceptance criteria**

- Formularz zawiera co najmniej:
  - dane osobowe i harcerskie,
  - historia służby/ścieżki,
  - samoocena (wady/zalety),
  - opiekun (imię i nazwisko),
  - opinia przełożonego (tekst/załącznik),
  - zadania (kategorie + opis)
- Walidacja pól wymaganych (zdefiniowana w backlogu/implementacji)

---

### US-TRY-04: Przesłanie próby do komisji (SUBMITTED)

**Jako** harcerz  
**Chcę** przesłać próbę do komisji  
**Aby** została oceniona

**Acceptance criteria**

- `DRAFT|NEEDS_CHANGES` → `SUBMITTED`
- Po submit brak możliwości edycji
- Powstaje wpis w audycie: `TRIAL_SUBMITTED`

---

### US-TRY-05: Komentarze komisji do próby

**Jako** członek komisji  
**Chcę** dodawać komentarze do próby  
**Aby** wskazać poprawki lub uwagi przed posiedzeniem

**Acceptance criteria**

- `COMMISSION_*` może dodać komentarz
- Harcerz widzi komentarze swojej próby
- Komentarze są audytowane: `COMMENT_CREATED`

---

### US-TRY-06: Zmiana statusu próby (tylko przewodniczący)

**Jako** przewodniczący komisji  
**Chcę** zmienić status próby  
**Aby** formalnie podjąć decyzję

**Acceptance criteria**

- Tylko `COMMISSION_CHAIR` może zmieniać status
- Dozwolone przejścia zgodne ze state machine:
  - `SUBMITTED` → `NEEDS_CHANGES|ACCEPTED|REJECTED`
  - `NEEDS_CHANGES` → `SUBMITTED`
  - `ACCEPTED` → `ARCHIVED`
- Każda zmiana statusu:
  - zapisuje się do historii,
  - tworzy wpis audytu: `TRIAL_STATUS_CHANGED`

---

## EPIC 3 — Załączniki (dowody zadań)

### US-ATT-01: Dodawanie załączników do zadania

**Jako** harcerz  
**Chcę** dodać załączniki do zadania  
**Aby** udokumentować wykonanie wymagań

**Acceptance criteria**

- Upload realizowany przez presigned URL (MinIO)
- Walidacja MIME + rozmiaru po stronie API (przed init)
- Tylko owner może inicjować upload do swojej próby
- Wpis audytu: `ATTACHMENT_UPLOAD_INIT` i `ATTACHMENT_UPLOAD_COMPLETE`

---

### US-ATT-02: Pobieranie załączników przez uprawnione osoby

**Jako** komisja/harcerz  
**Chcę** pobrać załącznik  
**Aby** zweryfikować dowody

**Acceptance criteria**

- Dostęp tylko dla:
  - ownera próby,
  - ról komisji,
  - root
- Próba dostępu przez nieuprawnioną osobę → 403
- Opcjonalny wpis audytu: `ATTACHMENT_DOWNLOAD_ISSUED`

---

## EPIC 3.5 — Posiedzenia i sloty

### US-MEET-01: Tworzenie posiedzeń

**Jako** sekretarz/przewodniczący  
**Chcę** utworzyć posiedzenie komisji  
**Aby** umożliwić zapisy na konkretny termin lub dzień

**Acceptance criteria**

- Uprawnienia: `COMMISSION_SECRETARY|COMMISSION_CHAIR`
- Posiedzenie zawiera datę i opis
- Wpis audytu: `MEETING_CREATED`

---

### US-MEET-02: Generowanie slotów

**Jako** sekretarz/przewodniczący  
**Chcę** utworzyć sloty czasowe  
**Aby** harcerze mogli się zapisać na godzinę

**Acceptance criteria**

- Sloty mają start/end
- Brak nakładania slotów (walidacja)
- Wpis audytu: `SLOTS_CREATED`

---

### US-MEET-03: Przegląd kalendarza posiedzeń

**Jako** harcerz  
**Chcę** zobaczyć kalendarz posiedzeń  
**Aby** wybrać termin po akceptacji próby

**Acceptance criteria**

- Harcerz widzi listę posiedzeń i slotów (z informacją, które są wolne)
- Widok jest responsywny (RWD) — podgląd również na telefonie

---

### US-MEET-04: Rezerwacja slotu (tylko po ACCEPTED)

**Jako** harcerz  
**Chcę** zarezerwować slot na posiedzenie  
**Aby** wziąć udział w komisji o konkretnej godzinie

**Acceptance criteria**

- Rezerwacja możliwa tylko gdy próba ma status `ACCEPTED`
- Slot może być zarezerwowany tylko raz (409 przy próbie overbookingu)
- Wpis audytu: `SLOT_BOOKED`

---

### US-MEET-05: Lista zapisanych na posiedzenie

**Jako** komisja  
**Chcę** zobaczyć listę zapisanych harcerzy  
**Aby** przygotować posiedzenie

**Acceptance criteria**

- Uprawnienia: `COMMISSION_*`
- Lista pokazuje podstawowe dane (imię, nazwisko, próba, slot)
- Dostęp zgodny z RODO (tylko uprawnieni)

---

### US-MEET-06: Anulowanie/przeniesienie slotu (tylko komisja)

**Jako** sekretarz/przewodniczący  
**Chcę** anulować lub przenieść rezerwację slotu  
**Aby** zarządzać zmianami organizacyjnymi

**Acceptance criteria**

- Harcerz nie ma opcji anulowania w MVP
- Uprawnienia: `COMMISSION_SECRETARY|COMMISSION_CHAIR`
- Wpis audytu: `SLOT_CANCELED` / `SLOT_REASSIGNED`

---

## EPIC 4 — Admin panel (w aplikacji)

### US-ADM-01: Lista kont oczekujących (PENDING)

**Jako** admin  
**Chcę** zobaczyć konta oczekujące na akceptację  
**Aby** kontrolować dostęp do systemu

**Acceptance criteria**

- Web: widok /admin/pending dostępny tylko dla `ADMIN`
- Lista pobierana z API (które komunikuje się z Keycloak Admin API)
- Dane minimalne: email, fullName, createdAt
- Wpis audytu: `ADMIN_VIEW_PENDING_USERS` (opcjonalnie)

---

### US-ADM-02: Akceptacja / odrzucenie konta

**Jako** admin  
**Chcę** zaakceptować lub odrzucić konto harcerza  
**Aby** zablokować troll konta

**Acceptance criteria**

- Approve ustawia `enabled=true` w Keycloak
- Reject pozostawia `enabled=false` + zapis powodu (atrybut/metadata)
- Akcje są audytowane: `ADMIN_APPROVED_USER` / `ADMIN_REJECTED_USER`

---

### US-ADM-03: Zarządzanie rolami komisji

**Jako** admin  
**Chcę** przypisać/zmienić role komisji dla użytkownika `@zhr.pl`  
**Aby** kontrolować uprawnienia (member/secretary/chair)

**Acceptance criteria**

- Web: widok /admin/commission dostępny tylko dla `ADMIN`
- Admin może:
  - nadać rolę komisji,
  - zmienić rolę,
  - zdjąć rolę komisji
- Akcje audytowane: `ADMIN_ASSIGNED_ROLE`

---

## EPIC 5 — UX (desktop-first + RWD)

### US-UX-01: Dashboard harcerza — empty state

**Jako** harcerz  
**Chcę** widzieć komunikat, gdy nie mam jeszcze prób  
**Aby** wiedzieć, co zrobić jako pierwsze

**Acceptance criteria**

- Jeśli `trials.length == 0`, pokazuje się tekst:
  - „Nie masz jeszcze żadnych prób. Kliknij **Utwórz próbę**, aby rozpocząć.”
- Widoczne CTA „Utwórz próbę”
- Po utworzeniu pierwszej próby komunikat znika

---

## Wymagania twarde (globalne)

- Brak IDOR (owner-checks w API)
- Zmiana statusu tylko `COMMISSION_CHAIR`
- Jedna aktywna próba na harcerza
- Rezerwacja slotu tylko po `ACCEPTED`
- Approval kont harcerzy przez `ADMIN`
- Audit działań krytycznych (DB)

## Otwarte kwestie / ryzyka

- Dokładna walidacja pól formularza (lista required) – do sformalizowania w implementacji
