# Runtime

Router instalacji, uruchamiania i operacji lokalnych.

| Dokument | Zawartosc |
|---|---|
| [0301-node-pnpm-init.pl.md](./0301-node-pnpm-init.pl.md) | Przygotowanie Node.js i pnpm |
| [0302-next-init.pl.md](./0302-next-init.pl.md) | Instalacja Next.js |
| [0303-nest-init.pl.md](./0303-nest-init.pl.md) | Instalacja NestJS |
| [0304-nginx-init.pl.md](./0304-nginx-init.pl.md) | Certyfikaty i nginx |
| [0305-keycloak-init.pl.md](./0305-keycloak-init.pl.md) | Keycloak |
| [0306-minio-init.pl.md](./0306-minio-init.pl.md) | MinIO |
| [0307-docker-init.pl.md](./0307-docker-init.pl.md) | Docker |
| [0308-prisma-init.pl.md](./0308-prisma-init.pl.md) | Prisma |
| [0309-start.pl.md](./0309-start.pl.md) | Cold start, warm start, weryfikacja |

## Aktualny kontrakt runtime

- Repo jest pnpm workspace monorepo; Turbo nie jest czescia flow.
- `pnpm dev` nie startuje automatycznie stacka Docker. Stack uruchamiaj jawnie przez `pnpm stack:up`.
- Skrypty infrastruktury i czyszczenia sa Node/MJS:
  - `scripts/infra.mjs` obsluguje `pnpm stack:*`.
  - `scripts/clean.mjs` obsluguje `pnpm clean`, `pnpm clean:build`, `pnpm clean:deps`.
- Repo nie utrzymuje lokalnego Python `.venv`, `requirements.txt` ani `.pnpm-store`.
