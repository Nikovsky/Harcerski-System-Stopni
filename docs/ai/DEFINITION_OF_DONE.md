# DEFINITION OF DONE — HSS (MVP)

## Cel

Jednoznacznie określić, kiedy zadanie / feature / iteracja jest “done” w HSS. Agent AI i współpracownik techniczny muszą się tego trzymać.

---

## 1) DoD dla pojedynczego taska

Task jest DONE, gdy spełnia wszystkie punkty:

### A) Funkcjonalność

- Zaimplementowana zgodnie z `docs/` oraz `ai/DECISIONS.md`.
- Ma kompletne kryteria akceptacji (AC) w opisie taska (lub w dokumentacji).
- Nie wprowadza funkcji poza scope MVP bez jawnego taska.

### B) Bezpieczeństwo

- Endpointy API mają:
  - walidację tokena,
  - RBAC (jeśli dotyczy),
  - owner-check (jeśli zasób jest ownerowy),
  - poprawne kody błędów (401/403/404/409).
- Brak IDOR (próba dostępu do cudzych danych kończy się 403/404 zgodnie z polityką).
- Nie logujemy danych wrażliwych (RODO).

### C) Testy

- Są testy adekwatne do taska:
  - unit tests dla logiki domenowej,
  - integration tests dla endpointów i uprawnień,
  - E2E tylko gdy dotyczy krytycznej ścieżki użytkownika.
- Testy przechodzą lokalnie.
- Testy pokrywają:
  - happy path,
  - co najmniej 1 negatywny przypadek (403/409).

### D) Jakość kodu

- Kod przechodzi lint + typecheck.
- Nazewnictwo spójne z domeną (`Trial`, `MeetingSlot`, `AuditEvent`).
- Brak “magic numbers” dla limitów (konfigurowalne).
- Brak duplikacji logiki uprawnień (wspólne guards/helpers).

### E) Dokumentacja

- Jeśli task zmienia API/kontrakt/flow:
  - aktualizacja `docs/07-API-Spec.md` / `docs/04-UX-Flows.md` / `docs/06-Architecture.md` (zależnie od zmiany).
- Jeśli task zmienia decyzje: aktualizacja `ai/DECISIONS.md`.

### F) Backward compatibility / migracje

- Jeśli dotyczy DB:
  - migracja Prisma jest dodana,
  - dane nie są tracone (chyba że jawnie ustalone),
  - istnieje plan migracji/seed dla dev.

---

## 2) DoD dla feature (większy kawałek)

Feature jest DONE, gdy:

- wszystkie taski w feature są DONE (wg pkt 1),
- istnieje spójny UX flow (web) + API,
- jest minimum 1 integration test i 1 e2e/smoke (dla krytycznych ścieżek),
- audyt obejmuje operacje krytyczne,
- brak znanych blokujących bugów.

---

## 3) DoD dla iteracji (zgodnie z `ai/TASKS.md`)

Iteracja jest DONE, gdy:

- wszystkie taski iteracji są DONE,
- jest PR z opisem:
  - “co zrobiono”
  - “jak przetestować”
  - “ryzyka”
- repo jest w stanie “green” (build/test).
- deployment lokalny działa (compose) jeśli iteracja dotyczy infrastruktury.

---

## 4) Gate release MVP (czerwiec 2026)

MVP może być uznane za gotowe do użycia, gdy:

- działają end-to-end ścieżki:
  1. harcerz rejestruje się → admin akceptuje → harcerz tworzy próbę → submit,
  2. komisja przegląda → komentarz → chair zmienia status na ACCEPTED,
  3. harcerz rezerwuje slot,
  4. komisja widzi listę zapisanych.
- brak IDOR (testy + smoke manual).
- backup DB + MinIO skonfigurowany.
- HTTPS jest gotowe w środowisku docelowym.
- audyt obejmuje statusy, admin i booking.

---

## 5) Wymagania twarde (DoD-level)

- RBAC + owner-checks w API (zawsze).
- Status change tylko chair.
- Approval kont harcerzy przez admin.
- Presigned URLs dla attachments (brak proxy plików przez API).
- Brak danych wrażliwych w logach.

---
