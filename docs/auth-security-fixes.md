# Auth Security Audit & Fixes

Audyt bezpieczenstwa flow: **Next.js (Auth.js v5) → Keycloak → NestJS (Passport JWT)**

---

## Zidentyfikowane problemy

### P0 — Krytyczne

| # | Problem | Ryzyko |
|---|---------|--------|
| 1 | **Brak token refresh** — access_token wygasa po ~5 min, sesja Auth.js trwa 30 dni → "sesja zombie" z wygaslym tokenem | Uzytkownik traci dostep do API po 5 min bez przeladowania |
| 2 | **Brak walidacji audience w JWT strategy** — kazdy token z tego samego realmu akceptowany, nawet z innego clienta | Token z innej aplikacji w tym samym realmie moze uzyskac dostep do API |
| 3 | **Identyczne sekrety** — AUTH_SECRET, AUTH_KEYCLOAK_SECRET, HSS_WEB_CLIENT_SECRET, HSS_API_CLIENT_SECRET ustawione na ta sama wartosc | Wyciek jednego sekretu kompromituje caly system |

### P1 — Wazne

| # | Problem | Ryzyko |
|---|---------|--------|
| 4 | **Brak session callback** — klient nie wie, ze refresh zawiodl | Frontend nie moze reagowac na wygasla sesje (np. redirect do logowania) |
| 5 | **CORS zepsuty** — `CORS_ORIGIN=https://hss.local,http://localhost:3000` traktowane jako jeden string | Requesty z `localhost:3000` odrzucane przez CORS |
| 6 | **Brak proxy_buffer_size w auth.hss.local** — Keycloak response headers > domyslne 4k/8k bufory NGINX | 502 Bad Gateway po zalogowaniu |

### P2 — Dobre praktyki

| # | Problem | Ryzyko |
|---|---------|--------|
| 7 | **AppConfigModule nie zaimportowany** w AppModule | Walidacja env schema nie dziala — bledne zmienne wykryte dopiero w runtime |
| 8 | **PrismaModule w providers zamiast imports** w AppModule | Modul nie jest poprawnie inicjalizowany przez NestJS DI |

---

## Zastosowane poprawki

### Fix #1 — Token refresh + session callback

**Plik:** `apps/web/src/auth.ts`

**Problem:** Auth.js przechowywał access_token z pierwszego logowania i nigdy go nie odswiezal. Po ~5 min token wygasal, a sesja Auth.js (30 dni) nadal go uzywala.

**Rozwiazanie:**
- Dodano funkcje `refreshAccessToken()` — silent refresh via Keycloak token endpoint (`/protocol/openid-connect/token`)
- JWT callback rozdzielony na 3 sciezki:
  1. **Pierwsze logowanie** (`account` obecny) → zapisz access_token, refresh_token, id_token, expires_at
  2. **Token wazny** (z 60s marginesem) → passthrough
  3. **Token wygasly/wygasa** → `refreshAccessToken()`
- Dodano session callback — propaguje `error: "RefreshTokenExpired"` do sesji klienta
- Dodano `user.id` (sub) do sesji

**Flow po poprawce:**
```
Klient → Auth.js session check
  → JWT callback sprawdza accessTokenExpiresAt
    → wazny: zwroc token
    → wygasly: POST /protocol/openid-connect/token z refresh_token
      → sukces: nowy access_token + refresh_token
      → blad: error = "RefreshTokenExpired" → klient widzi blad w sesji
```

---

### Fix #2 — Audience validation

**Plik:** `apps/api/src/strategies/keycloak-jwt.strategy.ts`

**Problem:** Passport JWT weryfikowal issuer i podpis (JWKS), ale nie audience. Token wydany dla innego clienta w tym samym realmie bylby zaakceptowany.

**Rozwiazanie:** Dodano `audience: process.env.KEYCLOAK_AUDIENCE` do konstruktora Strategy. Teraz tokeny bez prawidlowego audience sa odrzucane na poziomie weryfikacji JWT (zanim trafią do `validate()`).

---

### Fix #3 — Rozdzielenie sekretow

**Pliki:** `apps/web/.env.local`, `apps/web/.env.example`, `docker/.env`

**Problem:** Wszystkie sekrety (AUTH_SECRET, client secrets) mialy ta sama wartosc. Wyciek jednego = wyciek wszystkich.

**Rozwiazanie:** Kazdy sekret ma unikalna wartosc:
- `AUTH_SECRET` — sekret sesji Auth.js (do podpisu JWT sesyjnego)
- `AUTH_KEYCLOAK_SECRET` (web) = `KEYCLOAK_HSS_WEB_CLIENT_SECRET` (docker) — client secret dla frontend OIDC
- `KEYCLOAK_HSS_API_CLIENT_SECRET` — osobny client secret dla API

**Wazne:** `AUTH_KEYCLOAK_SECRET` w `apps/web/.env.local` MUSI odpowiadac `KEYCLOAK_HSS_WEB_CLIENT_SECRET` w `docker/.env` — oba dotycza tego samego clienta Keycloak.

---

### Fix #4 — CORS split

**Plik:** `apps/api/src/config/app-config.service.ts`

**Problem:** Getter `corsOrigins` brakal fallbacku z `CORS_ORIGIN` (string) jako single item. Wartosc `"https://hss.local,http://localhost:3000"` traktowana jako jeden origin.

**Rozwiazanie:** Fallback teraz splituje po przecinku:
```typescript
return single
  ? single.split(",").map((s: string) => s.trim()).filter(Boolean)
  : [];
```

---

### Fix #5 — NGINX proxy_buffer_size

**Plik:** `docker/nginx/nginx.dev.conf`

**Problem:** Keycloak zwraca duze response headers (session cookies, OIDC redirects) ktore przekraczaja domyslne bufory NGINX (4k/8k). Skutek: `upstream sent too big header` → **502 Bad Gateway** po zalogowaniu.

**Rozwiazanie:** Dodano do blokow `auth.hss.local` i `authconsole.hss.local`:
```nginx
proxy_buffer_size          16k;
proxy_buffers              4 16k;
proxy_busy_buffers_size    24k;
```

---

### Fix #6 — AppModule cleanup

**Plik:** `apps/api/src/app.module.ts`

**Problemy:**
1. `AppConfigModule` nie bylo zaimportowane — walidacja env schema nie dzialala
2. `PrismaModule` w tablicy `providers` zamiast tylko w `imports`

**Rozwiazanie:**
- Dodano `AppConfigModule` do `imports`
- Usunięto `PrismaModule` z `providers` (zostaje w `imports`)

---

## Zmienione pliki — podsumowanie

| Plik | Zmiana |
|------|--------|
| `apps/web/src/auth.ts` | Token refresh, session callback, typy JWT/Session |
| `apps/api/src/strategies/keycloak-jwt.strategy.ts` | Audience validation |
| `apps/web/.env.local` | Unikalne sekrety (dev) |
| `apps/web/.env.example` | Zaktualizowane placeholdery |
| `docker/.env` | Rozdzielone client secrets |
| `apps/api/src/config/app-config.service.ts` | CORS split po przecinku |
| `docker/nginx/nginx.dev.conf` | proxy_buffer_size dla Keycloak |
| `apps/api/src/app.module.ts` | AppConfigModule import, PrismaModule fix |

---

## Checklist po wdrozeniu

- [ ] Zrestartowac Docker stack (`pnpm stack:down && pnpm stack:up`) — NGINX config zmieniony
- [ ] Zweryfikowac, ze sekrety w `apps/web/.env.local` i `docker/.env` sa zsynchronizowane
- [ ] Przetestowac logowanie: zaloguj sie → poczekaj >5 min → wykonaj request do API → powinien dzialac (token refresh)
- [ ] Przetestowac 502: zalogowanie nie powinno juz zwracac 502 Bad Gateway
- [ ] Przetestowac CORS: request z `localhost:3000` powinien byc akceptowany
- [ ] Na produkcji: wygenerowac silne, unikalne sekrety (nie uzywac wartosci dev!)
