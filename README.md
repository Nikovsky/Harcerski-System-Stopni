<p align="center">
  <img src="./docs/assets/readme-logo.svg" alt="Harcerski System Stopni logo" width="132" />
</p>

<h1 align="center">Harcerski System Stopni (HSS)</h1>

<p align="center">
  Cyfrowa obsluga prob instruktorskich ZHR: dokumentacja, workflow komisji, audyt i bezpieczenstwo.
</p>

<p align="center">
  <strong>Jezyk:</strong> Polski | <a href="./README.en.md">English</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-App%20Router-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-API-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D24.12.0-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-%3E%3D10.26.0-F69220?style=for-the-badge&logo=pnpm&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/docker-required-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img alt="Status" src="https://img.shields.io/badge/status-in%20development-2563EB?style=for-the-badge" />
</p>

<p align="center">
  <a href="#szybki-start">
    <img alt="Szybki start" src="https://img.shields.io/badge/Szybki%20start-1E40AF?style=flat-square" />
  </a>
  <a href="#architektura-w-skrocie">
    <img alt="Architektura" src="https://img.shields.io/badge/Architektura-0F766E?style=flat-square" />
  </a>
  <a href="#komendy">
    <img alt="Komendy" src="https://img.shields.io/badge/Komendy-7C3AED?style=flat-square" />
  </a>
  <a href="#bezpieczenstwo">
    <img alt="Bezpieczenstwo" src="https://img.shields.io/badge/Bezpieczenstwo-B91C1C?style=flat-square" />
  </a>
  <a href="#contributors">
    <img alt="Contributors" src="https://img.shields.io/badge/Contributors-374151?style=flat-square" />
  </a>
</p>

## Co to jest HSS?

**Harcerski System Stopni** to aplikacja wspierajaca proces pracy komisji stopni instruktorskich ZHR oraz komunikacje z harcerzami realizujacymi proby na stopnie instruktorskie. System cyfryzuje dokumentacje, umozliwia wczesniejsze zapoznanie sie z probami i usprawnia organizacje posiedzen komisji (sloty), skracajac czas obslugi pojedynczego harcerza.

## Najwazniejsze zalozenia

- Architektura stateless-first i gotowosc na skalowanie horyzontalne.
- RBAC egzekwowany po stronie API (frontend jest warstwa UX).
- Spojne kontrakty przez wspoldzielone schematy Zod.
- Security-by-default: walidacja wejscia, brak tokenow w `localStorage`, redakcja danych wrazliwych.

<a id="architektura-w-skrocie"></a>
## Architektura (w skrocie)

```mermaid
flowchart LR
  U[Uzytkownik] --> N[nginx TLS reverse proxy]
  N --> W[apps/web - Next.js SSR]
  N --> A[apps/api - NestJS]
  N --> K[Keycloak OIDC]
  A --> DB[(PostgreSQL)]
  A --> S3[(MinIO S3)]
```

## Struktura repozytorium

- `apps/web` - frontend Next.js (SSR + `next-intl`)
- `apps/api` - backend NestJS
- `packages/schemas` - wspoldzielone kontrakty Zod (source of truth)
- `packages/database` - Prisma schema, migracje i seed
- `docker` - lokalna infrastruktura (nginx, Keycloak, PostgreSQL, MinIO)
- `docs` - dokumentacja funkcjonalna i techniczna

## Wymagania lokalne

- Node.js `>= 24.12.0`
- pnpm `>= 10.26.0`
- Docker + Docker Compose

## Szybki start

### Opcja A: 1 komenda (cold start)

```bash
pnpm start:cold
```

### Opcja B: manualnie (zalecane przy pierwszym uruchomieniu)

1. Instalacja zaleznosci:
   ```bash
   pnpm install
   ```
2. Skopiowanie plikow `.env`:
   - `docker/.env.example` -> `docker/.env`
   - `apps/api/.env.example` -> `apps/api/.env`
   - `apps/web/.env.example` -> `apps/web/.env`
   - `packages/database/.env.example` -> `packages/database/.env`
3. Start infrastruktury:
   ```bash
   pnpm stack:up
   ```
4. Generacja i migracje bazy:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```
5. Start aplikacji:
   ```bash
   pnpm dev
   ```

### Lokalne endpointy (domyslne)

- `https://hss.local` - web
- `https://api.hss.local` - API
- `https://auth.hss.local` - Keycloak
- `https://authconsole.hss.local` - Keycloak Admin Console
- `https://s3.hss.local` - MinIO API
- `https://s3console.hss.local` - MinIO Console

## Komendy

| Cel | Komenda |
|---|---|
| Development | `pnpm dev` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Testy | `pnpm test` |
| Audit zaleznosci | `pnpm audit` |
| Start stacka | `pnpm stack:up` |
| Stop stacka | `pnpm stack:down` |

<a id="bezpieczenstwo"></a>
## Bezpieczenstwo

- Zglaszanie podatnosci: [SECURITY.md](./SECURITY.md)
- Zasady inzynieryjne i quality gates: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Kodeks postepowania: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Wersja angielska dokumentacji: [README.en.md](./README.en.md), [SECURITY.en.md](./SECURITY.en.md), [CONTRIBUTING.en.md](./CONTRIBUTING.en.md)
- Nigdy nie commituj sekretow (`.env`, tokeny, klucze, hasla).

## Dokumentacja

- Start projektu: [docs/91-START.pl.md](./docs/91-START.pl.md)
- Pelna lista: [docs](./docs)

## Contributors

<a href="https://github.com/Nikovsky/Harcerski-System-Stopni/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Nikovsky/Harcerski-System-Stopni" alt="Contributors" />
</a>

## Licencja

Projekt jest licencjonowany na **AGPL-3.0-only**. Szczegoly: [LICENSE](./LICENSE).
