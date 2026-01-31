# TEST GUIDELINES — HSS (MVP)

## Cel

Ustalić zasady testowania w HSS tak, aby:

- krytyczne ścieżki MVP były zawsze zielone,
- bezpieczeństwo (RBAC/IDOR) było testowane systemowo,
- testy były szybkie, stabilne i powtarzalne,
- agent AI generował testy zgodne ze standardem repo.

> Uwaga: testy, nazwy, opisy i komentarze w kodzie — **po angielsku**.

---

## 0) Quality gates (wymagane na PR)

Każdy PR musi przejść:

- `lint`
- `typecheck`
- `test`

**Dodatkowe security gates (w testach)**

- RBAC enforced server-side (brak “mock security” w runtime)
- input validation działa (400/409 zamiast 500)
- brak IDOR (testy negatywne)

---

## 1) Piramida testów (docelowo)

1. **Unit tests** — logika domenowa i czyste funkcje (najszybsze)
2. **Integration tests** — API + DB (i minimalnie storage auth)
3. **E2E tests** — krytyczne flow użytkownika (najmniej, ale najważniejsze)

Zasada:

- większość logiki w unit,
- bezpieczeństwo i kontrakty w integration,
- “happy path” użytkownika w e2e.

---

## 2) Unit tests — zasady (API)

### Co testujemy (MUST)

- Status machine prób (dozwolone przejścia + odrzucenia).
- Reguła “single active trial”.
- Reguły domenowe:
  - edycja tylko w `DRAFT|NEEDS_CHANGES`,
  - booking tylko po `ACCEPTED`,
  - chair-only status change (logika policy/guard helper).

### Jak pisać

- Testuj czyste funkcje (pure functions) gdzie to możliwe.
- Nie używaj DB ani HTTP (to nie unit).
- Naming (Jest):
  - `describe('trialStatusTransitions', ...)`
  - `it('should reject transition from SUBMITTED to ARCHIVED', ...)`

**Kryteria akceptacji**

- Każda reguła domenowa ma:
  - min. 1 test pozytywny,
  - min. 1 test negatywny.

---

## 3) Integration tests — zasady (API + DB)

### Cel

Udowodnić, że:

- endpointy działają z prawdziwą bazą,
- RBAC/owner-checks blokują nieuprawnione akcje,
- konflikty domenowe zwracają 409,
- audyt tworzy się dla operacji krytycznych.

### Minimalny zestaw (MUST)

Dla każdego krytycznego endpointu musi istnieć test:

- **401**: bez tokena,
- **403**: z tokenem, ale złą rolą / brak ownera,
- **200/201/204**: poprawny flow,
- **409**: konflikt domenowy (gdy dotyczy).

### DB i środowisko testowe

- Preferowane: test Postgres w kontenerze (np. testcontainers) lub osobny `docker compose -f ... test`.
- Każdy test:
  - zaczyna z czystym stanem (truncate/schema reset),
  - seeduje minimalne dane.

### Auth w testach

W integration testach NIE musimy uruchamiać pełnego Keycloak, ale musimy testować role i `sub`.

Dozwolone podejścia:

- **Local JWKS**: API w trybie testowym weryfikuje token podpisany testowym kluczem (najlepsze).
- **Mock auth guard**: tylko jeśli nadal testujemy RBAC/owner-check w warstwie policy (gorsze, ostrożnie).

**Wymagania twarde**

- Musimy mieć możliwość łatwego generowania tokenów testowych dla ról:
  - `SCOUT`, `COMMISSION_MEMBER`, `COMMISSION_SECRETARY`, `COMMISSION_CHAIR`, `ADMIN`.

---

## 4) E2E tests — zasady (Web + API)

### Cel

Zapewnić, że user journeys MVP są stabilne i działają po zmianach UI/Api.

### Minimalne scenariusze MVP (MUST)

1. **Scout happy path**
   - create trial → fill minimal → submit → status visible
2. **Commission chair decision**
   - open trial → add comment → set status ACCEPTED
3. **Booking**
   - create meeting+slots (secretary/chair) → scout books slot after ACCEPTED → commission sees booking

### Approach do logowania w E2E

Opcje (do wyboru w repo, ale spójnie):

- **A: Full Keycloak UI flow** (wolniejsze, najbardziej realistyczne)
- **B: Test-only login bypass** (szybsze; tylko w `NODE_ENV=test`, nigdy w prod)

Jeśli wybieramy B:

- musi być twardy guard (build-time + runtime) uniemożliwiający użycie w prod,
- musi być opisane w docs.

---

## 5) Testy bezpieczeństwa (RBAC/IDOR) — checklista

### IDOR

- SCOUT A nie widzi trial SCOUT B (403/404 zgodnie z polityką).
- SCOUT A nie pobierze attachment SCOUT B.
- SCOUT A nie zarezerwuje slotu dla trial B.

### RBAC

- MEMBER/SECRETARY nie zmienia statusu.
- CHAIR może zmieniać statusy zgodnie z state machine.
- ADMIN może:
  - approve konta,
  - zarządzać rolami,
  - czytać audyt.

### Input validation

- błędne UUID w params → 400
- niepoprawny status transition → 409
- upload niewłaściwy MIME/size → 400/409

---

## 6) Kontrakty API w testach

- Każdy endpoint w testach powinien weryfikować:
  - status code,
  - shape response (minimalnie kluczowe pola),
  - error envelope dla błędów.

Zalecenie:

- jeśli mamy `packages/schemas`, waliduj response przez zod.

---

## 7) Audit tests (MUST)

Dla operacji krytycznych testujemy:

- event powstaje,
- ma poprawne:
  - `actorUserId`, `action`, `entityType`, `entityId`,
  - brak danych wrażliwych w metadata.

Operacje krytyczne:

- TRIAL_SUBMITTED
- TRIAL_STATUS_CHANGED
- SLOT_BOOKED / SLOT_CANCELED
- ATTACHMENT_UPLOAD_INIT / COMPLETE
- ADMIN_APPROVED_USER / ASSIGNED_ROLE

---

## 8) Naming i organizacja testów

### Lokalizacja (propozycja)

- API:
  - `apps/api/test/unit/**`
  - `apps/api/test/integration/**`
- Web:
  - `apps/web/e2e/**` (Playwright)

### Naming plików

- unit: `*.spec.ts`
- integration: `*.int.spec.ts`
- e2e: `*.e2e.spec.ts`

---

## 9) Stabilność testów (flakiness policy)

- Zakaz `sleep(1000)` bez powodu.
- W E2E używaj oczekiwań na elementy/stany (Playwright auto-wait).
- Testy muszą być deterministyczne:
  - seed danych kontrolowany,
  - timezone ustawione,
  - losowość wyłączona lub stały seed.

---

## 10) Wymagania twarde — podsumowanie

- Minimalny zestaw E2E (3 scenariusze MVP)
- Integration testy RBAC/IDOR dla krytycznych endpointów
- Unit testy status machine + single active trial
- Audit testy dla operacji krytycznych
- Testy i opisy po angielsku
- PR gate: lint + typecheck + test

## Założenia

- Keycloak nie musi stać w integration testach (local JWKS preferowane).
- E2E login approach wybieramy raz i trzymamy się konsekwentnie.

## Otwarte kwestie / ryzyka

- Decyzja: E2E login (Full KC vs bypass).
- Utrzymanie test DB (testcontainers vs compose).
