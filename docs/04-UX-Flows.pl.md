# UX Flows — HSS (MVP)

## Założenia UX

- Desktop-first (formularz próby jest rozbudowany), ale responsywnie:
  - na telefonie: podgląd statusu, komentarzy, kalendarza, slotów.
- Język interfejsu: PL.
- Logowanie/rejestracja przez redirect do Keycloak UI.

---

## Nawigacja (high-level)

### Harcerz (`SCOUT`)

- Dashboard
- Moja próba (szczegóły)
- Edycja próby (sekcje formularza)
- Zadania i dowody (załączniki)
- Komentarze komisji
- Kalendarz posiedzeń / zapisy

### Komisja (`COMMISSION_*`)

- Dashboard komisji (lista prób)
- Szczegóły próby
- Komentarze
- (Chair) Zmiana statusu
- Posiedzenia i sloty (sekretarz/chair)
- Lista zapisanych na posiedzenie

### Admin (`ADMIN`)

- Pending konta (approve/reject)
- Role komisji (assign/change/clear)
- Audit (podgląd)

### ROOT (`ROOT`)

- Dashboard:
  - Panel admina
  - Panel komisji

---

## Flow 1 — Logowanie / rejestracja (Keycloak)

### 1A) Harcerz: rejestracja i approval

1. Wejście na aplikację (web).
2. Klik “Zaloguj / Zarejestruj”.
3. Redirect do Keycloak (ekran rejestracji).
4. Harcerz rejestruje konto (email/hasło).
5. Po powrocie do aplikacji:
   - jeśli konto nieaktywne → ekran informacyjny: „Konto oczekuje na akceptację administratora”.
6. Po akceptacji przez admina:
   - ponowne logowanie działa i harcerz widzi dashboard.

**Kryteria akceptacji**

- Do czasu akceptacji brak dostępu do zasobów aplikacji.
- Komunikat “oczekuje na akceptację” jest jednoznaczny.

---

### 1B) Komisja: logowanie

1. Użytkownik wybiera logowanie.
2. Redirect do Keycloak.
3. Po udanym logowaniu:
   - użytkownik wraca do aplikacji z rolą komisji (nadawaną przez admina).

**Kryteria akceptacji**

- Role komisji nie są nadawane automatycznie (admin przypisuje).

---

## Flow 2 — Harcerz: pierwsze wejście (empty state)

### 2A) Dashboard bez prób

1. Harcerz wchodzi na Dashboard.
2. System pobiera listę prób.
3. Jeśli `trials.length == 0`, widoczny jest empty state:
   - tekst: „Nie masz jeszcze żadnych prób. Kliknij **Utwórz próbę**, aby rozpocząć.”
   - CTA: **Utwórz próbę**

**Kryteria akceptacji**

- Empty state widoczny tylko, gdy brak prób.
- Po utworzeniu próby komunikat znika.

---

## Flow 3 — Harcerz: utworzenie i wypełnienie próby

### 3A) Utworzenie próby

1. Harcerz klika CTA “Utwórz próbę”.
2. System tworzy próbę (status `DRAFT`).
3. Przekierowanie do widoku edycji próby.

**Kryteria akceptacji**

- Jeśli istnieje aktywna próba → komunikat i blokada utworzenia nowej.

---

### 3B) Edycja próby (formularz sekcyjny)

Proponowany układ sekcji (desktop):

- Sekcja 1: Dane kandydata (imię, nazwisko, adres, email, wiek)
- Sekcja 2: Informacje harcerskie (stopień, drużyna, historia służby, rok przyrzeczenia)
- Sekcja 3: Opiekun (imię i nazwisko)
- Sekcja 4: Samoocena (wady/zalety)
- Sekcja 5: Opinia przełożonego (tekst / załącznik)
- Sekcja 6: Zadania (kategorie + lista zadań)
- Sekcja 7: Podsumowanie + “Wyślij do komisji”

Zasady:

- Użytkownik może zapisywać w trakcie (auto-save lub “Zapisz” per sekcja).
- System jasno pokazuje status próby (badge) w nagłówku.

**Kryteria akceptacji**

- Formularz edytowalny tylko w `DRAFT` i `NEEDS_CHANGES`.
- Walidacja pól wymaganych przed submit.

---

## Flow 4 — Harcerz: submit próby

1. Harcerz w sekcji podsumowania klika “Wyślij do komisji”.
2. Jeśli walidacja OK → zmiana statusu na `SUBMITTED`.
3. UI przechodzi w tryb “podgląd” (read-only).
4. Widoczna informacja: “Próba przesłana – oczekuje na weryfikację”.

**Kryteria akceptacji**

- Po submit brak edycji (read-only).
- Pokazuje się status `SUBMITTED`.

---

## Flow 5 — Komisja: przegląd prób i komentarze (asynchronicznie)

### 5A) Lista prób

1. Członek komisji wchodzi na dashboard komisji.
2. Widzi listę prób z filtrami:
   - status (SUBMITTED / NEEDS_CHANGES / ACCEPTED / REJECTED / ARCHIVED)
   - wyszukiwanie (nazwisko/email) (opcjonalnie w MVP)
3. Klik w próbę → widok szczegółów.

**Kryteria akceptacji**

- Lista zawiera podstawowe dane i status.
- Dostęp tylko dla ról komisji.

---

### 5B) Szczegóły próby + komentarze

1. Komisja przegląda dane próby i zadania.
2. Dodaje komentarz (uwagi/ poprawki).
3. Harcerz widzi komentarze po stronie swojej próby.

**Kryteria akceptacji**

- Komentarze są widoczne dla ownera i komisji.

---

## Flow 6 — Przewodniczący: zmiana statusu próby

1. Przewodniczący otwiera szczegóły próby.
2. Widzi akcje statusu (np. “Do poprawy”, “Przyjmij”, “Odrzuć”).
3. Wybiera nowy status + opcjonalny powód.
4. System zapisuje zmianę i audytuje.

**Kryteria akceptacji**

- Akcje statusów widoczne tylko dla `COMMISSION_CHAIR`.
- System blokuje niedozwolone przejścia statusów (komunikat).

---

## Flow 7 — Załączniki (dowody zadań)

### 7A) Harcerz: upload

1. W zadaniu użytkownik wybiera “Dodaj załącznik”.
2. UI wysyła metadane do API (init) → otrzymuje presigned URL.
3. UI uploaduje plik do MinIO.
4. UI wywołuje “complete”.
5. Załącznik widoczny na liście.

**Kryteria akceptacji**

- Limit MIME/rozmiaru egzekwowany (komunikat błędu).
- Upload dostępny tylko dla ownera i tylko gdy próba edytowalna (jeśli tak przyjęte w implementacji).

---

### 7B) Komisja: download

1. Komisja klika “Pobierz”.
2. API zwraca czasowy URL.
3. Plik pobiera się w przeglądarce.

**Kryteria akceptacji**

- Nieuprawniony użytkownik nie otrzyma linku (403).

---

## Flow 8 — Posiedzenia i sloty

### 8A) Komisja: tworzenie posiedzenia i slotów

1. Sekretarz/chair wchodzi w “Posiedzenia”.
2. Tworzy posiedzenie (data + opis).
3. Generuje sloty (start/end) — np. co 15 min lub wybiera konkretny cały dzień.

**Kryteria akceptacji**

- Brak nakładania slotów.
- Lista slotów widoczna po utworzeniu.

---

### 8B) Harcerz: zapis na slot

1. Harcerz wchodzi w “Kalendarz posiedzeń”.
2. Widzi posiedzenia i wolne sloty lub dzień.
3. Jeśli próba ma status `ACCEPTED`, może kliknąć “Zarezerwuj”.
4. Po rezerwacji slot oznaczony jako zajęty.

**Kryteria akceptacji**

- Jeśli próba nie `ACCEPTED`, UI blokuje akcję i pokazuje informację.
- Overbooking blokowany (409).

---

### 8C) Zmiany slotu (MVP)

- Harcerz nie może anulować.
- Sekretarz/chair może anulować/przenieść rezerwację.

**Kryteria akceptacji**

- Akcje anulowania widoczne tylko dla komisji (sekretarz/chair).

---

## Flow 9 — Admin panel (w aplikacji)

### 9A) Pending konta

1. Admin wchodzi w /admin/pending.
2. Widzi listę kont oczekujących.
3. Approve: aktywuje konto.
4. Reject: pozostawia konto nieaktywne + zapisuje powód.

**Kryteria akceptacji**

- Dostęp do widoku tylko dla `ADMIN`.
- Akcje są audytowane.

---

### 9B) Role komisji

1. Admin wchodzi w /admin/commission.
2. Wyszukuje użytkownika (email).
3. Nadaje/zmienia/zdejmuje rolę komisji.

**Kryteria akceptacji**

- Zmiana roli działa natychmiast w autoryzacji API.
- Akcje audytowane.

---

## Wymagania twarde (globalne)

- Desktop-first, ale responsywność dla podglądu na telefonie.
- UI w PL.
- Role/permissions nie mogą być oparte wyłącznie o frontend.

## Otwarte kwestie / ryzyka

- Dokładna walidacja formularza (required fields) — do doprecyzowania na etapie implementacji.
- Czy upload załączników dopuszczamy po submit? (default: nie; tylko w edytowalnych statusach) — do decyzji w implementacji.
