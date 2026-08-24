#!/bin/sh
set -eu
umask 077

command -v openssl >/dev/null 2>&1 || { echo "openssl is required" >&2; exit 1; }
[ -f .env ] || cp .env.example .env
mkdir -p secrets

create_secret(){
  file="$1"
  command="$2"
  if [ ! -s "secrets/$file" ]; then
    sh -c "$command" > "secrets/$file"
    chmod 600 "secrets/$file"
  fi
}

create_secret postgres_bootstrap_password.txt "openssl rand -hex 32"
create_secret postgres_migration_password.txt "openssl rand -hex 32"
create_secret postgres_runtime_password.txt "openssl rand -hex 32"
create_secret data_encryption_key.txt "openssl rand -base64 32"
create_secret metrics_token.txt "openssl rand -hex 32"
create_secret initial_admin_password.txt "openssl rand -base64 24"

echo "Production files initialized."
echo "Edit $(pwd)/.env, then run: docker compose pull && docker compose up -d"
echo "Initial admin password: $(pwd)/secrets/initial_admin_password.txt"
