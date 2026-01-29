```yaml
project:
  code: "HSS"
  name: "Harcerski System Stopni"
status: "in development"
last_updated: 2026-01-29
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

## Struktura repozytorium (wysokopoziomowo)

- `apps/web` — aplikacja web
- `apps/server` — API
- `packages/*` — współdzielone typy/schematy/UI/utility/database

## Stos technologiczny

### Komponenty infrastuktury

- `NGINX` -> proxy/edge cache/lba/limiter
- `NEXT` -> frontend/web
- `NEST` -> backend/api/server
- `KEYCLAOK` -> auth/rbac
- `POSTGRESQL` -> database engine (^v18)
- `MINIO` -> s3/bucket

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

## Dokumentacja

Zobacz: [**`/docs`**](/docs)
