#!/bin/sh
set -eu

runtime_user="${POSTGRES_RUNTIME_USER:-assetflow_runtime}"
runtime_password="$(cat /run/secrets/postgres_runtime_password)"
migration_user="${POSTGRES_MIGRATION_USER:-assetflow_migrator}"
migration_password="$(cat /run/secrets/postgres_migration_password)"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=migration_user="$migration_user" --set=migration_password="$migration_password" \
  --set=runtime_user="$runtime_user" --set=runtime_password="$runtime_password" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', :'migration_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'migration_user') \gexec
SELECT format('ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'migration_user', :'migration_password') \gexec
SELECT format('CREATE ROLE %I LOGIN', :'runtime_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'runtime_user') \gexec
SELECT format('ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'runtime_user', :'runtime_password') \gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', current_database(), :'migration_user') \gexec
SELECT format('ALTER SCHEMA public OWNER TO %I', :'migration_user') \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'runtime_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'runtime_user') \gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', :'runtime_user') \gexec
SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', :'runtime_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', :'migration_user', :'runtime_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', :'migration_user', :'runtime_user') \gexec
SQL
