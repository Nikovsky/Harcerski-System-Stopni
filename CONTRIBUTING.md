```yaml
title: "CONTRIBUTING (Zasady Inzynieryjne)"
language: "pl"
document_type: "contributing-guide"
project:
  code: "HSS"
  name: "Harcerski System Stopni"
created_at: "2026-01-29"
last_updated: "2026-03-04"

repository:
  type: "monorepo"
  tool: "turborepo"
  package_manager: "pnpm"

requirements:
  node: ">=24.12.0"
  pnpm: ">=10.26.0"
  docker: "required for infra stack"

quality_gates:
  required_on_pr: ["lint", "typecheck", "test"]
  security: ["no-secrets", "rbac-server-side", "input-validation"]

frontend_rules:
  components_folders:
    ["apps/web/src/components/ui", "apps/web/src/components/layout"]
  ssr_critical: ["auth", "rbac", "protected-routes"]
  i18n: "next-intl (namespaced messages)"

code_rules:
  stateless_default: true
  file_header: "// @file: <repo-path>"
  types_required: true
  defensive_inputs: true

scalability_note:
  target: "horizontal"
  avoid_in_memory: ["sessions", "rate-limit", "job-queue", "locks"]
```

# Wspoltworzenie HSS (Zasady Inzynieryjne)

**Jezyk:** Polski | [English](./CONTRIBUTING.en.md)

HSS (Harcerski System Stopni) wspiera prace komisji stopni instruktorskich ZHR i komunikacje
z harcerzami realizujacymi proby instruktorskie. System cyfryzuje dokumentacje,
umozliwia asynchroniczny przeglad przed posiedzeniami i usprawnia organizacje slotow,
skracajac czas obslugi pojedynczej osoby przy zachowaniu kompletnego archiwum cyfrowego.

Te zasady istnieja, aby kod byl:

- utrzymywalny i przewidywalny,
- bezpieczny domyslnie (enterprise-level),
- gotowy na przyszle skalowanie horyzontalne,
- spojny w `apps/*` i `packages/*`.

---

## 0) Cel i zakres

Ten dokument definiuje minimalne standardy inzynieryjne i bezpieczenstwa dla:

- kodu w `apps/*` i `packages/*`,
- infrastruktury i toolingu, gdzie ma to zastosowanie,
- zmian wplywajacych na auth, autoryzacje, dane lub zachowanie user-facing.

---

## 1) Jezyk i komunikacja

- Kod, komentarze i nazewnictwo techniczne pozostaja po **angielsku**.
- Dokumentacja i komunikacja projektowa moga byc po polsku.
- Opis PR ma byc konkretny: **co zmieniono**, **dlaczego**, **ryzyko**, **jak testowano**.

---

## 2) Styl kodu: self-describing first

- Pisz kod samowyjasniajacy:
  - sensowne nazwy,
  - male funkcje,
  - pojedyncza odpowiedzialnosc.
- Komentarze dodawaj tylko gdy:
  - intencja nie jest oczywista,
  - wystepuje istotny tradeoff,
  - istnieje implikacja bezpieczenstwa.
- Komentarze maja opisywac **zamiar**, a nie przepisywac kod.

---

## 3) Wymaganie naglowka pliku (obowiazkowe)

Kazdy plik kodu musi zaczynac sie od jednolinijkowego naglowka:

```ts
// @file: apps/web/src/components/ui/button.tsx
```

Zasady:

- zawsze uzywaj sciezki od roota repo,
- utrzymuj naglowek jako pierwsza linie (przed importami).

---

## 4) Architektura stateless-first

Zasada domyslna: kod ma byc **stateless**.

Stateless oznacza:

- brak globalnego mutowalnego stanu,
- brak module-level cache zmieniajacego sie w runtime,
- brak singletonow przechowujacych dane request/user.

Dopuszczalne:

- czyste helpery,
- deterministyczne transformacje,
- uslugi stateless tworzone per request.

Jesli stan jest nieunikniony (rzadko):

- uzasadnij to krotkim komentarzem,
- opisz wplyw na skalowanie horyzontalne,
- preferuj stan zewnetrzny (DB/Redis), nie in-memory.

---

## 5) Defensive programming (bad input ready)

- Zakladaj, ze wejscie moze byc niepoprawne, chyba ze:
  - zostalo zwalidowane wczesniej w tym samym flow **i**
  - jest to jawnie udokumentowane.

- Waliduj na granicach:
  - HTTP DTO validation (API),
  - form validation (Web),
  - config validation (startup).

- Fail safely:
  - zwracaj poprawne kody HTTP,
  - nie ujawniaj szczegolow wewnetrznych,
  - loguj tyle, ile trzeba do diagnostyki (bez sekretow).

---

## 6) Typy wszedzie

- Preferuj strict TypeScript:
  - unikaj `any`,
  - unikaj niebezpiecznych type assertions bez uzasadnienia.

- Modeluj typy domenowe jawnie (np. stopnie, proby, posiedzenia/sloty).
- Wspoldzielone kontrakty trzymaj w `packages/*`:
  - `@hss/types`, `@hss/schemas` itd.

- Preferuj typy z schematow:
  - zod schema -> inferred types (single source of truth).

---

## 7) Helpery i reuse (mniej duplikacji)

- Uzywaj prostych, czytelnych helperow gdy:
  - usuwaja powtarzalna logike,
  - centralizuja walidacje/formatowanie/mapowanie,
  - zmniejszaja powierzchnie bledow.

- Unikaj abstrakcji bez wartosci:
  - bez "helpera do wszystkiego",
  - bez over-engineered utility layers.

Rekomendowane wzorce:

- pure functions do formatowania/parsingu/mapowania,
- male reuzywalne UI primitives w `components/ui`,
- wspolne reguly biznesowe w `packages/*`.

---

## 8) Zasady wydajnosci (obowiazkowe)

Wydajnosc to cecha produktu, nie afterthought.

### 8.1 Nie wysylaj zbednych danych do klienta

- Nie wysylaj do przegladarki duzych slownikow tlumaczen, wielkich configow,
  ani stalej server-only.
- Dla i18n preferuj podzial messages per feature/route-group zamiast jednego duzego JSON.

### 8.2 Preferuj Server Components / SSR dla krytycznych flow

Renderuj po stronie serwera, gdy to pomaga:

- stan uwierzytelnienia,
- RBAC gating,
- trasy chronione,
- decyzje bezpieczenstwa.

### 8.3 Utrzymuj lekkie komponenty klienckie

- Minimalizuj client-side state.
- Unikaj ciezkich bibliotek do prostych zadan.
- Kontroluj re-render cascades:
  - memoizuj tylko gdy potrzeba,
  - utrzymuj stabilne propsy,
  - unikaj zbednych context re-renderow.

---

## 9) Skalowanie (vertical teraz, horizontal potem)

HSS musi pozostac gotowy na multi-instance deployment.

Unikaj:

- in-memory sessions,
- per-instance cache bez shared store,
- local-only lockow dla correctness.

Jesli zastosujesz skrot pionowy (niewskazane):

- dodaj krotki komentarz:

> [!NOTE]
> Not horizontally scalable because ...; acceptable for now because ...; migration path: ...

---

## 10) Zasady struktury frontendu (apps/web)

### 10.1 Polityka lokalizacji komponentow

Komponenty reuzywalne musza byc w:

- `apps/web/src/components/ui` (buttons, inputs, modals, dropdowns, tables, primitives)
- `apps/web/src/components/layout` (Navbar, Footer, AppShell, wrappers, layout composition)

Zasady:

- pliki stron (`app/**/page.tsx`) maja byc cienkie:
  - orchestration + composition,
  - bez ciezkiej duplikacji UI.

- Reuzywaj UI primitives zamiast przepisywac markup.

### 10.2 SSR dla auth i tras chronionych

Rozstrzygaj po stronie serwera (SSR / Server Components / middleware), gdy to mozliwe:

- authentication state,
- user role,
- access permissions,
- protected navigation items.

Client-side checks moga istniec dla UX, ale nie moga byc jedyna ochrona.

### 10.3 i18n

- Uzywaj `next-intl` z namespaced messages.
- Utrzymuj payloady message w waskim zakresie; nie wysylaj nieuzywanych namespace.

---

## 11) Clean Code + Security (bez skrotow)

Bezpieczenstwo nie jest opcjonalne.

### 11.1 Obowiazkowe zasady bezpieczenstwa

- Sekrety nigdy nie moga trafic do repo.
- Waliduj i sanityzuj wszystkie niezaufane inputy.
- RBAC musi byc egzekwowany na granicy API (server-side).
- Rate limiting i ochrona brute-force tam, gdzie to istotne
  (login, endpointy wrazliwe).
- Cookie musza miec odpowiednio `HttpOnly`, `Secure`, `SameSite`.
- Nigdy nie loguj:
  - hasel,
  - tokenow,
  - sekretow,
  - wrazliwych danych osobowych.

### 11.2 Wymaganie dokumentacji security

Przy zmianie auth/session/crypto/storage:

- udokumentuj zagrozenie (1-2 linie),
- udokumentuj kontrole (1-2 linie).

---

## 12) Error handling i polityka logowania

- Nigdy nie ujawniaj stack trace ani bledow wewnetrznych klientom.
- Uzywaj spojnych odpowiedzi bledow i stabilnych kodow.
- Logi musza byc:
  - strukturalne,
  - poziomowane (`debug/info/warn/error`),
  - wolne od sekretow/PII,
  - z correlation/request id, jesli dostepne.

---

## 13) Zasady konfiguracji i srodowisk

- Waliduj `.env` przy starcie (fail fast).
- Nie polegaj na niebezpiecznych domyslnych wartosciach.
- Rozdzielaj konfiguracje dla dev/test/prod.
- Trzymaj sekrety poza Git i poza client bundle.

---

## 14) Baseline testow

- Testy unit dla logiki domenowej i helperow.
- Testy integracyjne dla API + DB path.
- Testy E2E dla krytycznych flow:
  - auth,
  - trasy chronione,
  - kluczowe user journeys (submission/review prob,
    sloty posiedzen, zapis decyzji gdzie dotyczy).

---

## 15) Higiena zaleznosci

- Unikaj nieutrzymywanych bibliotek dla funkcji kluczowych.
- Pinuj wersje celowo.
- Uruchamiaj audyty w CI.
- Preferuj oficjalna dokumentacje i stabilne ekosystemy.

---

## 16) Checklist PR / Review (minimum)

Kazdy PR musi spelniac:

- [ ] lint/typecheck/tests przechodza
- [ ] security reviewed (bez skrotow)
- [ ] wydajnosc uwzgledniona (bez ogromnych payloadow)
- [ ] wplyw na skalowanie opisany (jesli dotyczy)
- [ ] dokumentacja zaktualizowana przy zmianie zachowania

---

## 17) Krotka "definition of done" dla feature HSS

Zmiana jest done tylko wtedy, gdy:

- RBAC jest egzekwowany server-side dla kazdej akcji chronionej,
- inputy sa walidowane na granicach (API + formularze + config),
- dane wrazliwe nie sa eksponowane w payloadach klienta ani logach,
- feature pozostaje horyzontalnie skalowalny (bez correctness-critical in-memory state),
- testy pokrywaja krytyczna sciezke.

---

## 18) Branching, commity i rozmiar PR

### Nazewnictwo branchy
Uzyj jednego z:
- `feat/<short-topic>`
- `fix/<short-topic>`
- `chore/<short-topic>`
- `docs/<short-topic>`
- `refactor/<short-topic>`

### Komunikaty commitow
Preferuj format wymagany w repo (obszar + opis):
- `I18N - Aktualizacja tlumaczen`
- `API - Dodanie endpointu rezerwacji slotu`
- `SECURITY - Blokada wycieku tokena do payloadu klienta`

Dopuszczalne sa tez Conventional Commits, jesli nie koliduja z polityka zespolu.

### Rozmiar PR
Utrzymuj PRy male i reviewowalne:
- Preferuj < ~400 LOC diff, chyba ze istnieje mocne uzasadnienie.
- Przy wiekszych zmianach dziel na PR "prep/refactor" i PR "behavior".

---

## 19) Uruchamianie quality gates lokalnie

Przed push uruchom:

- `pnpm -r lint`
- `pnpm -r typecheck`
- `pnpm -r test`

Rekomendowane przy zmianach ryzykownych:
- `pnpm -r build`

CI jest source of truth, ale lokalne bramki powinny byc maksymalnie zblizone do CI.

---

## 20) Zmiany wrazliwe (dodatkowe wymagania)

Zmiana jest **wrazliwa**, jesli dotyka:
- auth/session/cookies/refresh flow,
- RBAC/permissions/policy checks,
- uploadu plikow lub polityk dostepu MinIO,
- endpointow przetwarzajacych PII,
- hardeningu nginx/Keycloak/PostgreSQL/infra,
- crypto/hashowania hasel/obslugi tokenow.

Dla zmian wrazliwych opis PR musi zawierac:
- podsumowanie zagrozen (1-2 punkty),
- podsumowanie kontroli (1-2 punkty),
- kroki weryfikacji (testy + manual checks).

---

## 21) Zglaszanie problemow security

**Nie** zglaszaj podatnosci przez publiczne issue ani publiczne PR.
Uzyj prywatnego procesu opisanego w `SECURITY.md`.

---

## 22) Kontrakty API i wspoldzielone schematy (packages/schemas)

- `packages/schemas` to source of truth dla wspoldzielonych kontraktow request/response.
- Kazda zmiana kontraktu musi zaktualizowac:
  - zod schema,
  - inferred types,
  - uzycie w API i Web.
- Breaking changes musza byc jawnie opisane w PR.

---

## 23) Baza danych i migracje (packages/database)

- Local dev: `prisma migrate dev` (tylko developer workflow)
- CI/prod-like: `prisma migrate deploy`
- Bez migracji destrukcyjnych bez planu (data backfill + rollback strategy).
- Nowe zapytania musza uwzgledniac indeksy/ograniczenia, gdzie to konieczne.

---

## 24) Skrypty shell i konce linii

- Wszystkie skrypty `.sh` musza miec konce linii LF.
- Nie commituj CRLF w skryptach (lamie Docker/Linux).
- Upewnij sie, ze skrypty wykonywalne maja poprawne uprawnienia (`chmod +x`).
