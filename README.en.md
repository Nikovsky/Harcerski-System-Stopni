<p align="center">
  <img src="./docs/assets/readme-logo.svg" alt="Harcerski System Stopni logo" width="132" />
</p>

<h1 align="center">Harcerski System Stopni (HSS)</h1>

<p align="center">
  Digital platform for ZHR instructor-rank workflows: documentation, commission process,
  auditability, and security by design.
</p>

<p align="center">
  <strong>Language:</strong> <a href="./README.md">Polski</a> | English
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
  <a href="#quick-start">
    <img alt="Quick start" src="https://img.shields.io/badge/Quick%20start-1E40AF?style=flat-square" />
  </a>
  <a href="#architecture-overview">
    <img alt="Architecture" src="https://img.shields.io/badge/Architecture-0F766E?style=flat-square" />
  </a>
  <a href="#commands">
    <img alt="Commands" src="https://img.shields.io/badge/Commands-7C3AED?style=flat-square" />
  </a>
  <a href="#security">
    <img alt="Security" src="https://img.shields.io/badge/Security-B91C1C?style=flat-square" />
  </a>
  <a href="#contributors">
    <img alt="Contributors" src="https://img.shields.io/badge/Contributors-374151?style=flat-square" />
  </a>
</p>

## What is HSS?

**Harcerski System Stopni** supports instructor-rank commissions and scouts running instructor-rank
trials. The system digitizes documentation, enables asynchronous review before meetings, and improves
meeting organization (slots), reducing per-candidate handling time.

## Core principles

- Stateless-first architecture and readiness for horizontal scaling.
- RBAC enforced at the API boundary (frontend checks are UX-only).
- Shared contracts via Zod schemas as source of truth.
- Security by default: boundary validation, no token storage in `localStorage`, and sensitive-data redaction.

<a id="architecture-overview"></a>
## Architecture overview

```mermaid
flowchart LR
  U[User] --> N[nginx TLS reverse proxy]
  N --> W[apps/web - Next.js SSR]
  N --> A[apps/api - NestJS]
  N --> K[Keycloak OIDC]
  A --> DB[(PostgreSQL)]
  A --> S3[(MinIO S3)]
```

## Repository structure

- `apps/web` - Next.js frontend (SSR + `next-intl`)
- `apps/api` - NestJS backend
- `packages/schemas` - shared Zod contracts (source of truth)
- `packages/database` - Prisma schema, migrations, and seed
- `docker` - local infrastructure (nginx, Keycloak, PostgreSQL, MinIO)
- `docs` - functional and technical documentation

## Local requirements

- Node.js `>= 24.12.0`
- pnpm `>= 10.26.0`
- Docker + Docker Compose

## Quick start

### Option A: one command (cold start)

```bash
pnpm start:cold
```

### Option B: manual (recommended for first run)

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy `.env` files:
   - `docker/.env.example` -> `docker/.env`
   - `apps/api/.env.example` -> `apps/api/.env`
   - `apps/web/.env.example` -> `apps/web/.env`
   - `packages/database/.env.example` -> `packages/database/.env`
3. Start infrastructure:
   ```bash
   pnpm stack:up
   ```
4. Generate and migrate database:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```
5. Start applications:
   ```bash
   pnpm dev
   ```

### Local endpoints (default)

- `https://hss.local` - web
- `https://api.hss.local` - API
- `https://auth.hss.local` - Keycloak
- `https://authconsole.hss.local` - Keycloak Admin Console
- `https://s3.hss.local` - MinIO API
- `https://s3console.hss.local` - MinIO Console

## Commands

| Goal | Command |
|---|---|
| Development | `pnpm dev` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Tests | `pnpm test` |
| Dependency audit | `pnpm audit` |
| Start stack | `pnpm stack:up` |
| Stop stack | `pnpm stack:down` |

<a id="security"></a>
## Security

- Vulnerability reporting: [SECURITY.en.md](./SECURITY.en.md)
- Engineering rules and quality gates: [CONTRIBUTING.en.md](./CONTRIBUTING.en.md)
- Code of Conduct: [CODE_OF_CONDUCT.en.md](./CODE_OF_CONDUCT.en.md)
- Never commit secrets (`.env`, tokens, keys, passwords).

## Documentation

- Project start: [docs/91-START.pl.md](./docs/91-START.pl.md)
- Full list: [docs](./docs)

## Contributors

<a href="https://github.com/Nikovsky/Harcerski-System-Stopni/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Nikovsky/Harcerski-System-Stopni" alt="Contributors" />
</a>

## License

This project is licensed under **AGPL-3.0-only**. See [LICENSE](./LICENSE).
