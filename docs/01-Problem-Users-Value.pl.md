# Problem, Użytkownicy, Wartość — HSS

## 1) Problem (stan obecny)

### Komisja (primary user) — główne bóle

- Rosnąca liczba dokumentów papierowych i konieczność ich fizycznego przenoszenia na posiedzenia.
- Brak wcześniejszego dostępu do prób i zadań harcerzy → konieczność zapoznawania się “na miejscu”.
- Brak możliwości zgłaszania uwag i wymaganych poprawek przed posiedzeniem.
- Trudniejsza archiwizacja i późniejszy dostęp do dokumentacji (rozproszenie, ryzyko braków).

### Harcerz (secondary user) — główne bóle

- Informacja o terminie posiedzenia komisji dociera zbyt późno.
- Długi czas obecności na posiedzeniu wynikający z tego, że komisja nie jest przygotowana (brak wcześniejszego wglądu w próbę).
- Brak przejrzystej informacji o statusie próby oraz o tym, “co dalej” (jakie poprawki, kiedy ponownie).

---

## 2) Użytkownicy i segmenty

### A) Harcerze realizujący próby (`SCOUT`)

- Korzystają okazjonalnie.
- Potrzeby:
  - szybkie złożenie próby i jej aktualizacja w razie uwag,
  - jasna informacja o statusie,
  - możliwość zapisania się na posiedzenie po akceptacji.

### B) Komisja (`COMMISSION_MEMBER`, `COMMISSION_SECRETARY`, `COMMISSION_CHAIR`)

- Korzysta wokół terminów posiedzeń, ale przygotowanie jest rozłożone w czasie (asynchronicznie).
- Potrzeby:
  - wygodny przegląd prób i załączników,
  - komentarze/uwagi przed posiedzeniem,
  - decyzje formalne (statusy) w sposób kontrolowany i audytowalny,
  - organizacja posiedzeń i slotów.

### C) Administrator (`ADMIN`)

- 1–2 osoby.
- Potrzeby:
  - kontrola dostępu (approval kont harcerzy),
  - przypisywanie/zmiana ról komisji,
  - dostęp do audytu i wsparcie operacyjne.

### D) Root (`ROOT`)

- pełny dostęp do wszelkich zasobów

---

## 3) Jobs-to-be-Done (JTBD)

### Harcerz

- “Chcę złożyć próbę w sposób uporządkowany i mieć pewność, że komisja zapozna się z nią przed posiedzeniem.”
- “Chcę szybko dowiedzieć się, czy muszę coś poprawić i co dokładnie.”
- “Chcę zapisać się na dogodny termin po akceptacji próby.”

### Komisja

- “Chcę przygotować się do posiedzenia, przeglądając próby wcześniej, aby spotkanie było sprawne.”
- “Chcę zgłosić uwagi przed posiedzeniem, aby ograniczyć czas rozmów na miejscu.”
- “Chcę podejmować decyzje formalne (statusy) w sposób kontrolowany i zgodny z rolami.”

### Administrator

- “Chcę zapobiec troll kontom i mieć kontrolę nad tym, kto ma dostęp.”
- “Chcę zarządzać rolami komisji bez grzebania w kodzie.”

---

## 4) Proponowane rozwiązanie (high-level)

HSS digitalizuje proces prób i komunikację:

- Harcerz wypełnia próbę (formularz), dołącza załączniki jako dowody realizacji zadań i przesyła do komisji.
- Komisja przegląda próby asynchronicznie, dodaje komentarze i wskazuje poprawki.
- Przewodniczący dokonuje formalnej zmiany statusu próby.
- Po akceptacji harcerz rezerwuje slot na posiedzenie.
- Całość jest archiwizowana i dostępna do podglądu zgodnie z uprawnieniami.

---

## 5) Wartość (value proposition)

### Wartość dla komisji

- Redukcja papieru i logistyki dokumentów.
- Możliwość przygotowania się przed posiedzeniem → mniej “czytania na żywo”.
- Usprawnienie pracy i lepszy wgląd w historię (archiwum).
- Audyt działań (kto/co/kiedy) zwiększa odpowiedzialność i porządek.

### Wartość dla harcerza

- Przewidywalny proces: status + komentarze.
- Krótszy czas na posiedzeniu (komisja przygotowana).
- Jasna ścieżka: poprawki → ponowne przesłanie → akceptacja → zapis na slot.

### Wartość dla organizacji

- Standaryzacja procesu i dokumentacji.
- Lepsza kontrola dostępu i bezpieczeństwo danych.
- Możliwość skalowania (w przyszłości) na inne komisje po dostosowaniu multi-tenancy.

---

## 6) Miary sukcesu (MVP)

### Operacyjne

- Spadek średniego czasu obsługi harcerza na posiedzeniu (baseline vs po wdrożeniu).
- Odsetek prób, które komisja przejrzała przed posiedzeniem.

### Użyteczność

- Skrócenie czasu od “SUBMITTED” do decyzji (ACCEPTED/NEEDS_CHANGES/REJECTED).
- Liczba iteracji “NEEDS_CHANGES → SUBMITTED” (jako proxy jakości formularza).

### Jakość procesu

- Pełność dokumentacji: próby z kompletem zadań i dowodów.
- Brak incydentów naruszeń dostępu (IDOR, błędne role).

---

## 7) Wymagania twarde

- Komisja ma dostęp do prób i załączników wyłącznie w ramach swoich uprawnień.
- Harcerz ma dostęp wyłącznie do swoich prób.
- Workflow decyzji: statusy zmienia wyłącznie `COMMISSION_CHAIR`.
- Approval flow: konto harcerza wymaga akceptacji admina.
- Posiedzenia/sloty: rezerwacja tylko dla prób `ACCEPTED`.

---

## 8) Otwarte kwestie / ryzyka

- Potencjalny wzrost storage przez załączniki (limity muszą być egzekwowane).
