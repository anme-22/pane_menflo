# ============================================================================
# Restauración de un respaldo en la base de PRODUCCIÓN en Windows (PowerShell).
# Reemplaza los datos actuales (--clean --if-exists).
#
# Uso:   powershell -ExecutionPolicy Bypass -File scripts\restore.ps1 backups\pane_XXXX.dump
# ============================================================================
param(
  [Parameter(Mandatory = $true)]
  [string]$Archivo
)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Test-Path $Archivo)) { throw "No existe el archivo: $Archivo" }

$compose = @('compose', '-f', 'docker-compose.prod.yml')
$tmp = '/tmp/pane_restore.dump'

Write-Host "==> Copiando el respaldo al contenedor..."
& docker @compose cp $Archivo "postgres:$tmp"
if ($LASTEXITCODE -ne 0) { throw "docker cp falló (codigo $LASTEXITCODE)" }

Write-Host "==> Restaurando (esto reemplaza los datos actuales)..."
& docker @compose exec -T postgres sh -c "pg_restore -U `"`$POSTGRES_USER`" -d `"`$POSTGRES_DB`" --clean --if-exists --no-owner $tmp"
if ($LASTEXITCODE -ne 0) { throw "pg_restore falló (codigo $LASTEXITCODE)" }
& docker @compose exec -T postgres rm -f $tmp

Write-Host "OK Restauracion completada desde: $Archivo"
