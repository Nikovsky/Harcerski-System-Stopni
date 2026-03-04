<!-- @file: .github/pull_request_template.md -->

## Opis zmiany

<!-- Co konkretnie zostalo zmienione? -->

## Dlaczego ta zmiana?

<!-- Jaki problem rozwiazuje? Jaka jest motywacja biznesowa/techniczna? -->

## Zakres (obszary dotkniete zmiana)

<!-- Zaznacz wszystko, co dotyczy -->
- [ ] `apps/web`
- [ ] `apps/api`
- [ ] `packages/schemas`
- [ ] `packages/database`
- [ ] `docker` / infra
- [ ] docs
- [ ] inne

## Ryzyko i potencjalne regresje

<!-- Co moze pojsc nie tak po wdrozeniu? -->

## Wplyw na bezpieczenstwo

<!-- Czy zmiana dotyka auth/session/cookies/RBAC/PII/upload/infra hardening? -->

## Wplyw na skalowanie

<!-- Czy zmiana pozostaje stateless i horyzontalnie bezpieczna? -->
<!-- Jesli nie: opisz i dodaj oznaczenie [SINGLE-INSTANCE] w kodzie -->

## Jak testowano

<!-- Wklej komendy i wyniki (krotko) -->

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Migracje / kontrakty

<!-- Jesli dotyczy -->
- [ ] Brak zmian w kontraktach / DB
- [ ] Zmiana kontraktow w `packages/schemas`
- [ ] Zmiana DB + migracja (`packages/database`)
- [ ] Wymagany plan rollback

## Dokumentacja

- [ ] Nie wymaga zmian w dokumentacji
- [ ] Zaktualizowano dokumentacje
  - [ ] README
  - [ ] SECURITY
  - [ ] CONTRIBUTING
  - [ ] docs/*

## Checklist quality gates

- [ ] Zmiana nie zawiera sekretow ani danych wrazliwych.
- [ ] RBAC jest egzekwowany server-side (jesli dotyczy).
- [ ] Walidacja granic wejscia jest zachowana (HTTP/form/config).
- [ ] Brak wycieku danych wrazliwych do logow i odpowiedzi API.
- [ ] Lint przechodzi.
- [ ] Typecheck przechodzi.
- [ ] Testy przechodza.
- [ ] Audit zaleznosci przechodzi lub ryzyko jest opisane.
- [ ] Zaktualizowano dokumentacje/ADR, jesli wymagane.

## Powiazane issue / taski

<!-- Np. Closes #123 -->
