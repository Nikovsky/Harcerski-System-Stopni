## Instalacja NEST.JS
```powershell
if (Test-Path .\apps\api) { Remove-Item .\apps\api -Recurse -Force }
pnpm dlx @nestjs/cli@latest new apps/api --package-manager=pnpm --skip-git
pnpm -C apps/api add -D @nestjs/cli
```