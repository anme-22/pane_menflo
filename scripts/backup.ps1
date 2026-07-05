# ============================================================================
# Respaldo de la base de PRODUCCIÓN en Windows (PowerShell).
# Pensado para el Programador de tareas. Genera backups\pane_YYYYMMDD_HHMM.dump.
# Usa `docker cp` (binario-seguro; PowerShell corromperia un `>` binario).
#
# Uso manual:   powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
# ============================================================================
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$compose = @('compose', '-f', 'docker-compose.prod.yml')
$stamp = Get-Date -Format 'yyyyMMdd_HHmm'
$out = "backups\pane_$stamp.dump"
$tmp = '/tmp/pane_backup.dump'

New-Item -ItemType Directory -Force -Path backups | Out-Null

Write-Host "==> Generando respaldo dentro del contenedor..."
& docker @compose exec -T postgres sh -c "pg_dump -U `"`$POSTGRES_USER`" -d `"`$POSTGRES_DB`" -Fc -f $tmp"
if ($LASTEXITCODE -ne 0) { throw "pg_dump falló (codigo $LASTEXITCODE)" }

Write-Host "==> Copiando al host: $out"
& docker @compose cp "postgres:$tmp" $out
if ($LASTEXITCODE -ne 0) { throw "docker cp falló (codigo $LASTEXITCODE)" }
& docker @compose exec -T postgres rm -f $tmp

Write-Host "OK Respaldo creado: $out"
