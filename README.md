# 🥖 Sistema de Panadería

Monorepo (Nx) para la gestión de una panadería: facturación, inventario,
recetas, producción y reportes. Backend en **NestJS + Prisma**, frontend en
**Angular + PrimeNG + Tailwind**, base de datos **PostgreSQL**.

> Estado actual: **Feature 2 — Auth y usuarios** (ver `CLAUDE.md §10`).

## Stack

| Capa        | Tecnología                                        |
| ----------- | ------------------------------------------------- |
| Monorepo    | Nx 22                                             |
| API         | NestJS 11 + Prisma 6 (`apps/api`)                 |
| Web         | Angular 21 + PrimeNG 21 + Tailwind 4 (`apps/web`) |
| Compartido  | Tipos/DTOs en `libs/shared` (`@pane/shared`)      |
| Base datos  | PostgreSQL 16 (Docker)                            |

## Requisitos

- **Node.js 20+** y **pnpm** (puedes activarlo con `corepack enable pnpm`)
- **Docker Desktop** (para PostgreSQL)

## Puesta en marcha (local)

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Variables de entorno

Copia el ejemplo y ajusta los valores (sobre todo la contraseña):

```bash
cp .env.example .env
```

`.env` está ignorado por git. Define las credenciales de Postgres y la
`DATABASE_URL` que usan Docker y Prisma. **Si cambias la contraseña, cámbiala en
los dos sitios** (variables `POSTGRES_*` y dentro de `DATABASE_URL`).

Para la autenticación (Feature 2) define además:

| Variable             | Para qué sirve                                              |
| -------------------- | ---------------------------------------------------------- |
| `JWT_SECRET`         | Secreto para firmar los JWT. **Usa uno largo y aleatorio.**|
| `JWT_EXPIRES_IN`     | Expiración del token (p. ej. `3600s`, `1h`, `7d`).         |
| `SUPERADMIN_EMAIL`   | Email del super_admin inicial que crea el seed.            |
| `SUPERADMIN_PASSWORD`| Contraseña del super_admin inicial.                        |
| `SUPERADMIN_NOMBRE`  | (Opcional) Nombre del super_admin inicial.                 |

### 3. Levantar PostgreSQL

```bash
pnpm db:up           # docker compose up -d  (Postgres en el puerto 5432)
```

### 4. Crear el esquema y sembrar datos

```bash
pnpm prisma:generate   # genera el cliente de Prisma
pnpm prisma:migrate    # crea/aplica las migraciones
pnpm prisma:seed       # siembra unidades de medida + sucursal por defecto
```

> `prisma:migrate` en una BD nueva también ejecuta el seed automáticamente.
> El seed es **idempotente**: se puede correr varias veces sin duplicar datos.

Esto crea la tabla `unidad_medida` (gramo, onza, libra, kilo, quintal, ml,
litro), una `sucursal` por defecto y el **usuario super_admin inicial** (con las
credenciales `SUPERADMIN_*` del `.env`). El seed solo crea el super_admin si aún
no existe ninguno.

### 5. Arrancar la API

```bash
pnpm nx serve api
```

- API: `http://localhost:3000/api`
- Health check: `http://localhost:3000/health` → `{"status":"ok","database":"up",...}`

### 6. Arrancar la web

```bash
pnpm nx serve web
```

- Web: `http://localhost:4200`
- El dev-server redirige `/api` a la API (`apps/web/proxy.conf.json`), así que
  arranca también la API.
- Incluye el toggle de tema claro/oscuro y componentes de PrimeNG en naranja.

## Autenticación (Feature 2)

- Inicia sesión en `http://localhost:4200/login` con el super_admin sembrado
  (`SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` del `.env`).
- Roles: **super_admin** (gestiona usuarios y todo), **admin** (gestiona el
  negocio) y **vendedor** (vende, consulta). La pantalla **Usuarios** (crear,
  editar, activar/desactivar) solo la ve el super_admin.
- Los usuarios **no se borran**: se desactivan (`activo = false`).
- Endpoints principales: `POST /api/auth/login`, `GET /api/auth/me`,
  `GET|POST /api/usuarios`, `PATCH /api/usuarios/:id`,
  `PATCH /api/usuarios/:id/estado`. Las rutas protegidas exigen el header
  `Authorization: Bearer <token>`; sin token responden `401` y con rol
  insuficiente `403`.

## Scripts útiles

| Script                      | Qué hace                                            |
| --------------------------- | --------------------------------------------------- |
| `pnpm db:up`                | Levanta PostgreSQL con Docker                       |
| `pnpm db:down`              | Detiene y elimina el contenedor de Postgres         |
| `pnpm prisma:generate`      | Genera el cliente de Prisma                         |
| `pnpm prisma:migrate`       | Crea y aplica migraciones (modo dev)                |
| `pnpm prisma:seed`          | Ejecuta el seed                                     |
| `pnpm prisma:reset`         | Reinicia la BD (borra datos), re-migra y re-siembra |
| `pnpm prisma:studio`        | Abre Prisma Studio                                  |
| `pnpm nx serve api`         | Sirve la API en modo desarrollo                     |
| `pnpm nx serve web`         | Sirve la web en modo desarrollo                     |
| `pnpm nx run-many -t build` | Compila todos los proyectos                         |
| `pnpm nx run-many -t test`  | Corre las pruebas                                   |

## Estructura

```
/
├── apps/
│   ├── api/                 # NestJS + Prisma
│   │   ├── prisma/          # schema.prisma, migrations/ (versionadas), seed.ts
│   │   └── src/app/
│   │       ├── prisma/      # PrismaService + PrismaModule (global)
│   │       ├── health/      # GET /health
│   │       ├── auth/        # login, JWT, guards (JwtAuthGuard, RolesGuard)
│   │       └── usuarios/    # CRUD de usuarios (solo super_admin)
│   └── web/                 # Angular (PrimeNG + Tailwind)
│       └── src/
│           ├── styles.css           # variables CSS de la paleta + modo oscuro
│           └── app/
│               ├── core/auth/        # AuthService, interceptor y guards
│               ├── layout/           # shell (barra + navegación por rol)
│               ├── features/         # login, inicio, usuarios
│               └── theme/            # ThemeService + preset de PrimeNG
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
