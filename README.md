```yaml
project:
  code: "HSS"
  name: "Harcerski System Stopni"
status: "in development"
last_updated: 2026-02-11
```

# `H`arcerski `S`ystem `S`topni

**HSS** to aplikacja wspierająca proces pracy komisji stopni instruktorskich ZHR oraz komunikację z harcerzami realizującymi próby na stopnie instruktorskie. System cyfryzuje dokumentację, umożliwia wcześniejsze zapoznanie się z próbami i usprawnia organizację posiedzeń komisji (sloty), skracając czas obsługi pojedynczego harcerza.

> [!NOTE]
> **`STATUS:`** w rozwoju

## Cel produktu

- Zmniejszyć obciążenie komisji wynikające z dokumentów papierowych i „chaosu informacyjnego”.
- Umożliwić komisji asynchroniczną analizę prób przed posiedzeniem.
- Skrócić czas obecności harcerza na posiedzeniu dzięki przygotowaniu komisji.
- Zapewnić pełną, uporządkowaną dokumentację cyfrową (w tym archiwum).

## Funkcje (wysokopoziomowo)

- Cyfrowa dokumentacja prób i ich wersjonowanie / historia.
- Przegląd i ocena prób przez komisję (asynchronicznie przed posiedzeniem).
- Organizacja posiedzeń i harmonogramów (sloty).
- Kontrola dostępu (RBAC) egzekwowana po stronie serwera.
- Spójna obsługa błędów i logowanie przyjazne audytom.
- i18n przez `next-intl` (namespaced messages).

## Licencja

Zobacz [`LICENSE`](./LICENSE)

## Architektura (w skrócie)

`web (Next.js)` <-> `api (NestJS)` <-> `PostgreSQL`

Komponenty wspierające:
- `Keycloak` (OIDC, auth/RBAC)
- `MinIO` (S3-compatible object storage)
- `nginx` (TLS termination, reverse proxy)

## Struktura repozytorium (wysokopoziomowo)

- `apps/web` — aplikacja web
- `apps/api` — API
- `packages/*` — współdzielone typy/schematy/UI/utility/database

## Stos technologiczny

### Komponenty infrastruktury

- `NGINX` -> reverse proxy, TLS termination
- `NEXT` -> frontend/web
- `NEST` -> backend/api
- `KEYCLOAK` -> auth/rbac (OIDC)
- `POSTGRESQL` -> database engine (^v18)
- `MINIO` -> S3/bucket storage
- `MINIO_MC` -> konsola do MINIO
- `REDIS` -> warstwa Cache

### Technologie

- `prisma` -> db schemas (^v7.0)
- `nextjs` (app router)
- `tailwindcss`
- `zod`
- `react-hook-form`
- `@tanstack/react-query`
- `zustand`
- `next-intl`
- `auth.js` (keycloak oidc)

## Narzędzia (Developer Tooling)

W repozytorium wykorzystywane są następujące narzędzia i standardy pracy:

- `VS Code` – rekomendowane IDE (ustawienia i workspace w .vscode/)
- `Docker` – uruchamianie lokalnej infrastruktury i usług
- `Turborepo` – orkiestracja monorepo, cache buildów, pipeline
- `pnpm` – menedżer pakietów i workspace

## Wymagania lokalne

- Node.js `>= 24.12.0`
- pnpm `>= 10.26.0`
- Docker (wymagany do local infra)

## Quick start (lokalnie)

1. Instalacja zależności:
   - `pnpm install`
2. Uruchomienie lokalnej infrastruktury:
   - `pnpm stack:up`
3. Generacja/migracje bazy (zależnie od etapu projektu):
   - `pnpm db:generate`
   - `pnpm db:migrate`
4. Uruchomienie aplikacji:
   - `pnpm dev`

Skrót dla czystego startu:
- `pnpm start:cold`

## Lokalne URL i porty (domyślne)

- `https://hss.local` (web)
- `https://api.hss.local` (api)
- `https://auth.hss.local` (keycloak)
- `https://authconsole.hss.local` (keycloak admin console)
- `https://s3.hss.local` (minio api)
- `https://s3console.hss.local` (minio console)

Porty usług:
- Next.js: `3000`
- NestJS: `5000`
- PostgreSQL: `5432`
- Keycloak: `8080`
- MinIO: `9000`
- MinIO Console: `9001`

## Zmienne środowiskowe i sekrety

- Nie commituj `.env`, kluczy prywatnych, tokenów ani haseł.
- Użyj `.env.example` jako punktu wyjścia.
- Konfiguracja powinna być walidowana przy starcie (fail-fast).

## Domyślne zasady bezpieczeństwa

- RBAC egzekwowany po stronie API (server-side).
- Walidacja wejścia na granicach (HTTP/form/config).
- Brak tokenów w `localStorage`.
- Bez logowania danych wrażliwych (tokeny, hasła, sekrety, PII).
- Spójny kontrakt błędów i correlation/request ID.

## Dokumentacja

Zobacz: [**`/docs`**](/docs)
