# AI Workspace — HSS (Harcerski System Stopni)

## Cel katalogu `.ai/`

Ten katalog służy do pracy z agentami AI (np. do generowania kodu, testów, tasków, refactorów) w sposób:

- kontrolowany (bez “halucynacji” poza wymaganiami),
- spójny z dokumentacją domenową,
- iteracyjny (małe PR-y, szybki feedback).

**Źródło prawdy (source of truth):** katalog `docs/`.  
Agent AI ma traktować `docs/` jako nadrzędne względem własnych założeń.

Aktualny kontrakt repo:

- repo jest pnpm workspace monorepo, bez Turbo,
- `pnpm dev` uruchamia `pnpm validate:env` przed generowaniem Prisma/schemas i startem aplikacji,
- `pnpm dev` nie startuje automatycznie Docker stacka; użyj jawnie `pnpm stack:up`,
- skrypty repo są Node/MJS: `scripts/infra.mjs`, `scripts/clean.mjs`, `scripts/validate-env.mjs`, `scripts/validate-certs.mjs`,
- root compliance docs są canonical po angielsku: `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CONTRIBUTING.md`.

---

## Jak agent ma pracować (workflow)

### 1) Zawsze zaczynaj od kontekstu

1. Przeczytaj:
   - `docs/0000-overview.md`
   - `docs/0101-product-overview.pl.md`
   - `docs/0103-scope-mvp-next.pl.md`
   - `docs/0201-architecture-mvp.pl.md`
   - `docs/0203-api-spec.pl.md`
2. Następnie przeczytaj:
   - `.ai/CONTEXT.md`
   - `.ai/DECISIONS.md`
   - `.ai/DEFINITION_OF_DONE.md`
   - `.ai/CODING_GUIDELINES.md`
   - `.ai/TEST_GUIDELINES.md`
   - `.ai/TASKS.md`

**Jeśli coś jest sprzeczne:** priorytet ma `docs/`, potem `.ai/DECISIONS.md`.

---

### 2) Praca w iteracjach

Agent pracuje w iteracjach zgodnie z `.ai/TASKS.md`.

Zasady iteracji:

- 1 iteracja = zestaw małych tasków domykających spójny fragment systemu.
- Każdy task kończy się:
  - implementacją,
  - testami,
  - aktualizacją dokumentacji (jeśli zmieniono kontrakt/założenia),
  - krótkim opisem w PR.

---

### 3) Zasady PR (małe i weryfikowalne)

- Preferowane PR-y: **200–600 linii** (wyjątki tylko dla scaffoldingu).
- Każdy PR musi mieć:
  - opis celu,
  - listę zmian,
  - jak przetestować (lokalnie/CI),
  - ryzyka/known issues.

---

### 4) “Stop conditions” — kiedy agent ma się zatrzymać

Agent musi przerwać pracę i poprosić o decyzję, gdy:

- brakuje kluczowej informacji domenowej (np. polityka retencji, pola obowiązkowe),
- zmiana wpływa na bezpieczeństwo lub RODO,
- trzeba zmienić kontrakt API,
- trzeba dodać nową rolę lub zmienić uprawnienia,
- trzeba wprowadzić integrację zewnętrzną (poza MVP).

---

## Czego agent NIE może robić

- Nie dodawać funkcji poza MVP bez wyraźnego taska.
- Nie wprowadzać nowych technologii bez decyzji (stack jest ustalony).
- Nie “ułatwiać” bezpieczeństwa (brak bypassów RBAC/IDOR).
- Nie logować danych wrażliwych.
- Nie zmieniać status machine bez aktualizacji dokumentów.

---

## Sposób raportowania zmian (format odpowiedzi agenta)

Agent raportuje zawsze w tym formacie:

1. **Zrobione**

- [ ] lista punktów

2. **Zmiany w plikach**

- `path/to/file` — opis

3. **Testy**

- Jak uruchomić
- Jakie przypadki pokryte

4. **Ryzyka / uwagi**

- ewentualne długi techniczne
- edge cases

5. **Wymagana decyzja (jeśli dotyczy)**

- pytania maks. 3

---

## Definicje skrótów

- **RBAC** — Role Based Access Control
- **IDOR** — Insecure Direct Object Reference (błąd dostępu do cudzych danych)
- **OIDC** — OpenID Connect
- **KC** — Keycloak
- **MVP** — Minimum Viable Product

---
