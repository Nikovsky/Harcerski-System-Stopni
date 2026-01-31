#!/bin/sh
set -eu

: "${KC_DB_NAME:?KC_DB_NAME is required}"
: "${KC_DB_USER:?KC_DB_USER is required}"

echo "Init: ensuring schema privileges in Keycloak DB (db=$KC_DB_NAME user=$KC_DB_USER)"

psql -v ON_ERROR_STOP=1 -X \
  --username "$POSTGRES_USER" \
  --dbname "$KC_DB_NAME" <<SQL
ALTER SCHEMA public OWNER TO "$KC_DB_USER";
GRANT USAGE, CREATE ON SCHEMA public TO "$KC_DB_USER";
SQL