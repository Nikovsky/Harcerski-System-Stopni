# Security, RODO, prywatność

## Zasady
- Minimalizacja danych: przechowujemy tylko to, co potrzebne do procesu komisji.
- Dostęp oparty o OIDC + RBAC + ownership checks.
- Załączniki: brak publicznych URL; tylko presigned URL o krótkim TTL.
- Audyt: statusy, pliki, decyzje, istotne zmiany danych.

## AuthN/AuthZ
- Keycloak (OIDC)
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
