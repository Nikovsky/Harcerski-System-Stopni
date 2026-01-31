## Instalacja NEXT.JS
```powershell
if (Test-Path .\apps\web) { Remove-Item .\apps\web -Recurse -Force }
pnpm dlx create-next-app@latest apps/web
# Would you like to use the recommended Next.js defaults? » No, customize settings
# Would you like to use TypeScript? ...  Yes
# Which linter would you like to use? » ESLint
# Would you like to use React Compiler? ... No
# Would you like to use Tailwind CSS? ...Yes
# Would you like your code inside a `src/` directory? ...  Yes
# Would you like to use App Router? (recommended) ...  Yes
# Would you like to customize the import alias (`@/*` by default)? ... Yes
# What import alias would you like configured? ... @/*
```