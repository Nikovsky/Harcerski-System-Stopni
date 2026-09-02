# Uwierzytelnianie — Better Auth BFF i Keycloak

## 1. Status i zakres

Ten dokument opisuje aktualnie zaimplementowany kontrakt uwierzytelniania. Zastępuje wcześniejszy model, w którym Web samodzielnie zarządzał tokenami OIDC. Dokument `0206-auth-security-fixes.md` pozostaje historią wcześniejszego audytu, a nie opisem bieżącego przepływu.

Aktualny stos:

- Better Auth `1.7.2` działa w `apps/api`.
- Keycloak pozostaje źródłem tożsamości, ról i tokenów OIDC.
- Web działa jako BFF i nie ma zależności od Prisma, PostgreSQL ani `DATABASE_URL`.
- API używa Prisma/PostgreSQL dla technicznych danych Better Auth oraz Redis dla sesji, polityki czasu życia, blokady odświeżania i rate limitingu.
- Web używa Redis bezpośrednio wyłącznie dla rozproszonych limitów tras BFF.

## 2. Granice odpowiedzialności

### Przeglądarka

- Korzysta wyłącznie z publicznego originu `https://hss.local` dla tras aplikacji i BFF.
- Otrzymuje cookie sesyjne `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- Nie otrzymuje tokenów OAuth do przechowywania w `localStorage`.

### Web BFF (`apps/web`)

- Wystawia publiczne trasy `/api/auth/*`, `/api/session/*` oraz proxy `/api/backend/*`.
- Proxy’uje operacje logowania i sesji do API, przekazując `x-hss-bff-secret`.
- Ustawia zaufany `Origin` na `HSS_WEB_ORIGIN`; jest to wymagane także przy walidacji CSRF Better Auth.
- Dla chronionych wywołań domenowych pobiera aktualną sesję i przekazuje token Keycloak jako `Authorization: Bearer`.
- Nie może przekazywać do auth API przychodzącego nagłówka `Authorization` ani ufać originowi podanemu przez klienta.

### API (`apps/api`)

- Hostuje Better Auth pod `/api/auth`.
- Chroni `/internal/bff/auth/*` współdzielonym sekretem BFF, mimo że trasy omijają globalny JWT guard.
- Pobiera i odświeża access token Keycloak po stronie serwera.
- Serializuje współbieżne odświeżenia tokenu rozproszoną blokadą Redis.
- Dla endpointów domenowych waliduje JWT Keycloak przez issuer, JWKS, audience i role, a następnie egzekwuje RBAC oraz owner-checks.

### Keycloak

- Realizuje logowanie użytkownika i wystawia tokeny.
- Jest źródłem `sub`, mapowanego na `keycloakUuid`, oraz ról aplikacyjnych.
- Pozostaje źródłem prawdy dla tożsamości; Better Auth nie zastępuje domenowego modelu użytkownika.

## 3. Przepływy

### Logowanie

1. Przeglądarka wysyła żądanie do `/api/auth/login` w Web.
2. Web BFF wywołuje Better Auth w API z sekretem BFF i zaufanym originem.
3. Better Auth rozpoczyna Authorization Code Flow z PKCE przez Keycloak.
4. Callback wraca przez publiczny origin Web i jest proxy’owany do Better Auth.
5. API wiąże konto Keycloak z technicznym użytkownikiem Better Auth i ustanawia sesję.

### Wywołanie chronionego API

1. Przeglądarka wywołuje `/api/backend/*` w Web.
2. Web sprawdza host, CSRF i rozproszony limit żądań.
3. Web pobiera sesję przez `/internal/bff/auth/session`.
4. API pobiera lub odświeża access token Keycloak.
5. Web przekazuje żądanie do domenowego API z tokenem bearer.
6. API waliduje token i wykonuje kontrolę dostępu.

### Wylogowanie

- Wylogowanie ręczne i po przekroczeniu idle timeout korzystają z tego samego mechanizmu nawigacji.
- Żądanie musi być natywnym, najwyższego poziomu formularzem `POST`; wywołanie przez `fetch` nie może śledzić przekierowania end-session Keycloak z powodu CORS.
- Web akceptuje zgodny niepusty `Origin`, następnie zgodny `Referer`, albo nawigację dokumentu same-origin potwierdzoną przez Fetch Metadata.
- Jawnie obcy origin jest odrzucany.
- Po zakończeniu sesji odpowiedź używa przekierowania `303`.

## 4. Sesja i dane

### Modele tożsamości

- Domena używa `User.keycloakUuid` jako klucza tożsamości i relacji.
- Modele techniczne są rozdzielone: `AuthUser`, `AuthAccount`, `AuthSession`, `AuthVerification`.
- Konto OAuth jest identyfikowane przez issuer i identyfikator konta; dla Keycloak identyfikatorem jest `sub`.
- Pola `keycloakUuid`, `givenName` i `familyName` mogą być przyjęte wyłącznie podczas zweryfikowanego callbacku Keycloak.

### Wymagane nazwy relacji Prisma

Adapter Prisma Better Auth wyprowadza nazwy relacji z niestandardowych nazw modeli. Należy zachować dokładnie:

- `AuthAccount.authuser`
- `AuthSession.authuser`
- `AuthUser.authaccounts`
- `AuthUser.authsessions`

### Skalowanie poziome

- Sesja, polityka idle/absolute timeout, blokada refresh oraz rate limiting nie mogą zależeć od pamięci procesu.
- Wiele instancji Web i API musi korzystać ze wspólnego Redis.
- Brak Redis dla chronionych tras BFF oznacza bezpieczne odrzucenie żądania, nie pominięcie kontroli.

## 5. Konfiguracja i sekrety

API jest właścicielem:

- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `AUTH_KEYCLOAK_ID`, `AUTH_KEYCLOAK_SECRET`
- parametrów sesji Better Auth i połączenia Redis
- konfiguracji issuer/JWKS/audience Keycloak

Web jest właścicielem:

- `HSS_WEB_ORIGIN`, `HSS_API_BASE_URL`
- kopii `HSS_BFF_INTERNAL_SECRET`
- nazwy cookie oraz limitów BFF
- połączenia Redis używanego przez rate limiting Web

`HSS_BFF_INTERNAL_SECRET` musi mieć tę samą wartość w Web i API. Jego wartości nie wolno zapisywać w repozytorium, dokumentacji ani logach.

Publiczne adresy lokalne:

- Web: `https://hss.local`
- API: `https://api.hss.local`
- Keycloak: `https://auth.hss.local`
- Keycloak Admin: `https://authconsole.hss.local`

## 6. Kontrole bezpieczeństwa

- RBAC i owner-checks są wykonywane w API; kontrole klienta służą wyłącznie UX.
- Mutacje BFF wymagają kontroli same-origin/CSRF.
- Sekret BFF nie zastępuje JWT użytkownika na endpointach domenowych.
- OAuth state i authorization code są jednorazowe; callbacku nie wolno ponawiać ze starym URL.
- Logi nie mogą zawierać cookie, tokenów, sekretu BFF ani danych osobowych.
- Błędy auth nie mogą ujawniać szczegółów dostawcy ani wewnętrznych wyjątków.

## 7. Referencje implementacyjne

- `apps/api/src/modules/auth/better-auth.provider.ts`
- `apps/api/src/modules/auth/better-auth.service.ts`
- `apps/api/src/modules/auth/bff-auth.controller.ts`
- `apps/web/src/server/auth-api.client.ts`
- `apps/web/src/app/api/auth/[...all]/route.ts`
- `apps/web/src/app/api/backend/[...path]/route.ts`
- `apps/web/src/app/api/auth/logout/route.ts`
- `packages/database/prisma/schema.prisma`
