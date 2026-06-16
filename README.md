# 🥖 Sistema de Panadería

Monorepo (Nx) para la gestión de una panadería: facturación, inventario,
recetas, producción y reportes. Backend en **NestJS + Prisma**, frontend en
**Angular + PrimeNG + Tailwind**, base de datos **PostgreSQL**.

> Estado actual: **Feature 1 — Setup del monorepo** (ver `CLAUDE.md §10`).

## Stack

| Capa        | Tecnología                                        |
| ----------- | ------------------------------------------------- |
| Monorepo    | Nx 22                                             |
| API         | NestJS 11 + Prisma 6 (`apps/api`)                 |
| Web         | Angular 21 + PrimeNG 21 + Tailwind 4 (`apps/web`) |
| Compartido  | Tipos/DTOs en `libs/shared` (`@pane/shared`)      |
| Base datos  | PostgreSQL 16 (Docker)                            |

## Requisitos

- **Node.js 20+** y **npm**
- **Docker Desktop** (para PostgreSQL)

## Puesta en marcha (local)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Copia el ejemplo y ajusta los valores (sobre todo la contraseña):

```bash
cp .env.example .env
```

`.env` está ignorado por git. Define las credenciales de Postgres y la
`DATABASE_URL` que usan Docker y Prisma. **Si cambias la contraseña, cámbiala en
los dos sitios** (variables `POSTGRES_*` y dentro de `DATABASE_URL`).

### 3. Levantar PostgreSQL

```bash
npm run db:up        # docker compose up -d  (Postgres en el puerto 5432)
```

### 4. Crear el esquema y sembrar datos

```bash
npm run prisma:generate   # genera el cliente de Prisma
npm run prisma:migrate    # crea/aplica las migraciones
npm run prisma:seed       # siembra unidades de medida + sucursal por defecto
```

> `prisma:migrate` en una BD nueva también ejecuta el seed automáticamente.
> El seed es **idempotente**: se puede correr varias veces sin duplicar datos.

Esto crea la tabla `unidad_medida` (gramo, onza, libra, kilo, quintal, ml,
litro) y una `sucursal` por defecto.

### 5. Arrancar la API

```bash
npx nx serve api
```

- API: `http://localhost:3000/api`
- Health check: `http://localhost:3000/health` → `{"status":"ok","database":"up",...}`

### 6. Arrancar la web

```bash
npx nx serve web
```

- Web: `http://localhost:4200`
- Incluye el toggle de tema claro/oscuro y componentes de PrimeNG en naranja.

## Scripts útiles

| Script                     | Qué hace                                            |
| -------------------------- | --------------------------------------------------- |
| `npm run db:up`            | Levanta PostgreSQL con Docker                       |
| `npm run db:down`          | Detiene y elimina el contenedor de Postgres         |
| `npm run prisma:generate`  | Genera el cliente de Prisma                         |
| `npm run prisma:migrate`   | Crea y aplica migraciones (modo dev)                |
| `npm run prisma:seed`      | Ejecuta el seed                                     |
| `npm run prisma:reset`     | Reinicia la BD (borra datos), re-migra y re-siembra |
| `npm run prisma:studio`    | Abre Prisma Studio                                  |
| `npx nx serve api`         | Sirve la API en modo desarrollo                     |
| `npx nx serve web`         | Sirve la web en modo desarrollo                     |
| `npx nx run-many -t build` | Compila todos los proyectos                         |
| `npx nx run-many -t test`  | Corre las pruebas                                   |

## Estructura

```
/
├── apps/
│   ├── api/                 # NestJS + Prisma
│   │   ├── prisma/          # schema.prisma, migrations/ (versionadas), seed.ts
│   │   └── src/app/
│   │       ├── prisma/      # PrismaService + PrismaModule (global)
│   │       └── health/      # GET /health
│   └── web/                 # Angular (PrimeNG + Tailwind)
│       └── src/
│           ├── styles.css           # variables CSS de la paleta + modo oscuro
│           └── app/theme/           # ThemeService + preset de PrimeNG
├── libs/
│   └── shared/              # tipos/DTOs compartidos (@pane/shared)
├── docker-compose.yml       # PostgreSQL
└── .env.example
```

## Theming (claro/oscuro)

Los colores se manejan desde un único lugar (`apps/web/src/styles.css`) mediante
variables CSS. El color primario es **naranja**. Tailwind y PrimeNG leen las
mismas variables, y el modo oscuro se activa con la clase `dark` en `<html>`
(gestionada por `ThemeService`, persistida en `localStorage`). Cambiar la marca
= cambiar la paleta en ese archivo.

## Base de datos

Se administra externamente con **DBeaver** (o Prisma Studio). Conexión por
defecto: `localhost:5432`, base `panaderia`, usuario/clave según tu `.env`.
