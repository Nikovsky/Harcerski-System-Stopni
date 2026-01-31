# CODING GUIDELINES — HSS (Next.js + NestJS + Prisma) — PL

## Cel

Ustalić spójne zasady kodowania dla HSS, tak aby:

- kod był przewidywalny i łatwy do utrzymania,
- bezpieczeństwo (RBAC/IDOR) było “secure by default”,
- projekt był gotowy na przyszłą skalowalność poziomą (multi-instance),
- agent AI generował kod zgodny ze standardem repo.

> Uwaga: styl dokumentacji i komunikacji zespołowej jest po polsku, ale **kod, komentarze, nazwy, komunikaty logów i komunikaty PR/commit** mają być **po angielsku** (zgodnie z CONTRIBUTING).

---

## 0) Wymagania repo i narzędzia

- Repo: **monorepo** (tooling: **turborepo**)
- Package manager: **pnpm**
- Node: `>= 24.12.0`
- pnpm: `>= 10.26.0`
- Docker: wymagany do stacku infra (compose)

**Quality gates (wymagane na PR)**

- `lint`
- `typecheck`
- `test`

**Security gates**

- `no-secrets` (brak sekretów w repo)
- `rbac-server-side` (RBAC po stronie API)
- `input-validation` (walidacja na granicach)

---

## 1) Zasady nadrzędne

- **KISS**: najprostsze rozwiązanie, które spełnia wymagania.
- **DRY**: unikamy duplikacji, ale nie kosztem czytelności (nie “abstrahuj na siłę”).
- **Stateless-first**: domyślnie bez stanu w pamięci procesu.
- **Defensive programming**: zakładamy, że input może być zły.
- **Secure by default**: bezpieczeństwo nie jest opcją i nie jest “do później”.
- **Readability > cleverness**: preferuj czytelność nad spryt.

---

## 2) Język w kodzie i komunikacji

- **Kod, komentarze, logi, nazwy, commit messages, PR descriptions — po angielsku.**
- Dokumentacja w `docs/` i `ai/` może być po polsku (jak w tym repo), ale w kodzie trzymamy angielski.

---

## 3) Obowiązkowy nagłówek pliku (MANDATORY)

Każdy plik kodu musi zaczynać się od:

```ts
// @file: apps/web/src/components/ui/button.tsx
```

Zasady:

- ścieżka od root repo,
- zawsze jako **pierwsza linia** (przed importami).

---

## 4) Struktura repozytorium

```plaintext
C:.
├───.vscode
├───apps
│   ├───api
│   └───web
├───docs
│   └───ai
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

## 5) NASA “10 filarów” — adaptacja do TypeScript (praktyczne zasady)

Nie przenosimy 1:1, tylko wybieramy sensowne i wdrażalne zasady dla TS/Nest/Next:

1. **Prostota i czytelność** — preferuj małe funkcje, jawne nazwy.
2. **Jednoznaczność** — unikaj “magii” (ukrytych efektów ubocznych).
3. **Spójność** — te same wzorce dla modułów, DTO, błędów, logów.
4. **Defensywność** — waliduj input, obsługuj błędy, nie zakładaj “happy path”.
5. **Jawne granice** — boundary validation: HTTP, formularze, config.
6. **Minimalizacja stanu** — bez globalnych mutowalnych obiektów i cache’y “na dziko”.
7. **Testowalność** — logika domenowa jako pure functions + serwisy do IO.
8. **Obserwowalność** — requestId, sensowne logi, audyt zdarzeń krytycznych.
9. **Kontrola ryzyka** — przy skrótach (np. brak skalowalności poziomej) dodaj notkę i plan migracji.
10. **Zmiany małymi krokami** — małe PR-y, szybka weryfikacja.

---

## 6) Stateless-first i skalowalność pozioma (HORIZONTAL-READY)

Cel: w przyszłości uruchomienie wielu instancji bez błędów “correctness”.

### Zabronione (dla poprawności systemu)

- in-memory sessions,
- in-memory rate limiting,
- job queues w pamięci,
- locks w pamięci,
- cache per-instancja jako źródło prawdy.

### Dozwolone

- pure helper functions,
- deterministyczne transformacje,
- short-lived, read-only cache konfiguracyjny (np. JWKS cache) **bez stanu użytkownika**.

Jeśli musisz wprowadzić stan:

- dodaj krótką notkę w kodzie:
  - dlaczego,
  - wpływ na skalowalność,
  - plan migracji (np. Redis/DB).

---

## 7) Walidacja i defensywność (BOUNDARY VALIDATION)

Walidujemy na granicach systemu:

### API (NestJS)

- DTO + `class-validator` / `class-transformer` jest obowiązkowe.
- Każdy endpoint waliduje:
  - parametry ścieżki,
  - query,
  - body.

### Web (Next.js)

- Form validation (np. zod) w warstwie klienta dla UX,
- ale **API i tak waliduje** (frontend nie jest źródłem prawdy).

### Config

- `.env` waliduj na starcie (fail fast).
- Nie polegaj na “cichych defaultach” w produkcji.

---

## 8) Typy “wszędzie” i kontrakty wspólne

- Strict TypeScript, brak `any`.
- Unikaj `as unknown as ...`. Jeśli musisz — uzasadnij komentarzem (EN).
- Kontrakty współdzielone trzymamy w `packages/*`:
  - `packages/schemas` (zod) jako source of truth,
  - `packages/types` typy inferowane ze schematów.

Preferowany model:

- **zod schema → infer types** (1 źródło prawdy).

---

## 9) Backend (NestJS) — standardy implementacji

### 9.1 Moduły domenowe

Każdy moduł:

- `controller.ts` — cienki, tylko mapping HTTP → service
- `service.ts` — logika użycia (use-cases)
- `dto/` — request/response DTO
- `policy.ts` (opcjonalnie) — autoryzacja jeśli złożona
- `repository.ts` (opcjonalnie) — enkapsulacja Prisma

### 9.2 Autoryzacja (MUST)

- Wszystkie endpointy poza health:
  - walidacja JWT (Keycloak),
  - RBAC guard,
  - owner-check dla zasobów ownerowych.

**Nie ma wyjątków typu “frontend sprawdza rolę”.**

### 9.3 IDOR prevention (MUST)

- Jeśli zasób ma ownera (Trial/Attachment/Booking):
  - sprawdź `sub` z tokena vs `ownerUserId` (lub rola komisji/admin).
- Zwracaj spójne kody (401/403/404) zgodnie z `docs/07`.

### 9.4 Błędy (spójny envelope)

- Używamy jednolitego formatu błędu jak w `docs/07-API-Spec.md`.
- Nie wyciekamy stack trace do klienta.
- Nie ujawniamy szczegółów bezpieczeństwa w komunikatach.

### 9.5 Transakcje i konflikty

- Konfliktowe operacje (slot booking, status change + audit) robić w transakcji.
- Konflikty domenowe → `409 CONFLICT`.

### 9.6 Audit (MUST)

Operacje krytyczne zawsze generują `AuditEvent`:

- submit,
- zmiana statusu,
- booking/cancel,
- init/complete upload,
- akcje admina.

---

## 10) Prisma / DB — standardy

- Każda zmiana schematu = migracja.
- Trzymaj indeksy wg `docs/05-Data-Model.md`.
- Unikalność (np. booking slotu) egzekwuj constraintem/unique tam gdzie to możliwe.
- “Single active trial” — w MVP logika w serwisie; jeśli dodamy constraint w DB, dokumentujemy.

---

## 11) Frontend (Next.js) — standardy

### 11.1 Lokalizacja komponentów (policy)

Reusable komponenty:

- `apps/web/src/components/ui`
- `apps/web/src/components/layout`

Zasady:

- `app/**/page.tsx` ma być **cienkie** (kompozycja, bez duplikacji ciężkiego UI).
- Feature code w `features/*`.

### 11.2 SSR / Server Components dla krytycznych flow

**SSR krytyczne:**

- auth,
- RBAC gating,
- protected routes.

UI może robić dodatkowe checki dla UX, ale ochrona jest w API.

### 11.3 i18n

- `next-intl` z namespaced messages.
- Nie wysyłamy ogromnych słowników do klienta.
- PL jest jedynym językiem systemu (messages nadal mogą być namespaced dla porządku).

---

## 12) Performance rules (MUST)

- Nie wysyłaj niepotrzebnych danych do klienta (szczególnie PII i duże payloady).
- Unikaj ciężkich bibliotek dla prostych rzeczy.
- Trzymaj klienta “lean”: minimalny state, brak kaskad re-render.

---

## 13) Logging i RODO (MUST)

- Logi strukturalne (JSON), poziomy `debug/info/warn/error`.
- Logujemy: `requestId`, `userId`, `role`, `entityId`.
- Nie logujemy:
  - danych osobowych (adres, samoocena, opinia),
  - treści komentarzy,
  - tokenów/sekretów,
  - nazw plików (mogą zawierać PII) — loguj `attachmentId`.

---

## 14) Sekrety i higiena zależności

- Sekrety nigdy do repo.
- `.env` poza repo + walidacja na starcie.
- Preferuj utrzymywane biblioteki.
- Audyt zależności w CI (jeśli skonfigurowane).

---

## 15) Testowanie — baseline

- Unit tests dla logiki domenowej i helperów.
- Integration tests dla API + DB (szczególnie RBAC/IDOR i 409).
- E2E tests dla krytycznych ścieżek (min. 3 scenariusze MVP).

---

## 16) Checklist PR (minimum)

- [ ] lint / typecheck / test przechodzą
- [ ] RBAC enforced server-side
- [ ] input validation na boundary
- [ ] brak sekretów i brak PII w logach
- [ ] audit dodany dla operacji krytycznych
- [ ] brak funkcji poza MVP
- [ ] docs zaktualizowane jeśli zmieniono kontrakt/flow

---

## Wymagania twarde (podsumowanie)

- Secure by default: RBAC + owner-checks w API, brak IDOR
- Walidacja inputów na granicach (HTTP/forms/config)
- Brak danych wrażliwych w logach
- Stateless-first, gotowość na skalowanie poziome
- Quality gates na PR: lint + typecheck + test
- Nagłówek `// @file:` w każdym pliku kodu

## Założenia

- Kod/komentarze/PR/commity po angielsku.
- next-intl jako i18n framework (nawet jeśli 1 język, dla struktury).

## Otwarte kwestie / ryzyka

- Czy i kiedy wprowadzamy Redis (np. rate limiting) — poza MVP, chyba że wymagane.
- Czy “single active trial” ma dostać constraint DB (partial index) — decyzja później.
