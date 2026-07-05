# 🥖 Sistema de Panadería

Monorepo (Nx) para la gestión de una panadería: facturación, inventario,
recetas, producción y reportes. Backend en **NestJS + Prisma**, frontend en
**Angular + PrimeNG + Tailwind**, base de datos **PostgreSQL**.

> Estado actual: **Feature 10 — Reportes y ganancias** (ver `CLAUDE.md §10`).

> 🚀 **¿Desplegar en producción con Docker?** (laptop Windows o VPS): ver
> [`README.deploy.md`](./README.deploy.md). Este README cubre el entorno de
> **desarrollo**; el de despliegue es un paquete aparte que no toca este flujo.

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
| `SUPERADMIN_IDENTIDAD`| (Opcional) Identidad (13 dígitos) del super_admin, para entrar también con ella. |

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
  (`SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` del `.env`). El login acepta
  **correo o identidad** (si el usuario tiene una identidad asignada).
- Roles: **super_admin** (gestiona usuarios y todo), **admin** (gestiona el
  negocio) y **vendedor** (vende, consulta). La pantalla **Usuarios** (crear,
  editar, activar/desactivar, **asignar identidad** y **restablecer contraseña**
  —genera una temporal que se muestra una vez—) solo la ve el super_admin.
- Los usuarios **no se borran**: se desactivan (`activo = false`).
- Endpoints principales: `POST /api/auth/login`, `GET /api/auth/me`,
  `GET|POST /api/usuarios`, `PATCH /api/usuarios/:id`,
  `PATCH /api/usuarios/:id/estado`. Las rutas protegidas exigen el header
  `Authorization: Bearer <token>`; sin token responden `401` y con rol
  insuficiente `403`.

## Clientes y censo (Feature 4)

- Pantalla **Clientes**: la gestionan los **tres roles** (incluido vendedor).
  Al crear un cliente, escribir la **identidad** (13 dígitos) autocompleta
  nombre, apellido y sexo desde el **censo nacional** (editables).
- Catálogo de sexo: **1 = Masculino, 2 = Femenino**; otros códigos (p. ej. 0/9)
  se muestran como **No especificado** (no rompen el autocompletado).
- Los clientes **no se borran**: se desactivan (`activo = false`).
- Endpoints: `GET|POST /api/clientes`, `PATCH /api/clientes/:identidad`,
  `PATCH /api/clientes/:identidad/estado` y el lookup
  `GET /api/clientes/censo/:identidad`. Todo exige sesión (`Bearer <token>`).

### Cargar el censo nacional (una sola vez)

El censo (`grl.censo_nacional`) es una tabla de **solo lectura** con ~5M filas.
La **migración crea la tabla vacía**; los datos vienen de un volcado externo
(`censo.sql`, ~440 MB, **ignorado por git**) que se carga manualmente:

```bash
# La tabla ya existe tras aplicar migraciones (pnpm prisma:migrate / :deploy).
# Coloca censo.sql en la raíz del repo y cárgalo dentro del contenedor:
docker cp censo.sql pane-postgres:/tmp/censo.sql
docker exec pane-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/censo.sql'

# Verificar el conteo (debería rondar los ~5 millones):
docker exec pane-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM grl.censo_nacional;"'

# (Opcional) borrar el volcado dentro del contenedor:
docker exec pane-postgres rm /tmp/censo.sql
```

> La carga puede tardar varios minutos. Va en **una sola transacción**
> (`--single-transaction`): si algo falla, no deja datos a medias. La app nunca
> escribe en el censo; solo lo consulta para autocompletar.

## Insumos, unidades y compras (Feature 5)

- **Insumos** (materias primas): cada uno tiene un **tipo** (peso / volumen /
  conteo) que define su **unidad base** (peso→g, volumen→ml, conteo→u). El stock
  **siempre se guarda en unidad base**. Los insumos no se borran: se desactivan.
- **Unidades**: se reutiliza la tabla `unidad_medida` (sembrada en F1). Convertir
  entre unidades del mismo tipo = `cantidad * factor_origen / factor_destino`.
  **Agregar una unidad nueva = insertar una fila** (p. ej. desde DBeaver), sin
  tocar el código. El seed añade la unidad base de conteo (**"Unidad"**, factor 1).
- **Compras** (lotes): se registra cantidad + unidad de compra + **costo total**;
  el sistema convierte a unidad base y calcula el **costo por unidad base** del
  lote. Cada compra actualiza la existencia con **costo promedio ponderado**.
- **Roles**: insumos en lectura para todos (el vendedor consulta el inventario),
  gestión solo admin/super_admin; **compras solo admin/super_admin**.
- Endpoints: `GET /api/unidades`; `GET|POST /api/insumos`,
  `PATCH /api/insumos/:id[/estado]`; `GET|POST /api/compras` (`?insumoId=` opc.).

> El kardex detallado, la cobertura en días y las alertas de stock bajo llegan en
> la Feature 8 (Inventario / existencias).

## Recetas (Feature 6)

- Una **receta por producto** (un producto puede no tener receta). Es **por lote**
  (quintal/saco) con un **rendimiento** (bolsas por lote, ej. 223).
- Los **ingredientes** se definen en cualquier unidad (del mismo tipo que el
  insumo) y se convierten a la unidad base al costear (reusa la conversión de F5).
- **Costo de la receta** = Σ (cantidad→base × costo promedio actual del insumo);
  **costo por bolsa** = costo receta ÷ rendimiento. Se calcula al vuelo con el
  costo vigente (la producción lo "congelará" en una feature posterior).
- **Roles:** solo admin/super_admin.
- Endpoints: `GET /api/recetas`, `GET /api/recetas/:id`,
  `GET /api/recetas/producto/:productoId` (o `null`), `POST`, `PATCH`, `DELETE`.

## Producción (Feature 7)

- Una **orden de producción** planifica producir `sacos` (quintales) lotes de un
  producto **con receta**. Las **bolsas esperadas** se congelan al crear
  (= sacos × rendimiento). Las **bolsas reales** se capturan después de producir;
  la **merma** = esperadas − reales se calcula sola.
- **Estados:** `BORRADOR → CONFIRMADA` (o `ANULADA` con motivo, deja rastro).
- Al **confirmar** (en **una sola transacción**): se calculan los insumos de la
  receta (cantidad × sacos, convertidos a unidad base con la conversión de F5), se
  **descuenta el stock** de cada insumo y se registra un **movimiento de salida**
  por insumo (origen = la orden, valorado al costo promedio vigente), y se
  **congela el costo del momento**. La confirmación es **idempotente**: una orden
  ya confirmada no vuelve a descontar; si falta stock, todo se revierte (400).
- Los **movimientos de inventario nunca se borran**: son la base del kardex de la
  Feature 8.
- **Roles:** solo admin/super_admin.
- Endpoints: `GET /api/produccion[/:id]`, `POST /api/produccion`,
  `POST /api/produccion/:id/confirmar`, `PATCH /api/produccion/:id/bolsas-reales`,
  `POST /api/produccion/:id/anular`.

> El kardex detallado, la cobertura en días y las alertas de stock bajo llegan en
> la Feature 8 (Inventario / existencias).

## Inventario / existencias (Feature 8)

Capa de **consulta** (solo lectura) sobre el stock de **insumos**: la gestionan
los **tres roles** (el vendedor en modo consulta).

- **Existencias:** stock actual de cada insumo en unidad base, con su equivalente
  legible (g→kg, ml→L), costo promedio, valor y bandera de **stock bajo**.
- **Kardex por insumo:** todos los movimientos — **ENTRADA** (compras) y **SALIDA**
  (producción) — con fecha, origen ("Compra #N" / "Producción #N"), cantidad,
  costo y **saldo acumulado** (el saldo final cuadra con la existencia).
- **Cobertura:** "¿para cuántos días me alcanzan los insumos produciendo *N*
  sacos/día de *X*?" → `días = stock_base ÷ consumo_diario_base` por insumo de la
  receta; resalta el **insumo limitante** (el que se agota primero).
- **Alertas:** insumos por debajo de su **umbral** (`stock_minimo`, configurable
  por insumo en la pantalla de Insumos; 0 = sin alerta).
- Los **movimientos no se borran**. Las **compras** registran su movimiento de
  ENTRADA automáticamente; la migración de F8 hace **backfill** de las compras
  previas para que el kardex incluya el histórico.
- Endpoints: `GET /api/inventario/existencias`, `GET /api/inventario/alertas`,
  `GET /api/inventario/kardex/:insumoId`, `POST /api/inventario/cobertura`.

## Facturación (Feature 9)

- La pantalla **Facturas** la usan los **tres roles** (el vendedor crea, ve, edita
  con motivo e imprime).
- El detalle **copia (snapshot)** el nombre y el precio del producto al momento de
  la venta: **cambiar el precio después NO altera la factura.**
- **Tipo de pago contado / crédito.** Las de crédito se saldan con **abonos**; el
  **saldo** y el **estado de pago** (PENDIENTE / PARCIAL / PAGADA) se **calculan**
  desde los abonos (las de contado se consideran pagadas al emitir).
- **Impuesto por línea** con default **0**; la factura totaliza subtotal/impuesto/
  total (la regla vive tras una interfaz, se cambia sin tocar el servicio).
- **Estados BORRADOR → EMITIDA → ANULADA.** En borrador se edita libre; una
  **emitida no se reescribe**: se anula (con motivo) y se emite otra, o se edita
  **con motivo obligatorio**. Emisión/edición/anulación quedan en la **bitácora**
  (quién, cuándo, qué cambió, motivo). **Nada se borra.**
- Campos **fiscales** (CAI, número) quedan **nullable y apagados** por bandera de
  `configuracion` (se encienden en la Feature 12).
- Endpoints: `GET /api/facturas[/:id]`, `POST /api/facturas`,
  `PATCH /api/facturas/:id`, `POST /api/facturas/:id/{emitir,anular,abonos}` y
  `GET /api/configuracion`.

## Reportes y ganancias (Feature 10)

Capa de **consulta** (solo lectura), **solo admin/super_admin**, con filtro de
periodo (`desde`/`hasta`):

- **Ventas por periodo:** total facturado, impuesto y desglose por día (solo
  facturas emitidas).
- **Ganancia por producto:** ingreso = Σ (**precio de la factura** × cantidad) −
  **costo por bolsa** × cantidad. Usa el precio _snapshot_ de la factura (no el
  actual). El costo por bolsa reutiliza el costeo de recetas (promedio ponderado
  vigente); los productos sin receta salen "sin costeo".
- **Consumo de insumos:** suma las salidas de inventario (producción) del periodo
  por insumo → **cuadra con la producción**.
- **Cuentas por cobrar:** saldos pendientes de las facturas a crédito.
- Endpoints: `GET /api/reportes/{ventas,ganancia-por-producto,consumo-insumos}?desde=&hasta=`
  y `GET /api/reportes/cuentas-por-cobrar`.

## Costos indirectos y costo por bolsa

El **costo por bolsa** de una receta incluye **materiales + costos indirectos**:

- **Costos indirectos** (mano de obra, luz/agua/gas…): cada uno es `POR_QUINTAL`
  (se aplica por lote) o `POR_MES` (se prorratea dividiéndolo entre
  `quintalesPorMes`). El **indirecto por lote** = Σ POR_QUINTAL + Σ POR_MES ÷
  quintalesPorMes.
- Se gestionan en la pantalla **Costos indirectos** (admin/super_admin), que
  también edita `quintalesPorMes`. Endpoints: `GET/POST /api/costos-indirectos`,
  `PATCH /api/costos-indirectos/:id[/estado]`, `PATCH /api/costos-indirectos/parametros`.
- `costo por bolsa = (materiales + indirecto por lote) ÷ rendimiento`; la ganancia
  por producto (Reportes) usa este costo.

### Datos de demo (Pan Blanco)

`pnpm prisma:seed:demo` siembra un ejemplo real y reproducible (idempotente, no
toca el seed base): 7 insumos con su compra, "Pan Blanco" (precio 7.50), su
receta (quintal, rinde 350) y los costos indirectos. Imprime el desglose
(materiales ≈ 1,314, indirecto 570, **costo/bolsa ≈ 5.38**, ganancia ≈ 2.12).

## Scripts útiles

| Script                      | Qué hace                                            |
| --------------------------- | --------------------------------------------------- |
| `pnpm db:up`                | Levanta PostgreSQL con Docker                       |
| `pnpm db:down`              | Detiene y elimina el contenedor de Postgres         |
| `pnpm prisma:generate`      | Genera el cliente de Prisma                         |
| `pnpm prisma:migrate`       | Crea y aplica migraciones (modo dev)                |
| `pnpm prisma:seed`          | Ejecuta el seed base (unidades, sucursal, super_admin) |
| `pnpm prisma:seed:demo`     | Siembra datos de demo de Pan Blanco (idempotente)   |
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
│   │       ├── usuarios/    # CRUD de usuarios (solo super_admin)
│   │       ├── productos/   # catálogo + precios históricos
│   │       ├── clientes/    # CRUD de clientes + lookup del censo (grl)
│   │       ├── unidades/    # catálogo + ConversionService (tabla)
│   │       ├── insumos/     # materias primas + existencias
│   │       ├── compras/     # lotes + costo promedio ponderado
│   │       ├── costeo/      # estrategia de costeo (interfaz + promedio + módulo)
│   │       ├── recetas/     # recetas + costo por bolsa
│   │       ├── inventario/  # entrada/salida de stock + movimientos + consulta (kardex, cobertura, alertas)
│   │       ├── produccion/  # órdenes: confirmar, descontar, merma, costo
│   │       ├── impuesto/    # estrategia de impuesto (interfaz + por línea)
│   │       ├── configuracion/ # banderas del sistema (lectura; edición en F12)
│   │       ├── facturas/    # facturación: snapshot, abonos, bitácora, impresión
│   │       ├── reportes/    # ventas, ganancia, consumo, cuentas por cobrar
│   │       └── costos-indirectos/ # mano de obra, luz/agua/gas (costo por bolsa)
│   └── web/                 # Angular (PrimeNG + Tailwind)
│       └── src/
│           ├── styles.css           # variables CSS de la paleta + modo oscuro
│           └── app/
│               ├── core/auth/        # AuthService, interceptor y guards
│               ├── layout/           # shell (barra + navegación por rol)
│               ├── features/         # login, inicio, usuarios, productos, clientes, insumos, compras, recetas, produccion, inventario, facturas, reportes, costos-indirectos
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
