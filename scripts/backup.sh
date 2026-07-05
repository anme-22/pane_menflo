#!/bin/sh
# ============================================================================
# Respaldo de la base de datos de PRODUCCIÓN (pg_dump, formato custom -Fc).
# Genera backups/pane_YYYYMMDD_HHMM.dump. Este archivo es lo ÚNICO que se "muda"
# con los datos al VPS. Incluye TODOS los esquemas (public + censo grl).
#
# Uso:   scripts/backup.sh
# Cron (Linux, diario 2am):  0 2 * * * /ruta/al/proyecto/scripts/backup.sh
# ============================================================================
set -e
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml"
STAMP=$(date +%Y%m%d_%H%M)
OUT="backups/pane_${STAMP}.dump"
TMP="/tmp/pane_backup.dump"

mkdir -p backups

echo "==> Generando respaldo dentro del contenedor..."
$COMPOSE exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f '"$TMP"

echo "==> Copiando al host: $OUT"
$COMPOSE cp "postgres:$TMP" "$OUT"
$COMPOSE exec -T postgres rm -f "$TMP"

echo "✓ Respaldo creado: $OUT"
