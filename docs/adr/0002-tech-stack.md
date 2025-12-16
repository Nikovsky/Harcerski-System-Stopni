# ADR 0002: Stos technologiczny HSS

- Status: Accepted
- Data: 2025-12-16

## Kontekst
System przetwarza dane osobowe (RODO), wymaga RBAC, audytu, przechowywania plików oraz późniejszego generowania PDF/OCR.
Zespół chce użyć dojrzałych technologii enterprise, z dobrym ekosystemem i dokumentacją.
Priorytet: szybkość dostarczenia MVP bez utraty jakości (testy, migracje, obserwowalność, deploy).

## Decyzja
Przyjmujemy następujący stack:

Frontend:
- Next.js + TypeScript
- UI: shadcn/ui (lub MUI), forms: react-hook-form, walidacja: zod

Backend:
- NestJS + TypeScript
- OpenAPI/Swagger
- Walidacja DTO (class-validator lub zod adapter), guards/interceptors

Dane:
- PostgreSQL
- Prisma (migracje, typy, seed)

AuthN/AuthZ:
- Keycloak (OIDC)
- RBAC w aplikacji (role i polityki) + ownership checks

Pliki:
- S3-compatible storage: MinIO (self-host)
- presigned URLs (upload/download)

Async:
- Redis + BullMQ
- Worker Node.js (PDF/OCR/notifications)

PDF/OCR/Notifications (później):
- PDF: HTML template → Playwright w workerze
- OCR: provider interface (np. Tesseract jako implementacja)
- Email/SMS: event-driven z kolejki

Observability:
- logi strukturalne (np. pino)
- Sentry (FE/BE)
- requestId/correlationId; opcjonalnie OpenTelemetry

Deploy (start):
- Docker Compose
- Reverse proxy: Traefik/Nginx + TLS

## Alternatywy
1. Frontend: Vue/Nuxt / Angular
2. Backend: Fastify/Express bez Nest; Spring Boot; Django
3. ORM: TypeORM / MikroORM / Sequelize
4. Auth: własne JWT + baza haseł zamiast OIDC
5. Storage: lokalny FS zamiast S3; GCS/S3 managed
6. Async: RabbitMQ/Kafka zamiast Redis/BullMQ

## Konsekwencje
Pozytywne:
- Spójny TypeScript end-to-end, szybki development
- OIDC przez Keycloak: lepsze bezpieczeństwo i utrzymanie niż własne auth
- Prisma: szybkie iteracje + migracje + typy
- MinIO: kontrola nad danymi (RODO), brak publicznych URL
- BullMQ: prosty mechanizm jobów pod PDF/OCR/notifications

Negatywne / koszty:
- Keycloak wymaga konfiguracji i utrzymania (realm, klienci, role)
- Monorepo + TS wymaga standardów (lint/format/build) żeby uniknąć chaosu
- Redis/BullMQ: kolejny element infrastruktury (ale potrzebny pod PDF/OCR)
