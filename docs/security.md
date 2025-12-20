# Security, RODO, prywatność

## Zasady

- Minimalizacja danych: przechowujemy tylko to, co potrzebne do procesu komisji.
- Dostęp oparty o OIDC + RBAC + ownership checks.
- Załączniki: brak publicznych URL; tylko presigned URL o krótkim TTL.
- Audyt: statusy, pliki, decyzje, istotne zmiany danych.

## Reverse proxy / ekspozycja portów (staging/prod + opcjonalnie dev-proxy)

- Jeden publiczny punkt wejścia: reverse proxy (Nginx lub Traefik).
- Publicznie wystawiamy wyłącznie:
  - 80 (redirect do 443) oraz 443 (TLS)
- Wszystkie usługi infrastruktury nie mają publicznych portów:
  - Postgres, Redis, MinIO, Keycloak, Worker – tylko w sieci wewnętrznej Dockera.
- Reverse proxy dokleja i przekazuje nagłówki proxy:
  - `Host`, `X-Forwarded-Proto`, `X-Forwarded-For`
- Minimum polityk na wejściu:
  - rate limiting (szczególnie dla ścieżek logowania i `/api`)
  - limity upload (max body size) + sensowne timeouts
  - (opcjonalnie) deny-list dla paneli admin (np. MinIO console) lub wystawienie tylko w sieci prywatnej/VPN

## AuthN/AuthZ

- Keycloak (OIDC)
- Frontend (Next.js) obsługuje logowanie OIDC i sesję przez Auth.js (NextAuth).
- Backend weryfikuje: issuer, audience, podpis, jwks, expiry.
- Role mapowane na AppRole, kontrola w guardach.

## Pliki (MinIO/S3)

- Buckety prywatne.
- Upload: presigned PUT; download: presigned GET; generowane po autoryzacji.
- Logowanie zdarzeń upload/download w AuditLog (eventy).

## RODO

- Definicja ról i uprawnień: kto widzi jakie dane (kandydat vs kapituła).
- Retencja (do dopięcia): po X latach archiwizacja/usunięcie.
- Eksport danych (do dopięcia): wydanie kopii danych osoby.

## Observability

- requestId/correlationId w logach
- Sentry dla FE/BE
- opcjonalnie OpenTelemetry (później)

## Checklista Security (MVP)

- [ ] RBAC i ownership w API dla Trials/Meetings/Files
- [ ] Presigned URLs tylko po autoryzacji
- [ ] AuditLog dla status changes i operacji plikowych
- [ ] Sekrety tylko w env/secrets (brak w repo)
- [ ] Reverse proxy jako jedyny publiczny entrypoint (staging/prod)
- [ ] Brak publicznych portów DB/Redis/MinIO/Keycloak w staging/prod
- [ ] Rate limiting na logowaniu i `/api` (staging/prod)
- [ ] Limity upload + timeouts na reverse proxy (staging/prod)
