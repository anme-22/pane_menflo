# syntax=docker/dockerfile:1
# ============================================================================
# Imagen de PRODUCCIÓN — un solo contenedor de app (API Nest + frontend Angular)
# Multi-stage: se compila con todo el toolchain (pnpm) y la imagen final queda
# chica, corriendo el build compilado (no ts-node).
# ============================================================================

# ---- Stage 1: build (toolchain completo, pnpm) ----
FROM node:22-alpine AS build
# Prisma sobre Alpine (musl) necesita openssl para sus engines.
RUN apk add --no-cache openssl
# El repo usa pnpm; lo activamos con corepack (pin a la versión del lockfile).
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
ENV NX_DAEMON=false
ENV NX_CLOUD_ACCESS_TOKEN=
WORKDIR /app

# Instalar dependencias (caché de capa: solo se reinstala si cambian).
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copiar el resto del código y construir.
COPY . .

# 1) Cliente de Prisma (necesario para compilar la API y para los seeds).
RUN pnpm exec prisma generate --schema=apps/api/prisma/schema.prisma
# 2) Frontend Angular (produce dist/apps/web/browser, SPA).
RUN pnpm exec nx build web --configuration=production
# 3) API Nest compilada. El webpack de Nx genera dist/apps/api/package.json con
#    SOLO las dependencias de producción (generatePackageJson).
RUN pnpm exec nx build api
# 4) Seeds a JS plano (sin tsx en runtime); node_modules quedan como externos.
RUN pnpm exec esbuild apps/api/prisma/seed.ts apps/api/prisma/seed-demo.ts \
      --bundle --platform=node --target=node22 --format=cjs \
      --packages=external --outdir=dist/apps/api/seeds

# ---- Stage 2: runtime (imagen final chica, npm) ----
FROM node:22-alpine AS runtime
# openssl para los engines de Prisma; wget (busybox) sirve el HEALTHCHECK.
RUN apk add --no-cache openssl
ENV NODE_ENV=production
# La app escucha aquí dentro; el puerto del host se mapea en el compose.
ENV API_PORT=3000
# El frontend compilado que sirve la propia API.
ENV WEB_STATIC_PATH=/app/web
WORKDIR /app

# API compilada + su package.json de producción (generado por el webpack de Nx),
# los seeds bundleados, y el esquema/migraciones de Prisma.
COPY --from=build /app/dist/apps/api ./
COPY --from=build /app/apps/api/prisma ./prisma

# Solo dependencias de producción (desde el package.json generado) + el CLI de
# Prisma (sin guardarlo), y se genera el cliente para esta imagen (engine musl).
RUN npm install --omit=dev --no-audit --no-fund \
 && npm install --no-save --no-audit --no-fund prisma@6.19.2 \
 && npx prisma generate --schema=prisma/schema.prisma \
 && npm cache clean --force

# Frontend estático que sirve la API.
COPY --from=build /app/dist/apps/web/browser ./web
# Orquestador de arranque (migraciones + seeds + servidor).
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
