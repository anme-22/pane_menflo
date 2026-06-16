# CLAUDE.md — Sistema de Panadería

> Este archivo es el contexto persistente del proyecto. Léelo completo antes de
> empezar cualquier tarea y respétalo en todo momento.

---

## 0. Reglas de trabajo (LEER PRIMERO)

1. **Trabajamos FEATURE POR FEATURE.** No generes todo el sistema de golpe.
   Implementa únicamente la feature que se te pida en cada momento. No hagas
   scaffolding de features futuras "por adelantarte".
2. **Antes de programar una feature, usa las skills instaladas en este entorno.**
   Revisa qué skills hay disponibles y consulta las relevantes para la tarea
   (frontend, base de datos, documentos, etc.) ANTES de escribir código. Si una
   skill aplica al trabajo, úsala; no la ignores.
3. **Aplica los 5 principios SOLID** en todo el código (ver sección 5). Tanto el
   backend de Nest como el frontend de Angular se prestan muy bien a esto;
   aprovéchalo. Código desacoplado, testeable y con responsabilidades claras.
4. **Pregunta antes de tomar decisiones grandes** (cambiar el modelo de datos,
   meter una dependencia pesada, cambiar la arquitectura). Para lo pequeño,
   avanza y documenta el supuesto.
5. Al terminar una feature: deja migración, módulo, pruebas básicas y actualiza
   la sección 10 (Estado / progreso) de este archivo.
6. **No borres registros de negocio.** Las facturas y movimientos no se eliminan;
   se anulan o se corrigen dejando rastro (ver dominio).
7. **README incremental.** En la Feature 1 crea un `README.md` con los pasos
   reales de instalación y ejecución (requisitos, levantar Docker, correr
   migraciones, arrancar api y web). Actualízalo cuando cambie algo de cara al
   usuario (variable de entorno nueva, comando nuevo). No documentes pasos que
   todavía no existen.
8. **Nunca subas secretos a git.** Toda credencial (contraseña de Postgres,
   secreto del JWT, etc.) va en `.env`, que está ignorado. Versiona en su lugar un
   `.env.example` con las llaves necesarias y valores de ejemplo/vacíos. Lee la
   configuración desde variables de entorno, nunca hardcodeada.
9. **`.gitignore`.** Asegúrate de ignorar: `node_modules/`, `dist/`, `tmp/`,
   cachés (`.nx/cache`, `.nx/workspace-data`, `.angular/cache`), `coverage/`,
   `.env` y `.env.*` (pero **sí** versionar `.env.example`), y archivos de
   editor/SO. **Las migraciones de Prisma SÍ se versionan** (no las ignores).
   La carpeta `.claude/` **sí se versiona** (config compartida, skills y comandos
   del proyecto), con una sola excepción: ignora `.claude/settings.local.json`
   (preferencias personales de máquina).

---

## 1. Qué es el proyecto

Sistema para una **panadería pequeña** (pan, poca repostería). Cubre facturación,
clientes, productos con precios históricos, recetas, producción, inventario con
conversión de unidades, control de usuarios por rol y reportes de ganancias.

El sistema debe correr **en local** (Docker) y poder **desplegarse online** y
verse desde el navegador. La UI debe ser **responsive** (uso real desde celular).

El usuario sabe bastante de frontend, algo de base de datos y poco de backend, así
que el código del backend debe ser claro, comentado donde ayude, y seguir patrones
estándar de Nest.

---

## 2. Stack tecnológico

- **Monorepo:** Nx.
  - `apps/api` → NestJS + Prisma
  - `apps/web` → Angular
  - `libs/shared` → tipos y DTOs compartidos entre front y back (misma fuente de
    verdad para `Producto`, `Factura`, etc.).
- **Frontend:** Angular + **PrimeNG** (componentes) + **Tailwind** (layout,
  espaciado, responsive). Modo oscuro obligatorio (ver sección 4).
- **Backend:** NestJS + **Prisma** como ORM (preferido por legibilidad).
- **Base de datos:** PostgreSQL. Se administra externamente con **DBeaver**.
- **Local:** `docker-compose` (Postgres + API + web).
- Usa siempre las **versiones estables más recientes** de Angular, PrimeNG, Nest,
  Tailwind y Prisma, y adapta la configuración a esa versión.

### Idioma del código y la base de datos
- **El esquema de base de datos y los términos de dominio van en español**
  (`identidad`, `precio_producto`, `factura_detalle`...), para ser consistentes
  con la tabla del censo y el vocabulario del negocio.
- El resto del código puede usar inglés para palabras genéricas, pero mantén la
  consistencia dentro de cada capa.

---

## 3. Estructura del monorepo

```
/
├── apps/
│   ├── api/         # NestJS + Prisma (módulos por feature)
│   └── web/         # Angular (PrimeNG + Tailwind)
├── libs/
│   └── shared/      # DTOs, interfaces y enums compartidos
├── docker-compose.yml
└── CLAUDE.md
```

En Nest, **un módulo por feature** (auth, productos, clientes, inventario,
recetas, produccion, facturacion, reportes, configuracion). En Angular,
organización por feature con componentes "smart" (con lógica/servicios) y "dumb"
(presentacionales).

---

## 4. Theming y modo oscuro

**Requisito:** la app tiene modo claro y oscuro. **Todos los colores se manejan
desde un único lugar** mediante variables CSS, para poder cambiar la marca sin
tocar componentes. **Hoy el color primario es NARANJA.**

### Principio
- Define **variables CSS** como única fuente de verdad de la paleta.
- **Tailwind y PrimeNG deben leer esas mismas variables**, para que ambos cambien
  juntos al alternar el tema.
- El modo oscuro se activa con una **clase `dark` en `<html>`**
  (`darkMode: 'class'` / selector en Tailwind).

### Variables base (en el CSS global)
```css
:root {
  /* Paleta primaria — NARANJA (cambiar aquí cambia toda la marca) */
  --color-primary-50:  #fff7ed;
  --color-primary-100: #ffedd5;
  --color-primary-200: #fed7aa;
  --color-primary-300: #fdba74;
  --color-primary-400: #fb923c;
  --color-primary-500: #f97316; /* primario */
  --color-primary-600: #ea580c; /* hover/acciones */
  --color-primary-700: #c2410c;
  --color-primary-800: #9a3412;
  --color-primary-900: #7c2d12;
  --color-primary-950: #431407;

  /* Superficies y texto — MODO CLARO */
  --surface-bg:     #ffffff;
  --surface-card:   #ffffff;
  --surface-border: #e5e7eb;
  --text-color:     #1f2937;
  --text-muted:     #6b7280;
}

html.dark {
  /* Superficies y texto — MODO OSCURO (la paleta primaria se mantiene) */
  --surface-bg:     #0f172a;
  --surface-card:   #1e293b;
  --surface-border: #334155;
  --text-color:     #f1f5f9;
  --text-muted:     #94a3b8;
}
```

### Conexión con Tailwind y PrimeNG
- **Tailwind:** `darkMode: 'class'` y mapea los colores del tema para que
  apunten a las variables (`primary` → `var(--color-primary-500)`, etc.), según
  la sintaxis de la versión instalada.
- **PrimeNG:** configura el sistema de theming por *design tokens* con un preset
  cuyo color primario sea el naranja, y activa el modo oscuro con
  `options.darkModeSelector: '.dark'` para que los componentes de PrimeNG cambien
  con la misma clase.

### Toggle de tema
- Un `ThemeService` en Angular alterna la clase `dark` en `<html>` y **persiste la
  preferencia en `localStorage`**. Al cargar la app, respeta la preferencia
  guardada y, si no hay, usa `prefers-color-scheme`.

---

## 5. Principios SOLID (aplicarlos siempre)

Motívate a aplicar los cinco; el stack los favorece:

- **S — Responsabilidad única:** cada servicio/clase/componente hace una sola
  cosa. Controladores de Nest delgados; la lógica vive en servicios. En Angular,
  separa componentes presentacionales de los que tienen lógica.
- **O — Abierto/cerrado:** extiende sin modificar. Para variaciones (ej. métodos
  de costeo de inventario, estrategias de impuesto) usa interfaces/estrategias en
  vez de `if` gigantes.
- **L — Sustitución de Liskov:** las implementaciones de una interfaz deben ser
  intercambiables sin romper a quien las usa.
- **I — Segregación de interfaces:** interfaces pequeñas y específicas; no obligues
  a depender de métodos que no se usan.
- **D — Inversión de dependencias:** depende de abstracciones, no de
  implementaciones. Aprovecha la **inyección de dependencias de Nest**; los
  servicios reciben repositorios/abstracciones por DI, no instancian a mano.

---

## 6. Modelo de negocio (reglas de dominio)

### Precios que cambian en el tiempo (CRÍTICO)
Dos mecanismos a la vez:
1. **Historial de precios:** tabla `precio_producto(producto_id, precio,
   vigente_desde, vigente_hasta NULL)`. El precio actual es el de
   `vigente_hasta = NULL`. Al cambiar el precio, se cierra el anterior con fecha y
   se crea uno nuevo.
2. **Snapshot en la factura:** `factura_detalle` **copia** el `precio_unitario` y
   el `nombre_producto` al momento de la venta. La factura es la verdad histórica
   y NO depende de la tabla de precios.

### Inventario y unidades (CRÍTICO)
- Cada insumo tiene una **unidad base** según su tipo: peso → **gramos**,
  volumen → **mililitros**, conteo → **unidad**.
- **El stock siempre se guarda en la unidad base.**
- **Las conversiones se guardan en una TABLA, no en código ni JSON**, para poder
  agregar unidades nuevas sin tocar el código ni redesplegar (incluso desde
  DBeaver). Diseño: `unidad_medida(id, nombre, abreviatura, tipo, factor_a_base)`
  donde `tipo` es peso/volumen/conteo y `factor_a_base` es cuánto vale esa unidad
  en la unidad base de su tipo. No se guardan pares N×N, solo el factor de cada
  unidad a su base; convertir entre dos unidades del mismo tipo es:
  `cantidad * factor_origen / factor_destino`. Agregar una unidad = insertar una
  fila.
- Sembrar las comunes — **peso** (base = gramo): gramo 1 · onza 28.3495 ·
  libra 453.592 · kilo 1000 · quintal 45 359.2; **volumen** (base = ml): ml 1 ·
  litro 1000.
- **Compras:** se registra cantidad + unidad de compra + costo; se convierte a la
  unidad base y se calcula el **costo por unidad base** del lote, con su fecha.
- **Recetas:** los ingredientes se definen en cualquier unidad (oz, lb...) y se
  convierten a la unidad base al consumir.
- **Costeo:** usar **costo promedio ponderado** (suficiente para el negocio).
- **Cobertura:** "¿tengo azúcar para cuántos días haciendo N quintales?" =
  `stock_base ÷ consumo_diario_base`, donde el consumo diario sale de la receta ×
  la producción planeada. Incluir alertas de stock bajo.

### Recetas y producción
- La receta es **por lote** (por quintal/saco) y tiene un **rendimiento**
  (ej. 223 bolsas mínimo por quintal de pan blanco).
  - `receta(producto_id, rendimiento, unidad_lote)`
  - `receta_ingrediente(receta_id, insumo_id, cantidad, unidad)`
- **Puede haber productos sin receta.**
- La **producción** es una orden: fecha, producto, # de sacos/quintales, bolsas
  esperadas (= sacos × rendimiento) y un campo aparte de **bolsas reales**
  producidas (para medir mermas). Al confirmar, **descuenta insumos del
  inventario** (incluida la harina) y registra el costo del momento.
- **Costo por bolsa** = costo de la receta (insumos valorados al costo del
  momento) ÷ rendimiento. **Ganancia por bolsa** = precio de venta histórico −
  costo por bolsa.

### Clientes y censo
- Cliente: `identidad` (13 chars), nombre, apellido, teléfono, sexo.
- Tabla `grl.censo_nacional` es de **solo lectura**, sirve para **autocompletar**:
  al escribir la identidad se rellenan nombres y sexo desde el censo. Agregar
  índices para búsqueda por nombre.
- DDL del censo:
  ```sql
  CREATE TABLE grl.censo_nacional (
    identidad bpchar(13) NOT NULL,
    primer_nombre varchar(50) NOT NULL,
    segundo_nombre varchar(50) NULL,
    primer_apellido varchar(50) NOT NULL,
    segundo_apellido varchar(50) NULL,
    cod_sexo int4 NOT NULL,
    fecha_nacimiento date NULL,
    CONSTRAINT censo_nacional_pkey PRIMARY KEY (identidad)
  );
  ```
- Catálogo `sexo`: **1 = Masculino, 2 = Femenino** (dejar tolerancia para otros
  códigos como 0/9 = no especificado, sin romper el autocompletado).

### Facturación
- La factura usa **snapshot de precio** (ver arriba).
- **`tipo_pago`: contado / crédito.** Las de crédito requieren **abonos** (pagos
  parciales): `abono(factura_id, monto, fecha, metodo)`. El estado de pago
  (`PENDIENTE / PARCIAL / PAGADA`) y el `saldo_pendiente` se **calculan** a partir
  de los abonos, no se escriben a mano.
- **Impuesto:** hoy SIN ISV. Poner `tasa_impuesto` **a nivel de línea** con
  default 0 (soporta el caso mixto futuro). La factura calcula `subtotal`,
  `impuesto` y `total`.
- **Diseño fiscal-ready:** campos `cai`, `numero`/`rango`, `fecha_limite_emision`
  como **nullable**, apagados por bandera de configuración. Hoy es registro
  interno; el día de mañana se prende sin migración dolorosa.
- **Estados:** `BORRADOR → EMITIDA → ANULADA`.
  - En BORRADOR se edita libre.
  - Una vez EMITIDA, **no se reescribe**: se anula (con motivo) y se emite otra, o
    se edita exigiendo **motivo obligatorio** y dejando rastro.
- **Bitácora obligatoria:** `factura_bitacora(quien, cuando, campo,
  valor_anterior, valor_nuevo, motivo)`. Construirla desde el día uno.
- **PIN de supervisor para editar:** dejar como **bandera de configuración
  apagada** (`pin_edicion_activo`), para activarla cuando haya varios vendedores.
  No implementar el flujo completo ahora.

### Sucursales (esqueleto ahora, funcionalidad después)
- Crear tabla `sucursal` y sembrar **una sucursal por defecto**.
- Agregar `sucursal_id` (NOT NULL, default = esa sucursal) a: **inventario/
  existencias, movimientos de inventario, producción y facturas**.
- **NO** construir selector, ni administración de sucursales, ni asignación de
  usuarios a sucursales por ahora. Todo usa la sucursal default automáticamente.
- Objetivo: evitar una migración riesgosa más adelante sobre tablas con datos
  reales.

### Configuración
- Tabla `configuracion` con las banderas/interruptores del sistema:
  `isv_activo`, `tasa_isv`, `facturacion_fiscal_activa`, datos del CAI,
  `pin_edicion_activo`.

---

## 7. Roles y permisos

- **super_admin:** crea y gestiona usuarios; acceso total.
- **admin:** gestiona todo el negocio (productos, precios, inventario, insumos,
  compras, recetas, producción, facturas, clientes, reportes). No
  necesariamente crea usuarios.
- **vendedor:** crea facturas (vende), las imprime, las ve y puede editarlas en
  caso de error (con motivo / bitácora). Ve inventario y productos en modo
  consulta y gestiona clientes.

Implementar con JWT + guards/decoradores de rol en Nest, y guards de ruta +
ocultamiento de UI por rol en Angular.

---

## 8. Despliegue

- **Local:** `docker-compose` con Postgres + API + web.
- **Online:** preparado para VPS con Docker (un dominio + HTTPS) o, alternativa,
  API+BD en un PaaS y frontend en hosting estático. No acoplar el código a un
  proveedor específico (variables de entorno para todo lo configurable).
- **Responsive:** Tailwind para layout fluido; las tablas de PrimeNG en móvil
  deben degradar a vista de tarjetas o scroll adecuado.

---

## 9. Roadmap de features (orden de implementación)

> Implementar UNA a la vez, en este orden (respeta dependencias).

1. **Setup del monorepo (Nx):** apps `api` (Nest + Prisma) y `web` (Angular),
   `libs/shared`, Postgres en Docker, `docker-compose.yml` en la raíz, Tailwind +
   PrimeNG con el theming/variables y modo oscuro de la sección 4, y Prisma
   conectado a la BD. Incluir la tabla `unidad_medida` sembrada con las unidades
   comunes (sección 6). Crear también el `README.md` básico, el `.gitignore`
   (regla 9) y un `.env.example`.
2. **Auth y usuarios:** roles, JWT, guards; pantallas de login y gestión de
   usuarios (solo super_admin crea usuarios).
3. **Catálogo de productos + precios históricos.**
4. **Clientes + censo (autocompletado).**
5. **Insumos, unidades y compras** (alimenta el costo histórico).
6. **Recetas** (producto ↔ insumos, rendimiento; productos pueden no tener).
7. **Producción** (descuenta inventario, registra costo, bolsas esperadas vs
   reales).
8. **Inventario / existencias** (stock, kardex, cobertura en días, alertas).
9. **Facturación** (snapshot, estados, `tipo_pago` contado/crédito, abonos,
   tasa_impuesto por línea, campos CAI nullable, bitácora con motivo).
10. **Reportes y ganancias** (ventas por periodo, ganancia por producto, consumo
    de insumos, **cuentas por cobrar**).
11. **Deploy** (docker-compose y guía para online).
12. **Configuración del sistema** (tabla y pantalla de banderas: ISV, fiscal/CAI,
    pin_edicion). Puede empezarse en paralelo cuando se necesite la primera
    bandera.

---

## 10. Estado / progreso

> Actualizar al cerrar cada feature.

- [x] Feature 1 — Setup del monorepo
      (Nx 22; apps/api Nest 11 + Prisma 6; apps/web Angular 21 + PrimeNG 21 +
      Tailwind 4 con theming naranja y modo oscuro; libs/shared @pane/shared;
      docker-compose con Postgres 16; tabla unidad_medida sembrada + enum
      TipoUnidad; tabla sucursal con sucursal por defecto; GET /health verifica
      la BD; README y .env.example creados.)
- [x] Feature 2 — Auth y usuarios
      (Prisma: enum RolUsuario + tabla usuario con password_hash, activo y
      timestamps; migración versionada; seed de super_admin desde .env
      SUPERADMIN_*. API Nest: AuthModule con login JWT [solo access token,
      @nestjs/jwt + passport-jwt], hash con bcryptjs, JwtAuthGuard + RolesGuard
      + @Roles/@CurrentUser; UsuariosModule con CRUD solo super_admin y SIN
      borrado [activar/desactivar]; rutas protegidas devuelven 401/403.
      libs/shared: RolUsuario, UsuarioDto, Login/Crear/Actualizar DTOs y
      JwtPayload. Web Angular: AuthService con signals + localStorage,
      authInterceptor [Bearer + 401→login], authGuard y rolGuard, pantalla de
      login [Reactive Forms + PrimeNG, naranja, claro/oscuro, responsive],
      shell con navegación por rol y logout, pantalla de usuarios [tabla +
      diálogo crear/editar + activar/desactivar] solo para super_admin; proxy
      /api en dev. Variables nuevas en .env(.example): JWT_SECRET,
      JWT_EXPIRES_IN, SUPERADMIN_EMAIL/PASSWORD/NOMBRE. Verificado: login OK,
      401 sin token, 403 por rol, vendedor no ve Usuarios; tests api+web verdes.)
- [ ] Feature 3 — Productos + precios históricos
- [ ] Feature 4 — Clientes + censo
- [ ] Feature 5 — Insumos, unidades y compras
- [ ] Feature 6 — Recetas
- [ ] Feature 7 — Producción
- [ ] Feature 8 — Inventario / existencias
- [ ] Feature 9 — Facturación
- [ ] Feature 10 — Reportes y ganancias
- [ ] Feature 11 — Deploy
- [ ] Feature 12 — Configuración
