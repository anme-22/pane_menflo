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

### 4.1 Layout y navegación (convención)
- La navegación vive en el **shell** (`apps/web/src/app/layout`) y sus ítems
  salen de **una sola fuente**: `layout/nav.ts` (`NAV_ITEMS`). **Cada feature que
  añada una pantalla registra ahí su ítem** (con `roles` si aplica); no se
  hardcodea la navegación en cada plantilla.
- **Escritorio (`lg+`):** sidebar fija a la izquierda con todos los ítems y, al
  pie, usuario + toggle de tema + Salir. La sidebar usa el mismo lenguaje de
  superficie (variables CSS) con un borde sutil, no un color que fragmente.
- **Móvil (`<lg`):** **bottom-bar** con **Perfil · Inicio · ⋯ Más**. El slot
  **central** es el "héroe" (realzado): hoy lo ocupa *Inicio*. *Perfil* abre un
  panel (`p-drawer` inferior) de cuenta (usuario, tema, Salir); *Más* abre la
  navegación secundaria (el resto de `NAV_ITEMS`). **Plan:** cuando exista
  Facturación, **"Vender" tomará el centro e Inicio se moverá a la izquierda**.
- Ítems siempre filtrados por rol; un solo set de iconos (**primeicons**);
  estados hover/focus y, en oscuro, apoyarse en bordes.

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
- [x] Feature 3 — Productos + precios históricos
      (Prisma: tabla `producto` [nombre, descripcion?, activo, timestamps; no se
      borra, se desactiva] y `precio_producto` [precio Decimal(12,2),
      vigente_desde, vigente_hasta?]; el precio vigente es el de
      vigente_hasta=NULL. Migración con índice ÚNICO PARCIAL [un solo vigente por
      producto] y CHECK precio>0. API: ProductosModule con ProductosService +
      PreciosService [regla cerrar-anterior/abrir-nuevo en transacción, sin if
      gigantes, reutilizada al crear]; precio inicial OBLIGATORIO al crear;
      endpoints GET /productos[:id][/precios], POST/PATCH y POST /:id/precio;
      lectura para cualquier rol, gestión solo admin/super_admin. libs/shared:
      ProductoDto [con precioVigente], PrecioDto, DTOs crear/actualizar/cambiar
      precio [importes como string]. Web: ruta /productos en NAV_ITEMS [visible a
      todos], listado tabla→tarjetas en móvil, diálogos crear/editar y cambiar
      precio [p-inputnumber HNL], drawer de historial; vendedor en consulta
      [oculto el CRUD]. Verificado contra BD [regla de vigencia, 400 si precio<=0]
      y UI desktop/móvil; tests api[7]+web[5] verdes.)
- [x] Feature 4 — Clientes + censo
      (Prisma: multiSchema [public + grl]. Tabla `cliente` [identidad CHAR(13)
      como PK natural, nombre, apellido, telefono?, sexo int, activo, timestamps;
      no se borra, se desactiva] y mapeo de `grl.censo_nacional` [SOLO LECTURA,
      DDL del documento] con índice de nombre btree `text_pattern_ops`
      [primer_apellido, primer_nombre] para búsqueda por prefijo; migración
      versionada crea la tabla vacía, los ~5M datos se cargan aparte [ver README].
      API: ClientesModule con ClientesService [CRUD sin borrado, identidad única]
      y CensoService [lookup solo-lectura que compone nombre/apellido y devuelve
      el código de sexo sin romper ante 0/9/desconocidos]; controlador delgado,
      todo exige sesión y los TRES roles gestionan clientes [solo JwtAuthGuard].
      Endpoints GET|POST /clientes, PATCH /:identidad[/estado] y lookup
      GET /clientes/censo/:identidad. libs/shared: ClienteDto, CensoLookupDto/
      Response, Crear/Actualizar DTOs, catálogo de sexo [SEXO_*, etiquetaSexo,
      OPCIONES_SEXO]. Web: ruta /clientes en NAV_ITEMS [visible a todos], listado
      tabla→tarjetas en móvil, diálogo crear/editar con autocompletado del censo
      [debounce + switchMap al teclear 13 dígitos; rellena nombre/apellido/sexo
      editables; normaliza sexo fuera de {1,2} a No especificado], activar/
      desactivar. Verificado contra BD [lookup compone bien, tolera sexo 9/nulos,
      no-encontrado, crear desde censo, 409 duplicado, 400 identidad inválida,
      401 sin token] y UI desktop/móvil [autocompletado + tarjetas]; tests
      api[15: +4 censo] + web[7: +2 clientes] verdes. `censo.sql` en .gitignore.)
- [x] Feature 5 — Insumos, unidades y compras
      (Reutiliza `unidad_medida` de F1; se sembró la base de conteo que faltaba
      ["Unidad", factor 1]. Prisma: `insumo` [tipo define la unidad base; no se
      borra, se desactiva], `compra` [lote: cantidad+unidadCompra+costo TOTAL,
      con cantidadBase y costoPorUnidadBase calculados] y `existencia` [saldo en
      unidad base + costoPromedio por sucursal, único (insumo,sucursal)]; compra
      y existencia llevan `sucursalId` NOT NULL = sucursal por defecto. Migración
      versionada. [Drift del índice del censo RESUELTO: el modelo declara el
      índice de nombre como btree simple [sin `ops: raw(...)`]; Prisma no rastrea
      operator classes vía raw y los re-proponía en cada migrate dev, pero trata
      btree-simple y text_pattern_ops como equivalentes al comparar, así que ya
      no hay drift y el índice real con prefijo [creado en clientes_censo] queda
      intacto.]
      Backend: ConversionService basado en la TABLA [cantidad*factor_origen/
      factor_destino, valida mismo tipo] + GET /unidades; EstrategiaCosteo
      [interfaz + token ESTRATEGIA_COSTEO] con CostoPromedioPonderadoStrategy
      inyectada por DI [abierto/cerrado]; SucursalesService [resuelve la default];
      módulos insumos [lectura todos, gestión admin/super_admin] y compras [solo
      admin/super_admin]: al registrar una compra convierte a base, calcula costo/
      unidad base y actualiza la existencia [promedio ponderado] en transacción.
      El tipo del insumo es fijo tras crearse. libs/shared: InsumoDto [con
      existencia], CompraDto, DTOs y helpers de sexo/tipo [ABREVIATURA_BASE,
      TIPO_LABEL]. Web: /insumos en NAV_ITEMS [todos] y /compras [admin/
      super_admin], listados tabla→tarjetas; alta de insumo [tipo bloqueado al
      editar] y registro de compra [unidad filtrada por tipo del insumo, costo
      por unidad base en vivo, Guardar deshabilitado si inválido]. Verificado
      contra BD [conversión 2qq=90718.4g, costo/u base 6000/90718.4, promedio
      ponderado 10000/136077.6, rechazo de tipo distinto 400, 401 sin token,
      vendedor 403 en compras / 200 en insumos] y UI desktop/móvil; tests
      api[+9: conversión, promedio, compra] + web[+4: insumos, compras] verdes.)
- [x] Feature 6 — Recetas
      (Depende de F3 productos y F5 insumos/conversión. Prisma: `receta`
      [productoId ÚNICO — una receta por producto; rendimiento Int; unidadLote
      texto, default "quintal"] y `receta_ingrediente` [insumo + cantidad +
      unidad; cascade al borrar la receta]; migración con CHECK rendimiento>0 y
      cantidad>0. Un producto puede no tener receta. Backend: RecetasService
      [CRUD; al editar reemplaza el set de ingredientes en transacción; valida
      que la unidad del ingrediente sea del mismo tipo que el insumo] +
      CostoRecetaService [responsabilidad única; reutiliza ConversionService de
      F5 para llevar cada ingrediente a base y valora al costo del momento =
      costoPromedio de la existencia; costo por bolsa = costoReceta/rendimiento;
      insumo sin existencia aporta 0]. Endpoints GET /recetas[/:id][/producto/
      :productoId], POST, PATCH, DELETE; solo admin/super_admin. libs/shared:
      RecetaDto/ResumenDto/IngredienteDto + Crear/Actualizar. Web: /recetas en
      NAV_ITEMS [admin/super_admin], listado con costo por bolsa y editor con
      ingredientes dinámicos [FormArray] y costo por bolsa EN VIVO. NOTA: la app
      es ZONELESS — las filas del FormArray se enlazan con `[formGroup]="grupo"`
      [no `[formGroupName]`] y la reactividad del costo/opciones se apoya en un
      signal del form [toSignal(valueChanges)]. Verificado contra BD [costeo
      ≈1000 con precisión de 6 decimales, costo/bolsa 5 y 10 al reeditar, 409
      receta duplicada, 400 unidad de otro tipo, 401 sin token, borrado en
      cascada] y UI desktop [alta con costo en vivo, receta en lista]; tests
      api[+2: costo receta y costo/bolsa] + web[+3: recetas service] verdes.)
- [x] Feature 7 — Producción
      (Depende de F6 recetas y F5 inventario/conversión. Prisma: `orden_produccion`
      [fecha, productoId, recetaId, sacos Decimal(12,2), bolsasEsperadas Int
      congelada = round(sacos×rendimiento), bolsasReales Int? capturado aparte,
      costoDelMomento Decimal(12,2) congelado al confirmar, estado enum
      EstadoProduccion BORRADOR→CONFIRMADA/ANULADA, motivoAnulacion?, confirmadaEn?,
      sucursalId NOT NULL default] y `movimiento_inventario` [INMUTABLE, base del
      kardex de F8: insumoId, sucursalId, tipo enum TipoMovimiento {ENTRADA, SALIDA,
      AJUSTE — hoy solo SALIDA}, cantidadBase Decimal(18,4), costoUnitario
      Decimal(18,6), ordenProduccionId? como origen, fecha]; migración versionada
      con CHECK sacos>0, bolsas no-neg y cantidad_base>0. Backend (SOLID): se
      extrajo `CosteoModule` que provee la estrategia por token [reusado por compras
      e inventario, sin provider duplicado] y se amplió la interfaz EstrategiaCosteo
      con `valorarSalida` [abierto/cerrado: en promedio ponderado la salida se valora
      al promedio vigente y el promedio NO cambia]. `InventarioService` [SOLID-S;
      DI] descuenta stock y asienta el movimiento de salida DENTRO de la transacción
      del llamador. `ProduccionService`: crear [exige receta; congela bolsasEsperadas],
      confirmar [en UNA transacción: agrega consumo por insumo = cantidad×sacos→base
      via ConversionService de F5, descuenta y asienta un movimiento por insumo,
      congela costoDelMomento = Σ; IDEMPOTENTE: orden CONFIRMADA no re-descuenta;
      rollback total si falta stock→400], capturarBolsasReales [merma = esperadas−
      reales, calculada], anular [motivo obligatorio; deja rastro]. Endpoints
      GET /produccion[/:id], POST, POST /:id/confirmar, PATCH /:id/bolsas-reales,
      POST /:id/anular; solo admin/super_admin. NOTA: anular registra el motivo pero
      NO revierte el inventario de una orden ya confirmada [la reversión via AJUSTE
      queda para el kardex de F8]. libs/shared: OrdenProduccionDto/ResumenDto,
      ConsumoOrdenDto, enums + DTOs crear/confirmar/bolsas-reales/anular. Web:
      /produccion en NAV_ITEMS [admin/super_admin], listado tabla→tarjetas con Tag de
      estado, alta con bolsas esperadas EN VIVO [zoneless: toSignal(valueChanges)+
      computed], confirmar [p-confirmDialog], capturar reales, anular con motivo y
      diálogo de detalle con los consumos. Verificado contra BD [e2e 26/26: esperadas
      1×200=200, confirma y baja stock 90718.4→45359.2 g, 1 movimiento SALIDA por
      insumo con origen=orden, costoDelMomento≈3000, doble confirmación NO descuenta
      de más, merma 200−195=5, producto sin receta 400, stock insuficiente 400 con
      rollback, anular con/sin motivo, 401 sin token, movimientos NO se borran] y UI
      [alta con 400 en vivo, orden en lista]; tests api[+4: valorarSalida, salida de
      inventario, crear/idempotencia] + web[+4: produccion service] verdes.)
- [x] Feature 8 — Inventario / existencias
      (Capa de CONSULTA sobre existencias (F5) y movimientos (compras/producción).
      Prisma: se añadió `insumo.stock_minimo` Decimal(18,4) default 0 [umbral de
      alerta, editable en la pantalla de Insumos] y `movimiento_inventario.compra_id`
      [origen de las ENTRADA]. MIGRACIÓN con BACKFILL: asienta una ENTRADA por cada
      compra existente [INSERT…SELECT idempotente] para que el kardex incluya el
      histórico de F5. Sin drift del censo. Backend: se EXTENDIÓ la interfaz de
      costeo NO [eso fue F7]; aquí ComprasService DELEGA su mutación de inventario
      en InventarioService.registrarEntrada [upsert de existencia con promedio
      ponderado + asiento ENTRADA], centralizando la escritura de movimientos [ya no
      duplica la lógica; compras quedó más delgado]. ConsultaInventarioService
      [SOLID-S, solo lectura, reutiliza ConversionService y sucursal default]:
      existencias [stock en base + equivalente legible g/kg·ml/L·u + costo/valor +
      bandera bajoStock], kardex/:insumoId [movimientos en orden con saldo acumulado
      y origen "Compra #/Producción #"; el saldo final cuadra con la existencia],
      cobertura [POST {productoId, sacosPorDia}: días = stock_base ÷ consumo_diario_
      base por insumo de la receta; devuelve el mínimo y el insumo limitante],
      alertas [insumos con stockMinimo>0 y stock<umbral]. Endpoints GET
      /inventario/existencias|alertas|kardex/:id y POST /inventario/cobertura; SOLO
      JwtAuthGuard [los 3 roles consultan; el vendedor en lectura]. libs/shared:
      StockDto, MovimientoKardexDto/KardexDto, Cobertura(Request|InsumoDto|
      ResultadoDto), AlertaStockDto; +stockMinimo en InsumoDto/Crear/Actualizar. Web:
      /inventario en NAV_ITEMS [todos], 4 vistas [existencias, panel de alertas,
      kardex por insumo con saldo, calculadora de cobertura] tabla→tarjetas, zoneless
      con signals+ngModel; +campo stockMinimo en el formulario de Insumos. Verificado
      contra BD [e2e 15/15: stock = entrada−salida (88450.44), equivalente kg,
      bajoStock, kardex 2 mov con origen Compra/Producción y saldo que cuadra,
      cobertura 19.5 días con insumo limitante, sin receta 400, alertas, 401] y UI
      [4 vistas, captura]; backfill verificado [1 compra→1 ENTRADA] y compras ahora
      asienta ENTRADA automáticamente. NOTA: la merma de PRODUCTO TERMINADO [pan que
      se pudre/pierde] NO se cubre aquí [el inventario es de insumos]; queda como
      feature futura. tests api[+5: kardex, cobertura, equivalente, bajoStock; compras
      spec actualizado] + web[+4: inventario service] verdes.)
- [x] Feature 9 — Facturación
      (Depende de productos+precios (F3) y clientes (F4). Prisma: enums EstadoFactura
      (BORRADOR/EMITIDA/ANULADA) y TipoPago (CONTADO/CREDITO); `configuracion` [fila
      única sembrada: isvActivo, tasaIsv, facturacionFiscalActiva, cai*, pinEdicionActivo
      — todas apagadas; edición en F12]; `factura` [sucursalId default, clienteIdentidad?
      OPCIONAL (consumidor final), usuarioId (quién), estado, tipoPago, subtotal/impuesto/
      total guardados al emitir, campos fiscales cai/numero nullable apagados por bandera,
      motivoAnulacion?, emitidaEn?]; `factura_detalle` [SNAPSHOT nombreProducto +
      precioUnitario; tasaImpuesto por línea default 0; cascade]; `abono`; `factura_bitacora`
      [quién/cuándo/campo/valorAnterior/valorNuevo/motivo]. Migración con CHECKs (montos≥0,
      cantidad>0, tasa∈[0,1], abono>0). Backend (SOLID): EstrategiaImpuesto tras interfaz +
      token (ImpuestoModule) → impuesto por línea; FacturasService [crear/editar/emitir/anular/
      abonar] con el snapshot tomado del precio vigente al construir las líneas; calculo-pago
      (función pura): saldo y estadoPago (PENDIENTE/PARCIAL/PAGADA) CALCULADOS desde los abonos
      (contado emitida = PAGADA); BitacoraService escribe el rastro al emitir/editar-emitida/
      anular dentro de la transacción. Editar una EMITIDA exige motivo (una fila de bitácora
      por campo); BORRADOR libre; ANULADA terminal; nada se borra. PIN apagado, no implementado.
      ConfiguracionService (lectura) + GET /configuracion. Endpoints GET /facturas[/:id], POST,
      PATCH :id, POST :id/{emitir,anular,abonos}; todos los roles (vendedor incluido), autoría
      por @CurrentUser. libs/shared: Factura/Detalle/Abono/Bitacora DTOs, ConfiguracionDto,
      enums+labels, DTOs crear/editar/anular/abono. Web: /facturas en NAV_ITEMS [todos]; lista
      con Tag de estado/pago, editor (cliente opcional + líneas FormArray + totales en vivo,
      zoneless), emitir (confirm), anular con motivo, abonos con saldo/estado recalculados, y
      detalle imprimible (window.open). Verificado contra BD [e2e 21/21: snapshot (cambiar
      precio NO altera la factura, total queda 60), contado emitida PAGADA, impuesto por línea
      50→7.5→57.5, editar emitida sin motivo 400 / con motivo deja bitácora, abonos 60→PARCIAL
      saldo 40 →PAGADA, sobrepago 400, anular sin/ con motivo, no se borra, 401] y UI [factura
      200×L2=L400 con snapshot, emitida; captura]. NOTA del dominio: una masa que produce VARIOS
      productos / costo por bolsa real es una revisión futura de Producción; no afecta a
      Facturación (cada variante es un producto+precio). tests api[+9: impuesto, calculo-pago,
      reglas de estado] + web[+4: facturas service] verdes.)
- [x] Feature 10 — Reportes y ganancias
      (Capa de CONSULTA (solo lectura) sobre F9 (facturas) y F7 (movimientos). NO crea
      tablas. Backend: módulo `reportes` con ReportesService (SOLID-S) que REUTILIZA
      CostoRecetaService [F6, exportado desde RecetasModule] para el costo por bolsa y
      calcularPago [F9] para los saldos — no duplica lógica. Cuatro reportes: (1)
      ventas por periodo [facturas EMITIDA en rango: resumen subtotal/impuesto/total +
      desglose por día]; (2) ganancia por producto [de factura_detalle: ingreso = Σ
      (precioUnitario SNAPSHOT × cantidad) − costo por bolsa actual × cantidad;
      productos sin receta van conCosteo=false, ganancia=ingreso]; (3) consumo de
      insumos [agrega movimiento_inventario SALIDA del periodo por insumo → cuadra con
      la producción]; (4) cuentas por cobrar [facturas CREDITO EMITIDA con saldo>0].
      Endpoints GET /reportes/{ventas,ganancia-por-producto,consumo-insumos}?desde&hasta
      (YYYY-MM-DD, rango inclusivo, valida 400) y /reportes/cuentas-por-cobrar; SOLO
      admin/super_admin. libs/shared: VentasReporteDto/VentaPorDiaDto, GananciaReporteDto/
      ProductoDto, ConsumoInsumosReporteDto/InsumoDto, CuentasPorCobrarReporteDto/
      CuentaPorCobrarDto, PeriodoReporte. Web: /reportes en NAV_ITEMS [admin/super_admin],
      filtro de periodo común (input date, default mes en curso) + 4 secciones con
      tablas tabla→tarjetas; cuentas por cobrar carga aparte (saldo vivo). Verificado
      contra BD [e2e 16/16: ventas total 150 / 2 facturas, fecha inválida 400, ganancia
      ingreso 150 por snapshot (cambiar precio a 999 NO lo altera) − costo/bolsa 1 =
      135, consumo 2000 g / L200 (cuadra con 2 sacos × 1 kg), cuentas por cobrar saldo
      30 = 50−20, 401] y UI [4 reportes con los números exactos; captura]. NOTA: el
      costo de la ganancia usa el costo por bolsa ACTUAL (promedio ponderado vigente);
      el costo histórico por venta y la masa→varios productos quedan para la revisión
      futura de Producción. tests api[+5: ganancia, consumo, cuentas, rango] + web[+4:
      reportes service] verdes.)
- [x] Mejora — Costos indirectos + Seed de demo (Pan Blanco)
      (Mejora del costeo: ahora el costo por bolsa incluye COSTOS INDIRECTOS. Prisma:
      enum `TipoCostoIndirecto` (POR_QUINTAL/POR_MES), tabla `costo_indirecto`
      [nombre único, monto, tipo, activo; no se borra, se desactiva] y campo
      `quintalesPorMes` en `configuracion` [base del prorrateo POR_MES]; migración con
      CHECK monto≥0 y quintales_por_mes>0. `CostoRecetaService` extendido: indirecto
      por lote = Σ POR_QUINTAL + Σ POR_MES/quintalesPorMes; `costoReceta = materiales +
      indirecto`, `costoPorBolsa = costoReceta/rendimiento`. Esto cambia el costo/bolsa
      en Recetas y la ganancia en Reportes (ahora incluyen indirectos). Supuesto: 1
      lote ≈ 1 quintal para el prorrateo. RecetaDto expone costoMateriales/costoIndirecto.
      Backend: módulo `costos-indirectos` (CRUD sin borrado + PATCH /parametros para
      quintalesPorMes; ConfiguracionService gana actualizarQuintalesPorMes que invalida
      su caché). Endpoints GET/POST/PATCH /costos-indirectos[/:id][/estado][/parametros];
      solo admin/super_admin. libs/shared: CostoIndirectoDto/Resumen + DTOs + labels.
      Web: /costos-indirectos en NAV_ITEMS [admin/super_admin] con CRUD, activar/
      desactivar, edición de quintalesPorMes e indirecto por lote en vivo.
      SEED DE DEMO (`apps/api/prisma/seed-demo.ts`, script `pnpm prisma:seed:demo`):
      IDEMPOTENTE (busca por nombre; la compra se crea solo si el insumo no tiene una;
      no toca el seed base). Siembra 7 insumos + una compra c/u (costo exacto por
      presentación, stock para ~10 quintales), producto "Pan Blanco" (precio 7.50),
      receta (quintal, rendimiento 350) y los costos indirectos (Mano de obra 350
      POR_QUINTAL, Luz/agua/gas 22000 POR_MES, quintalesPorMes 100). Imprime el desglose.
      Verificado [seed + API + UI]: materiales ≈1314.13, indirecto 570, total ≈1884.13,
      costo/bolsa L5.38, ganancia/bolsa L2.12; pantalla muestra indirecto por lote 570 y
      la receta lista costo/bolsa 5.38. tests api[+1 indirecto en costo-receta] +
      web[+3 costos-indirectos service] verdes.)
- [x] Mejora — Reversión de inventario al anular producción
      (Cierra la deuda de F7: anular una orden CONFIRMADA ahora DEVUELVE el
      inventario consumido. SIN migración [reusa el enum AJUSTE y el origen
      ordenProduccionId ya existentes; la CHECK cantidad_base>0 se cumple porque la
      reversión es positiva]. InventarioService gana `revertirSalida` [inverso de
      registrarSalida: por cada SALIDA asentada reintegra la misma cantidad al
      MISMO costo al que salió vía estrategia.aplicarEntrada y asienta un AJUSTE
      positivo con origen la orden; si no hubo compras intermedias el saldo y el
      promedio vuelven exactos a su valor original]. ProduccionService.anular: si la
      orden estaba CONFIRMADA, lee sus movimientos SALIDA y los revierte DENTRO de
      la misma transacción que el cambio de estado [atómico]; BORRADOR solo cambia de
      estado [no consumió nada]. orden.mapper: `consumos` filtra a SALIDA [la
      reversión AJUSTE se ve en el kardex, no en los consumos de la orden].
      inventario.mapper: un AJUSTE con origen una orden se etiqueta "Anulación
      producción #N". El costoDelMomento congelado de la orden NO se toca [registro
      histórico]. NOTA: el reporte de consumo de insumos [F10] sigue sumando solo
      SALIDA, así que una producción anulada cuenta su consumo histórico [la
      reversión AJUSTE no lo netea]; el stock/kardex SÍ cuadra. Verificado contra BD
      [e2e 11/11: crear+confirmar baja stock, anular con motivo devuelve el stock de
      TODOS los insumos a su valor original, último movimiento del kardex = AJUSTE
      "Anulación producción #N" con saldo que cuadra, no se anula dos veces 400,
      orden anulada conserva sus consumos SALIDA]; datos de prueba limpiados. tests
      api[+1: anular revierte inventario] verdes [49 total].)
- [x] Mejora — Ajuste manual de inventario de insumos
      (Conteo físico / merma de insumo / regalo de insumo: corrige el stock de un
      INSUMO con motivo, dejando rastro en el kardex. [OJO de dominio: el pan
      terminado que se regala al cliente NO es esto; va como cortesía en la venta,
      facturación. El inventario es de insumos.] Migración
      20260619212613_ajustes_inventario: 2 columnas NULLABLE en
      `movimiento_inventario` — `motivo` [texto] e `incrementa` [bool: dirección del
      AJUSTE, ya que cantidad_base siempre es >0]. Los AJUSTE previos [reversión de
      producción] quedan con incrementa=NULL → el kardex los sigue tratando como
      suma [compatible]. Backend [SOLID]: InventarioService gana `registrarAjuste`
      [tx-bound: aumento entra al costo promedio vigente, disminución valora al
      promedio y valida stock≥0; en ambos el promedio NO cambia; asienta AJUSTE con
      motivo+incrementa]. `AjustesService` [SOLID-S] resuelve la sucursal default,
      valida que la unidad sea del MISMO tipo que el insumo, convierte a base
      [reusa ConversionService] y abre la transacción; devuelve el StockDto
      actualizado. Endpoint POST /inventario/ajustes, SOLO admin/super_admin [a
      nivel de método, sobre el InventarioController que el resto consulta].
      consulta-inventario kardex: el signo resta si SALIDA o AJUSTE con
      incrementa=false, suma el resto; el mapper expone `motivo` y etiqueta el
      AJUSTE manual como "Ajuste manual". libs/shared: CrearAjusteRequest +
      `motivo` en MovimientoKardexDto. Web: en /inventario [Existencias], botón
      "Ajustar" por insumo [solo admin/super_admin] → diálogo con dirección
      [Aumentar/Disminuir], cantidad + unidad [filtrada por tipo del insumo,
      default la base] y motivo; el kardex muestra el motivo bajo el origen.
      Zoneless con signals+ngModel. Verificado contra BD [e2e 15/15: aumentar 2kg
      suma 2000 g sin tocar el promedio, disminuir 2kg devuelve el stock,
      disminución mayor al stock 400, unidad de otro tipo 400, motivo vacío 400, sin
      token 401, kardex muestra los 2 AJUSTE con origen "Ajuste manual", signo
      +1/−1 y saldo que cuadra]; datos de prueba limpiados. tests api[+3:
      registrarAjuste aumento/disminución/insuficiente — 52 total] + web[+1:
      ajustar — 34 total] verdes.)
- [x] Mejora — Proveedor en compras
      (Registrar A QUIÉN se le compra cada lote. Migración 20260619222612_proveedores:
      tabla `proveedor` [nombre ÚNICO, telefono?, activo, timestamps; no se borra, se
      desactiva] + columna NULLABLE `proveedor_id` en `compra` [FK ON DELETE SET NULL;
      las compras viejas y "sin proveedor" siguen válidas] e índice. Backend:
      ProveedoresModule [CRUD sin borrado; nombre único validado case-insensitive →
      409 además del índice en BD; solo admin/super_admin, igual que compras].
      ComprasService: acepta `proveedorId` OPCIONAL [valida que exista→404 y esté
      activo→400], lo guarda, lo incluye en el DTO [proveedorId/proveedorNombre] y
      permite filtrar GET /compras?proveedorId. libs/shared: ProveedorDto +
      Crear/Actualizar; +proveedorId/proveedorNombre en CompraDto y proveedorId? en
      CrearCompraRequest. Web: pantalla /proveedores en NAV_ITEMS [admin/super_admin]
      con CRUD [tabla→tarjetas, alta/edición, activar/desactivar]; selector de
      proveedor [opcional, con limpiar] en el alta de compra y columna Proveedor en el
      listado. Verificado contra BD [e2e 9/9: crear, nombre duplicado case-insensitive
      409, actualizar, compra con proveedor inexistente 404 / inactivo 400 / activo OK
      trae proveedorNombre, compra sin proveedor → null, filtro por proveedor] + UI
      [3/3: pantalla carga, alta aparece en tabla, selector en el form de compra];
      datos de prueba limpiados. tests api[52, sin nuevos unit — cubierto por e2e] +
      web[+3: proveedores service — 37 total] verdes.)
- [x] Mejora — Método de pago en contado
      (Registrar CÓMO se pagó una venta de CONTADO; alimenta el arqueo futuro [#5].
      Las de CRÉDITO ya guardan el método por abono [abono.metodo], así que esto solo
      aplica a contado. Migración 20260622161121_metodo_pago_factura: columna NULLABLE
      `metodo_pago` VARCHAR(30) en `factura` [las facturas viejas quedan con NULL,
      compatibles]. Métodos: Efectivo/Tarjeta/Transferencia/Cheque [const METODOS_PAGO
      = METODOS_ABONO en libs/shared]. Backend: FacturasService.resolverMetodoPago
      [SOLID-S helper] EXIGE método si tipoPago=CONTADO [400 si falta] y lo fuerza a
      NULL en crédito; se aplica al crear y al actualizar [si pasa de crédito→contado
      exige método; de contado→crédito lo limpia]. Cambiar el método en una EMITIDA
      exige motivo y deja una fila de bitácora [campo "metodoPago", igual que tipoPago].
      Guard extra al EMITIR: un contado sin método → 400. DTO valida @IsIn(METODOS_PAGO)
      cuando viene; mapper expone metodoPago. libs/shared: +metodoPago en FacturaDto y
      en Crear/ActualizarFacturaRequest + const METODOS_PAGO. Web: en el editor de
      factura, selector "Método de pago" visible SOLO en contado [computed esContado
      sobre el signal del form, zoneless], default Efectivo; se envía solo en contado;
      el detalle y la impresión muestran "Pago: Contado · Efectivo". Verificado contra
      BD [e2e 13/13: crear contado con método guarda Tarjeta, contado sin método 400,
      método inválido 400, crédito ignora el método → null, emitir conserva el método,
      editar método en EMITIDA con motivo → bitácora Tarjeta→Efectivo] y UI [selector
      visible en contado]; datos de prueba limpiados [facturas de prueba borradas].
      tests api[+1: emitir contado sin método 400 — 53 total] + web[37 total, cubierto
      por e2e] verdes.)
- [ ] Feature 11 — Deploy
- [ ] Feature 12 — Configuración
