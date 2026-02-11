# Stan pracy: Audyt i naprawa Auth Flow (Next.js → Keycloak → NestJS)

## Kontekst zadania

Uzytkownik poprosil o:
1. Audyt bezpieczenstwa tokenow
2. Weryfikacje flow next-keycloak-nest
3. Rozwiazanie problemu 502 po zalogowaniu (za duze headery Keycloak)
4. Naprawe wszystkich znalezionych problemow (P0, P1, P2)
5. Stworzenie dokumentacji w `docs/auth-security-fixes.md`

## Zidentyfikowane problemy

### P0 (Krytyczne)
1. **Brak token refresh** — access_token wygasa po ~5min, sesja Auth.js trwa 30 dni = sesja zombie
2. **Brak walidacji audience w JWT strategy** — kazdy token z realmu akceptowany, nawet z innego clienta
3. **Identyczne sekrety** — AUTH_SECRET, AUTH_KEYCLOAK_SECRET, HSS_WEB_CLIENT_SECRET, HSS_API_CLIENT_SECRET = ta sama wartosc

### P1 (Wazne)
4. **Session callback brak** — klient nie wie o bledach refresh (naprawione razem z P0-1)
5. **CORS zepsuty** — `CORS_ORIGIN=https://hss.local,http://localhost:3000` traktowane jako jeden string, nie dwa originy
6. **proxy_buffer_size brak w auth.hss.local** — root cause 502: Keycloak response headers > domyslne 4k/8k bufory NGINX

### P2 (Dobre praktyki)
7. **AppConfigModule nie zaimportowany** w AppModule — walidacja env schema nie dziala
8. **PrismaModule w providers** zamiast tylko w imports w AppModule

---

## Co zostalo ZROBIONE

### TASK #1 [COMPLETED] — Token refresh + session callback
**Plik:** `apps/web/src/auth.ts`
**Zmiany:**
- Dodano `refreshToken` do deklaracji typu JWT
- Dodano `error?: "RefreshTokenExpired"` do JWT i Session
- Dodano funkcje `refreshAccessToken()` — silent refresh via Keycloak token endpoint
- JWT callback: 3 sciezki: (1) initial login → zapisz wszystko, (2) token wazny → passthrough, (3) token wygasa → refresh
- Dodano `session` callback — propaguje `error` i `user.id` do sesji klienta
- Usunieto `(account as any)` casty — uzyto `account.access_token as string | undefined`
- 60s safety margin przed wygasnieciem tokena

### TASK #2 [COMPLETED] — Audience validation
**Plik:** `apps/api/src/strategies/keycloak-jwt.strategy.ts`
**Zmiana:** Dodano `audience: process.env.KEYCLOAK_AUDIENCE` do konstruktora passport-jwt Strategy.
Teraz tokeny bez prawidlowego audience sa odrzucane na poziomie weryfikacji JWT, nie dopiero w RolesGuard.

### TASK #3 [IN PROGRESS] — Rozdzielenie sekretow
**Pliki zmienione:**
- `apps/web/.env.local`:
  - `AUTH_SECRET` zmieniony na `"hss-dev-authjs-secret-DO-NOT-USE-IN-PROD-0001"`
  - `AUTH_KEYCLOAK_SECRET` zmieniony na `"hss-dev-kc-web-secret-DO-NOT-USE-IN-PROD-0002"`
- `apps/web/.env.example`:
  - Placeholdery zaktualizowane z jasnymi nazwami
- `docker/.env`:
  - `KEYCLOAK_HSS_WEB_CLIENT_SECRET` zmieniony na `hss-dev-kc-web-secret-DO-NOT-USE-IN-PROD-0002`
  - `KEYCLOAK_HSS_API_CLIENT_SECRET` zmieniony na `hss-dev-kc-api-secret-DO-NOT-USE-IN-PROD-0003`

**WAZNE:** `AUTH_KEYCLOAK_SECRET` w `apps/web/.env.local` MUSI odpowiadac `KEYCLOAK_HSS_WEB_CLIENT_SECRET` w `docker/.env` — oba to `hss-dev-kc-web-secret-DO-NOT-USE-IN-PROD-0002`. Sa zsynchronizowane.

**CO JESZCZE TRZEBA dla Task #3:**
- Task jest w zasadzie gotowy, trzeba tylko oznaczyc jako completed.

---

## Co POZOSTALO do zrobienia

### TASK #4 [PENDING] — CORS fix
**Plik do edycji:** `apps/api/src/config/app-config.service.ts`
**Zmiana:** W getterze `corsOrigins`, fallback na `CORS_ORIGIN` musi splitowac po przecinku:
```typescript
get corsOrigins(): string[] {
  const list = this.cfg.get("CORS_ORIGINS");
  if (list?.length) return list;

  const single = this.cfg.get("CORS_ORIGIN");
  return single
    ? single.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];
}
```

**Opcjonalnie:** Zmienic w `apps/api/.env` z `CORS_ORIGIN=...` na `CORS_ORIGINS=...` (schemat juz obsluguje CSV via `toCsv`).

### TASK #5 [PENDING] — NGINX proxy_buffer_size
**Plik do edycji:** `docker/nginx/nginx.dev.conf`
**Zmiana:** W bloku `auth.hss.local` (linia ~241, `location /`), dodac PRZED `proxy_redirect off;`:
```nginx
    # Keycloak response headers (session cookies, OIDC redirects) can exceed default 4k/8k.
    # Without this: "upstream sent too big header" → 502 Bad Gateway.
    proxy_buffer_size          16k;
    proxy_buffers              4 16k;
    proxy_busy_buffers_size    24k;
```
**Rowniez** w bloku `authconsole.hss.local` (linia ~303, `location /`) — te same dyrektywy.

### TASK #6 [PENDING] — AppModule cleanup + ConfigModule
**Plik do edycji:** `apps/api/src/app.module.ts`
**Zmiany:**
1. Dodac import `AppConfigModule` z `'./config/app-config.module'`
2. Dodac `AppConfigModule` do tablicy `imports`
3. Usunac `PrismaModule` z tablicy `providers` (zostaje tylko w `imports`)

Docelowy plik:
```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppConfigModule } from './config/app-config.module';

@Module({
  imports: [AppConfigModule, PrismaModule, UserModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
```

### TASK #7 [BLOCKED] — Dokumentacja
**Plik do stworzenia:** `docs/auth-security-fixes.md`
Zablokowany przez taski #3-#6. Po ich zakonczeniu, opisac:
- Co bylo zle i dlaczego
- Co zmieniono
- Jak dziala poprawiony flow z przykladem

---

## Kluczowe pliki projektu (auth)

| Plik | Rola |
|------|------|
| `apps/web/src/auth.ts` | NextAuth v5 config, JWT callbacks, token refresh |
| `apps/web/src/app/api/auth/[...nextauth]/route.ts` | NextAuth route handler |
| `apps/web/src/app/api/auth/logout/route.ts` | Custom 2-stage logout (Keycloak SSO + local) |
| `apps/web/src/app/api/backend/[...path]/route.ts` | BFF proxy — JWT cookie → Bearer token |
| `apps/api/src/strategies/keycloak-jwt.strategy.ts` | Passport JWT strategy (JWKS + RS256) |
| `apps/api/src/guards/jwt-auth.guard.ts` | Auth guard |
| `apps/api/src/guards/roles.guard.ts` | RBAC guard (realm + client roles) |
| `apps/api/src/modules/auth/auth.module.ts` | Auth module (global) |
| `apps/api/src/config/app-config.module.ts` | ConfigModule.forRoot() + env validation |
| `apps/api/src/config/app-config.service.ts` | Typed config getters |
| `apps/api/src/config/env.schema.ts` | Zod env validation schema |
| `apps/api/src/app.module.ts` | Root NestJS module |
| `docker/nginx/nginx.dev.conf` | NGINX reverse proxy config |
| `docker/.env` | Docker stack env vars |
| `apps/web/.env.local` | Web dev env vars |
| `apps/api/.env` | API dev env vars |
