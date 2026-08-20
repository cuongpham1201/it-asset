param(
  [Parameter(Mandatory = $true)][string]$BackupPath,
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$bundle = (Resolve-Path $BackupPath).Path
$dump = Join-Path $bundle 'database.dump'
$documents = Join-Path $bundle 'documents'
$remoteDump = "/tmp/assetflow-restore-$PID.dump"

if (-not (Test-Path -LiteralPath $dump -PathType Leaf)) { throw "database.dump was not found in $bundle" }
$manifest = Join-Path $bundle 'manifest.txt'
if (Test-Path -LiteralPath $manifest -PathType Leaf) {
  $expected = (Get-Content -LiteralPath $manifest | Where-Object { $_ -like 'database_sha256=*' } | Select-Object -First 1) -replace '^database_sha256=', ''
  $actual = (Get-FileHash -LiteralPath $dump -Algorithm SHA256).Hash.ToLowerInvariant()
  if (-not $expected -or $actual -ne $expected.Trim().ToLowerInvariant()) { throw 'Backup checksum verification failed.' }
}
if (-not $Force) {
  $answer = Read-Host 'Restore replaces the current AssetFlow database. Type RESTORE to continue'
  if ($answer -cne 'RESTORE') { Write-Host 'Cancelled.'; exit 1 }
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is required.' }

Push-Location $root
$restored = $false
try {
  & docker compose up -d postgres
  if ($LASTEXITCODE) { throw 'Cannot start PostgreSQL.' }
  & docker compose stop api web 2>$null | Out-Null
  & docker compose cp $dump "postgres:$remoteDump"
  if ($LASTEXITCODE) { throw 'Cannot copy backup into the PostgreSQL container.' }
  $restoreCommand = "pg_restore --list '$remoteDump' >/dev/null && pg_restore -U `"`$POSTGRES_USER`" -d `"`$POSTGRES_DB`" --clean --if-exists --no-owner --no-privileges --exit-on-error '$remoteDump'"
  & docker compose exec -T postgres sh -ec $restoreCommand
  if ($LASTEXITCODE) { throw 'Database restore failed. API and web remain stopped.' }

  if (Test-Path -LiteralPath $documents -PathType Container) {
    & docker compose run --rm --no-deps --entrypoint sh api -ec 'find /var/lib/assetflow/documents -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +'
    if ($LASTEXITCODE) { throw 'Cannot clear the document volume before restore.' }
    & docker compose create api | Out-Null
    & docker compose cp "$documents\." 'api:/var/lib/assetflow/documents'
    if ($LASTEXITCODE) { throw 'Database restored, but document restore failed.' }
  }
  $restored = $true
} finally {
  & docker compose exec -T postgres rm -f $remoteDump 2>$null | Out-Null
  if ($restored) {
    & docker compose up -d
    & docker compose ps
  }
  Pop-Location
}
Write-Host 'Restore completed. Verify login, asset counts, attachments and audit history.'
