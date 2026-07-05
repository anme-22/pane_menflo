#!/bin/sh
# ============================================================================
# Arranque del contenedor de app (producción).
# Responsabilidad única: orquestar el arranque de datos y luego ceder el proceso
# al servidor Nest. Todo idempotente: re-levantar no duplica ni falla.
#   1. Aplicar migraciones con `prisma migrate deploy` (NUNCA migrate dev).
#   2. Seed base (unidades, sucursal, configuración, super_admin).
#   3. Seed de demo (Pan Blanco) SOLO si SEED_DEMO=true.
#   4. Ceder a la API (PID 1 vía exec, para que reciba las señales de Docker).
# El censo NO se carga aquí (se hace aparte; ver README de despliegue).
# ============================================================================
set -e

PRISMA="node_modules/.bin/prisma"
SCHEMA="prisma/schema.prisma"

echo "==> Aplicando migraciones de Prisma (migrate deploy)..."
# Reintentos por si Postgres aún está aceptando conexiones al primer arranque
# (el compose ya espera su healthcheck, esto es un cinturón de seguridad extra).
INTENTOS=0
until "$PRISMA" migrate deploy --schema="$SCHEMA"; do
  INTENTOS=$((INTENTOS + 1))
  if [ "$INTENTOS" -ge 10 ]; then
    echo "!! No se pudieron aplicar las migraciones tras $INTENTOS intentos." >&2
    exit 1
  fi
  echo "   Base de datos no lista todavía; reintento $INTENTOS/10 en 3s..."
  sleep 3
done

echo "==> Seed base (idempotente)..."
node seeds/seed.js

if [ "$SEED_DEMO" = "true" ]; then
  echo "==> Seed de demo Pan Blanco (SEED_DEMO=true, idempotente)..."
  node seeds/seed-demo.js
else
  echo "==> Seed de demo omitido (SEED_DEMO != true)."
fi

echo "==> Iniciando API + frontend..."
exec node main.js
