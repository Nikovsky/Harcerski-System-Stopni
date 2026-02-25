## Instalacja NEST.JS
```powershell
if (Test-Path .\apps\api) { Remove-Item .\apps\api -Recurse -Force }
pnpm dlx @nestjs/cli@latest new apps/api --package-manager=pnpm --skip-git
pnpm -C apps/api add -D @nestjs/cli
```


## BIBLIOTEKI
```powershell
pnpm -C apps/api add @prisma/adapter-pg pg
pnpm -C apps/api add @nestjs/config
pnpm -C apps/api add zod
pnpm -C apps/api add -D @nestjs/cli
pnpm -C apps/api add @nestjs/passport passport passport-jwt jwks-rsa
pnpm -C apps/api add -D @types/passport-jwt
```


## MODUŁY
```powershell
# AUTH
pnpm -C apps/api nest g module modules/user
pnpm -C apps/api nest g controller modules/user --no-spec
pnpm -C apps/api nest g service modules/user --no-spec
nest g class modules/auth/auth.dto --flat
```


```powershell
pnpm --filter @hss/api nest g module modules/user
pnpm --filter @hss/api nest g controller modules/user --no-spec
pnpm --filter @hss/api nest g service modules/user --no-spec
```

```powershell
pnpm nest g module modules/user/profile
pnpm nest g controller modules/user/profile --no-spec
pnpm nest g service modules/user/profile --no-spec
```