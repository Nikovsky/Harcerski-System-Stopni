## Instalacja PRISMA
```powershell
mkdir packages/database
```
```powershell
pnpm -C .\packages\database\ init
```
```powershell
pnpm -C packages/database add -D prisma@^7.0.0
pnpm -C packages/database add -D typescript
pnpm -C packages/database add @prisma/client@^7.0.0 pg dotenv
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