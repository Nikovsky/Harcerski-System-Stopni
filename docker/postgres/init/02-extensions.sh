#!/bin/sh
set -eu

echo "Init: enabling extensions in app db ($POSTGRES_DB)"
psql -v ON_ERROR_STOP=1 -X \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SQL

# Optional: also enable it for Keycloak db (runs after 01-keycloak-db.sh)
if [ -n "${KC_DB_NAME:-}" ]; then
  echo "Init: enabling extensions in keycloak db ($KC_DB_NAME)"
  psql -v ON_ERROR_STOP=1 -X \
    --username "$POSTGRES_USER" \
    --dbname "$KC_DB_NAME" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SQL
fi