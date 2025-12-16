# Następne kroki (kolejność wdrażania)

1) Init monorepo + standardy (pnpm workspaces)
2) Docker Compose (Postgres/Redis/MinIO/Keycloak)
3) apps/api (NestJS) + Prisma init
4) schema.prisma + migrate + seed (roles + template przewodnika)
5) Auth: weryfikacja tokenów + RBAC guards
6) Minimalne endpointy:
   - POST /trials (DRAFT + requirements from template)
   - PATCH /trials/:id/form (payload + sync unit*)
   - PATCH /trials/:id/requirements/:reqId
   - POST /files/presign-upload, /files/presign-download
7) Frontend:
   - logowanie + widok “moja próba” (DRAFT) + edycja wymagań
8) Panel kapituły: lista + filtry + status transitions + komentarze
9) Meetings: CRUD + zapisy z limitem
10) Observability: requestId + Sentry
