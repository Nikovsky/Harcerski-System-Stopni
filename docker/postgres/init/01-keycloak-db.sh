#!/bin/sh
set -eu

: "${KC_DB_NAME:?KC_DB_NAME is required}"
: "${KC_DB_USER:?KC_DB_USER is required}"
: "${KC_DB_PASSWORD:?KC_DB_PASSWORD is required}"

echo "Init: ensuring Keycloak role/db exist (db=$KC_DB_NAME user=$KC_DB_USER)"

psql -v ON_ERROR_STOP=1 -X \
  --username "$POSTGRES_USER" \
  --dbname "postgres" \
  -v kc_db_name="$KC_DB_NAME" \
  -v kc_db_user="$KC_DB_USER" \
  -v kc_db_password="$KC_DB_PASSWORD" <<'SQL'

-- CREATE ROLE if not exists
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L;',
  :'kc_db_user',
  :'kc_db_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'kc_db_user'
)\gexec

-- CREATE DATABASE if not exists
SELECT format(
  'CREATE DATABASE %I OWNER %I;',
  :'kc_db_name',
  :'kc_db_user'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = :'kc_db_name'
)\gexec

GRANT ALL PRIVILEGES ON DATABASE :"kc_db_name" TO :"kc_db_user";
SQL
