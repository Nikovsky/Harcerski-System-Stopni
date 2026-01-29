# CONTEXT — HSS (Harcerki System Stopni)

## 1) Elevator pitch

HSS to aplikacja wspierająca proces pracy komisji stopni instruktorskich ZHR oraz komunikację z harcerzami realizującymi próby na stopnie instruktorskie. System cyfryzuje dokumentację prób, umożliwia asynchroniczną weryfikację przed posiedzeniem i usprawnia organizację posiedzeń komisji (sloty), skracając czas obsługi harcerza.

---

## 2) Domenowe pojęcia (glossary)

### Próba

Wniosek kandydata na stopień instruktorski. Składa się z:

- części danych o kandydacie (dane osobowe + harcerskie),
- treści opisowej (np. samoocena: wady/zalety, opinia przełożonego),
- listy indywidualnych zadań/wymagań do wykonania,
- dowodów wykonania zadań (załączniki, potwierdzenia, opisy).

### Zadanie

Pojedynczy wymóg w próbie. Może być udokumentowany:

- plikiem (zdjęcie/pdf/mp4),
- tekstem,
- potwierdzeniem osoby.

### Komisja

Organ oceniający próby, pracujący na posiedzeniach. Skład:

- przewodniczący,
- sekretarz,
- członkowie komisji.

### Posiedzenie

Spotkanie komisji. W HSS posiedzenia mają “sloty” czasowe lub dniowe, na które zapisują się harcerze (po akceptacji próby).

### Slot

Przedział czasu w ramach posiedzenia, możliwy do rezerwacji przez harcerza. Jeden slot = jedna rezerwacja.

---

## 3) Użytkownicy i role (MVP)

### Primary user

- Komisja (pracuje asynchronicznie przed posiedzeniem oraz w dniu posiedzenia).

### Secondary user

- Harcerze realizujący próby (korzystają okazjonalnie).

### Role systemowe (Keycloak client roles dla `hss-api`)

- `SCOUT`
- `COMMISSION_MEMBER`
- `COMMISSION_SECRETARY`
- `COMMISSION_CHAIR`
- `ADMIN`
- `ROOT`

---

## 4) Problemy, które rozwiązujemy (pain points)

### Komisja

- Rosnąca ilość papierowych dokumentów i logistyka przenoszenia.
- Brak możliwości wcześniejszego zapoznania się z próbami.
- Brak możliwości zgłoszenia poprawek przed posiedzeniem.
- Trudne archiwum i przeszukiwanie dokumentacji.

### Harcerz

- Informacja o posiedzeniu na krótko przed.
- Długie oczekiwanie na posiedzeniu (komisja czyta próbę “na miejscu”).
- Brak przejrzystej informacji o statusie i wymaganych poprawkach.

---

## 5) Wartość / sukces (MVP)

- Krótszy czas obsługi jednego harcerza na posiedzeniu.
- Komisja ma możliwość przygotowania się wcześniej (asynchronicznie).
- Pełny cyfrowy obieg dokumentacji prób (w tym archiwum).
- Harcerz widzi status i komentarze komisji.

---

## 6) Scope MVP (skrót)

- Keycloak OIDC + RBAC + owner-checks.
- Harcerz: rejestracja (email/hasło) + approval admina, próba (formularz), zadania, załączniki, submit, statusy, komentarze.
- Komisja: przegląd prób, komentarze, przewodniczący zmienia status.
- Posiedzenia: komisja tworzy posiedzenia i sloty; harcerz rezerwuje slot po `ACCEPTED`.
- Admin panel (w aplikacji): approve/reject kont + zarządzanie rolami komisji.
- Storage: MinIO (presigned URLs).

---

## 7) Reguły domenowe (hard rules)

- Jedna aktywna próba na harcerza.
- Edycja próby tylko w `DRAFT|NEEDS_CHANGES`.
- Submit blokuje edycję.
- Zmiana statusu tylko przez `COMMISSION_CHAIR`.
- Rezerwacja slotu tylko po `ACCEPTED`.
- Harcerz nie anuluje slotu w MVP (tylko komisja).

---

## 8) Dane i wrażliwość

Próby zawierają dane osobowe np.:

- imię i nazwisko, adres, email,
- stopień, drużyna, historia służby,
- dane opiekuna,
- samoocena (wady/zalety),
- opinia przełożonego,
- zadania indywidualne + załączniki.

Wniosek: dostęp tylko dla uprawnionych (owner + komisja + admin).

---

## 9) Środowisko i ograniczenia

- Single-tenant (jedna komisja w MVP).
- Brak integracji zewnętrznych.
- Użycie okazjonalne, mała skala (~10 concurrent).
- Wdrożenie: docker-compose na serwerze organizacji.

---

## 10) Tech stack (ustalony)

- Web: Next.js
- API: NestJS
- DB: PostgreSQL + Prisma
- Storage: MinIO
- IAM: Keycloak (OIDC)
- Reverse proxy: Nginx
