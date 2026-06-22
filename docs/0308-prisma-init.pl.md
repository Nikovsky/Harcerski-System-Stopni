## Instalacja PRISMA

Aktualny stan repo:

- `packages/database` uzywa Prisma `7.8.0`.
- `@prisma/client` i `@prisma/adapter-pg` sa utrzymywane w wersji `^7.8.0`.
- Generowanie klienta uruchamiaj przez `pnpm db:generate`.

```powershell
mkdir packages/database
```
```powershell
pnpm -C .\packages\database\ init
```
```powershell
pnpm -C packages/database add -D prisma@latest
pnpm -C packages/database add -D typescript
pnpm -C packages/database add @prisma/client@latest pg dotenv
pnpm -C packages/database add -D tsx @prisma/adapter-pg pg
```
```powershell
# weryfikacja
pnpm -C packages/database exec -- prisma -v
```

```powershell
# prisma init schema
pnpm -C packages/database exec -- prisma init --datasource-provider postgresql
```
