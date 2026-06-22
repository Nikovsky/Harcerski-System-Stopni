## Przygotowanie środowiska Node.js + PNPM
1. Instalacja node.js
[Node.js](https://nodejs.org/en/download)

1. Pobranie `pnpm` i instalacja
```powershell
corepack enable pnpm
```

3. Weryfikacja
```powershell
node -v
# v24.12.0
pnpm -v
# 11.8.0
```

## Inicializacja monorepo
1. utworzenie repo i initializacja pnpm
```powershell
# cd ./hss
pnpm init
```

2. dodanie pnpm workspace: `pnpm-workspace.yaml`

## Utworzenie folderu `apps`
```powershell
mkdir apps
```

## [NEXT.JS](./0302-next-init.pl.md)

## [NEST.JS](./0303-nest-init.pl.md)

## Utworzenie folderu `packages`
```powershell
mkdir packages
```

## [PRISMA](./0308-prisma-init.pl.md)

## SCHEMAS
```powershell
mkdir packages\schemas
pnpm -C packages/schemas init
pnpm -C packages/schemas add -D typescript
pnpm -C packages/schemas add zod
```
```powershell
pnpm -C apps/api add @hss/schemas@workspace:*
pnpm -C apps/web add @hss/schemas@workspace:*
```

## Weryfikacja workspace:
```powershell
pnpm -r list --depth -1
```
