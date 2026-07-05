#!/bin/sh
# ============================================================================
# Restauración de un respaldo en la base de PRODUCCIÓN.
# Reemplaza los datos actuales con los del archivo (--clean --if-exists).
# Úsalo para migrar los datos al VPS: primero `up -d` (crea BD vacía + migra +
# seed) y luego restaura el último respaldo encima.
#
# Uso:   scripts/restore.sh backups/pane_YYYYMMDD_HHMM.dump
# ============================================================================
set -e

FILE="$1"
if [ -z "$FILE" ]; then
  echo "Uso: scripts/restore.sh <archivo.dump>" >&2
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "No existe el archivo: $FILE" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml"
TMP="/tmp/pane_restore.dump"

echo "==> Copiando el respaldo al contenedor..."
$COMPOSE cp "$FILE" "postgres:$TMP"

echo "==> Restaurando (esto reemplaza los datos actuales)..."
$COMPOSE exec -T postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner '"$TMP"
$COMPOSE exec -T postgres rm -f "$TMP"

echo "✓ Restauración completada desde: $FILE"
