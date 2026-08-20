param([string]$OutputDirectory = (Join-Path $PSScriptRoot '..\backups'))
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$bundle = Join-Path $OutputDirectory "assetflow-$stamp"
$documents = Join-Path $bundle 'documents'
$remoteDump = "/tmp/assetflow-$stamp.dump"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is required.' }
New-Item -ItemType Directory -Force -Path $documents | Out-Null
Push-Location $root
try {
  & docker compose up -d postgres
  if ($LASTEXITCODE) { throw 'Cannot start PostgreSQL.' }
  $dumpCommand = "pg_dump -U `"`$POSTGRES_USER`" -d `"`$POSTGRES_DB`" --format=custom --no-owner --no-privileges --file='$remoteDump' && pg_restore --list '$remoteDump' >/dev/null"
  & docker compose exec -T postgres sh -ec $dumpCommand
  if ($LASTEXITCODE) { throw 'Database backup failed.' }
  & docker compose cp "postgres:$remoteDump" (Join-Path $bundle 'database.dump')
  if ($LASTEXITCODE) { throw 'Cannot copy database backup from the container.' }

  & docker compose create api | Out-Null
  if ($LASTEXITCODE) { throw 'Cannot create the API container for document backup.' }
  & docker compose cp 'api:/var/lib/assetflow/documents/.' $documents
  if ($LASTEXITCODE) { throw 'Cannot copy the document volume.' }

  $hash = (Get-FileHash (Join-Path $bundle 'database.dump') -Algorithm SHA256).Hash.ToLowerInvariant()
  @("assetflow_backup_version=1","created_at_utc=$stamp","database_format=postgresql_custom","database_sha256=$hash","documents_included=true") |
    Set-Content -Path (Join-Path $bundle 'manifest.txt') -Encoding utf8
  Write-Host "Backup completed: $bundle"
  Write-Host 'Keep .env and Docker secrets in a separate encrypted backup.'
} finally {
  & docker compose exec -T postgres rm -f $remoteDump 2>$null | Out-Null
  Pop-Location
}
