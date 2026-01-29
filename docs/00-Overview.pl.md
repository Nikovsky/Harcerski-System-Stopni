# HSS — Harcerski System Stopni (Overview)

## Elevator pitch

HSS to aplikacja wspierająca proces pracy komisji stopni instruktorskich ZHR oraz komunikację z harcerzami realizującymi próby na stopnie instruktorskie. System cyfryzuje dokumentację, umożliwia wcześniejsze zapoznanie się z próbami i usprawnia organizację posiedzeń komisji (sloty), skracając czas obsługi pojedynczego harcerza.

---

## Cel produktu

- Zmniejszyć obciążenie komisji wynikające z dokumentów papierowych i „chaosu informacyjnego”.
- Umożliwić komisji asynchroniczną analizę prób przed posiedzeniem.
- Skrócić czas obecności harcerza na posiedzeniu dzięki przygotowaniu komisji.
- Zapewnić pełną, uporządkowaną dokumentację cyfrową (w tym archiwum).

---

## Kontekst projektu

- **Produkt „na serio”** dla realnego procesu ZHR.
- Jednocześnie projekt **portfolio**.
- Projektowany z myślą o współpracy z agentami AI (generowanie kodu, testów, zadań) – stąd wysoka dyscyplina dokumentacji i kontraktów.

---

## Struktura repozytorium

```plaintext
C:.
├───.vscode
├───apps
│   ├───api
│   └───web
├───docs
├───docker
│   ├───api
│   ├───keycloak
│   ├───minio
│   ├───nginx
│   ├───postgres
│   ├───redis
│   └───web
├───packages
│   ├───config
│   ├───database
│   ├───eslint
│   ├───logger
│   ├───schemas
│   ├───ui
│   └───tsconfig
├───tests
│   ├───e2e
│   └───integration
└───scripts
```

---

## Użytkownicy i role (high-level)

### Użytkownicy

- **Komisja stopni instruktorskich** (primary user)
- **Harcerze/interesanci** realizujący próby (secondary user)

### Role systemowe (MVP)

- `SCOUT` – harcerz
- `COMMISSION_MEMBER` – członek komisji
- `COMMISSION_SECRETARY` – sekretarz
- `COMMISSION_CHAIR` – przewodniczący
- `ADMIN` – admin systemu (1–2 osoby)
- `ROOT` - pełny dostęp do wszystkich zasobów

---

## Problem, który rozwiązujemy

### Bóle komisji

- Rosnąca ilość dokumentów fizycznych, konieczność przynoszenia ich na posiedzenia.
- Brak możliwości wcześniejszego zapoznania się z próbą i zgłoszenia poprawek przed posiedzeniem.

### Bóle harcerza

- Informacja o terminie posiedzenia zbyt późno.
- Długie oczekiwanie na posiedzeniu, bo komisja dopiero na miejscu poznaje treść próby.

---

## Wartość / miary sukcesu (MVP-level)

- Skrócenie średniego czasu obsługi jednego harcerza na posiedzeniu.
- Komisja ma możliwość przygotowania się przed posiedzeniem (asynchronicznie).
- Harcerz zna status swojej próby i ma dostęp do komentarzy komisji.
- Spójny cyfrowy obieg dokumentacji prób (w tym archiwizacja).

---

## Zakres organizacyjny

- System obsługuje **jedną komisję** działającą lokalnie w skali województwa.

---

## Założenia użycia i skala

- Użycie okazjonalne (wokół terminów komisji).
- ~100 zarejestrowanych harcerzy + ~8 członków komisji.
- Peak równoczesny: ~10 użytkowników.
- Cel MVP: **czerwiec 2026** (start: luty 2026).

---

## MVP (w skrócie)

- Harcerz: rejestracja → utworzenie próby → wypełnienie formularza → submit → poprawki (jeśli wymagane) → śledzenie statusu.
- Komisja: asynchroniczny przegląd prób → komentarze → decyzja (status) przez przewodniczącego.
- Kalendarz posiedzeń: komisja tworzy posiedzenia i sloty, harcerz rezerwuje slot po zaakceptowaniu próby.
- Załączniki jako dowody wykonania zadań (MinIO).
- Admin: akceptacja kont harcerzy + zarządzanie rolami komisji (panel w aplikacji).

---

## Tech stack (MVP)

- **Web:** Next.js
- **API:** NestJS
- **DB:** PostgreSQL
- **ORM/migrations:** Prisma
- **Storage załączników:** MinIO (S3-compatible)
- **IAM / Auth:** Keycloak (OIDC)
- **Reverse proxy / routing / LBA / CACHE (static NEXT):** Nginx
- **Deployment:** docker-compose

---

## Architektura tożsamości (MVP)

- Logowanie i rejestracja realizowane przez **Keycloak (OIDC)**.
- **Harcerze:** self-registration w Keycloak (email/hasło), ale konto wymaga akceptacji admina (approval flow).
- **Komisja:** logowanie przez Google (Identity Brokering w Keycloak) + ograniczenie domeny `@zhr.pl`.
- **Role:** client roles w Keycloak (`hss-api`) i mapowanie do RBAC w API.
- **Admin panel:** w aplikacji (Next.js) – operuje na Keycloak Admin API (service account) przez API.

---

## Definicje (robocze)

- **Próba:** wniosek zawierający dane kandydata + indywidualne zadania/wymagania, wraz z dowodami ich realizacji.
- **Posiedzenie komisji:** spotkanie komisji, na które zapisują się harcerze.
- **Slot:** przedział czasowy w ramach posiedzenia możliwy do rezerwacji.

---

## Wymagania twarde

- Dostęp do próby tylko dla: właściciela próby, komisji.
- Zmiana statusu próby tylko przez `COMMISSION_CHAIR`.
- Harcerz może mieć tylko **jedną aktywną próbę** naraz.
- Załączniki przechowywane w prywatnym storage (MinIO).
- Zgodność z RODO: minimalizacja dostępu, audyt działań, brak wycieków danych w logach.

---

## Założenia

- OCR odłożone poza MVP.
- Retencja danych prób: na ten moment **bezterminowo** (do formalnego potwierdzenia).

---
