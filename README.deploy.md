# Despliegue con Docker — Sistema de Panadería

Este documento cubre el **empaque de producción**: un solo contenedor de app
(la API de NestJS que además **sirve el frontend Angular ya compilado**) más un
contenedor de PostgreSQL. Está pensado para correr primero en una **laptop
Windows** (solo para ejecutar) y luego **migrar al VPS Linux sin rehacer la
configuración**: el mismo `docker-compose.prod.yml` sirve para ambos.

> Esto es **aparte** del `docker-compose.yml` de desarrollo (que solo levanta
> Postgres). No lo reemplaza.

## Qué contiene el paquete

| Archivo | Para qué |
|---|---|
| `Dockerfile` | Imagen multi-stage: compila web + API y deja una imagen final chica (Alpine) que corre el build (no ts-node). |
| `docker-compose.prod.yml` | Levanta `postgres` + `app`. Todo por variables de entorno. |
| `docker/entrypoint.sh` | Al arrancar: `prisma migrate deploy` → seed base → seed demo (opcional) → API. Idempotente. |
| `.env.prod.example` | Plantilla de variables. Se copia a `.env`. |
| `scripts/backup.sh` · `scripts/backup.ps1` | Respaldo (`pg_dump`) a `backups/pane_FECHA.dump`. |
| `scripts/restore.sh` · `scripts/restore.ps1` | Restauración de un respaldo. |

**Cómo sirve el frontend:** Angular llama al backend por ruta **relativa `/api`**,
así que funciona igual en `localhost` y en el VPS **sin cambiar URLs**. En
producción la API sirve los estáticos de Angular y hace *fallback* a `index.html`
para las rutas del router (recargar `/facturas` funciona), excluyendo `/api` y
`/health`.

---

## A) Correr en la laptop Windows

### 1. Instalar Docker Desktop

1. Instala **Docker Desktop para Windows** (usa el backend **WSL2**).
2. Ábrelo una vez y espera a que diga *"Engine running"*.

### 2. Limitar la RAM de WSL2 (importante con 8 GB)

Sin límite, WSL2 puede comerse casi toda la RAM. Crea el archivo
`C:\Users\TU_USUARIO\.wslconfig` con este contenido:

```ini
[wsl2]
memory=4GB
processors=2
swap=2GB
```

> ⚠️ El archivo debe llamarse **`.wslconfig`** exacto (sin `.txt` al final).
> Verifícalo en PowerShell:
> ```powershell
> dir "$env:USERPROFILE\.wslconfig"
> ```
> Debe listarlo como `.wslconfig`. Si aparece `.wslconfig.txt`, renómbralo.

Aplica el límite: cierra Docker Desktop y en PowerShell:

```powershell
wsl --shutdown
```

Espera unos segundos y vuelve a abrir Docker Desktop.

### 3. Preparar el `.env`

En la carpeta del proyecto (PowerShell):

```powershell
copy .env.prod.example .env
```

Edita `.env` y ajusta **como mínimo**:

- `POSTGRES_PASSWORD` → una contraseña fuerte (sin `@ : / ?`).
- `JWT_SECRET` → un secreto largo y aleatorio.
- `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` → tus credenciales de admin.
- `SEED_DEMO=true` en la laptop (verás datos de ejemplo del Pan Blanco).

### 4. Levantar

```powershell
docker compose -f docker-compose.prod.yml up -d --build
```

La **primera vez tarda** (descarga Postgres y compila Angular + Nest dentro de
la imagen). Es normal.

Verifica:

```powershell
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

En los logs de `app` deberías ver: *migraciones aplicadas → seed base → (seed
demo) → API lista*. Sal de los logs con `Ctrl+C` (no apaga nada).

### 5. Abrir la app

- En la laptop: **http://localhost:8080** (o el `APP_PORT` que pusiste).
- Health check: **http://localhost:8080/health**.

Inicia sesión con el `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` del `.env`.

### 6. Cargar el censo nacional (solo lectura, aparte)

El censo (~5M filas) **no va en la imagen**. La migración solo crea la tabla
`grl.censo_nacional` vacía. Para cargar tu archivo (ej. `censo.sql`), colócalo en
la raíz del proyecto y:

```powershell
docker compose -f docker-compose.prod.yml cp censo.sql postgres:/tmp/censo.sql
docker compose -f docker-compose.prod.yml exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/censo.sql'
docker compose -f docker-compose.prod.yml exec -T postgres rm -f /tmp/censo.sql
```

> El censo entra a la base, así que a partir de ahí **viaja dentro de los
> respaldos** (no hay que volver a cargarlo en el VPS).

### 7. Acceso desde otro dispositivo del WiFi (celular)

Para usar la app desde el celular en la misma red:

1. **IP de la laptop en la LAN.** En PowerShell:
   ```powershell
   ipconfig
   ```
   Anota la `Dirección IPv4` del adaptador WiFi (ej. `192.168.0.25`).
   Recomendado: fíjala como **IP estática** (o reserva por DHCP en el router)
   para que no cambie.

2. **Abrir el puerto en el Firewall de Windows** (una vez, PowerShell **como
   administrador**):
   ```powershell
   New-NetFirewallRule -DisplayName "Panaderia 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
   ```
   (usa el mismo número que tu `APP_PORT`).

3. Desde el celular (misma red WiFi), abre:
   **http://192.168.0.25:8080** (tu IP + puerto).

### 8. Respaldos en Windows

Genera un respaldo manual:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
```

Queda en `backups\pane_FECHA.dump`.

**Programarlo (Programador de tareas de Windows):**

1. Abre *Programador de tareas* → *Crear tarea…*
2. **Desencadenador:** diario, a la hora que quieras (ej. 2:00 a. m.).
3. **Acción:** *Iniciar un programa*.
   - Programa: `powershell.exe`
   - Argumentos:
     `-ExecutionPolicy Bypass -File "C:\ruta\al\proyecto\scripts\backup.ps1"`
   - Iniciar en: `C:\ruta\al\proyecto`
4. Marca *"Ejecutar aunque el usuario no haya iniciado sesión"* si quieres que
   corra siempre.

Restaurar un respaldo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore.ps1 backups\pane_FECHA.dump
```

### Comandos útiles

```powershell
docker compose -f docker-compose.prod.yml down          # apagar (conserva datos)
docker compose -f docker-compose.prod.yml up -d --build  # re-levantar / actualizar imagen
docker compose -f docker-compose.prod.yml logs -f app    # ver logs de la app
docker compose -f docker-compose.prod.yml down -v         # ⚠️ BORRA los datos (volumen)
```

---

## B) Migrar al VPS Linux

La idea: llevar el **código** (git) + el **`.env`** + el **último respaldo**, y
levantar con el mismo compose. Los datos entran por la restauración.

### 1. Instalar Docker en el VPS

En Ubuntu/Debian:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # re-inicia sesión tras esto
```

### 2. Traer el proyecto y configurar

```bash
git clone <tu-repo> pane && cd pane
cp .env.prod.example .env
nano .env         # ajusta credenciales; en el VPS suele ir SEED_DEMO=false
```

### 3. Levantar

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Esto crea la base vacía, aplica migraciones y siembra el super_admin. Verifica
`docker compose -f docker-compose.prod.yml logs -f app`.

### 4. Restaurar los datos de la laptop

Copia el último `backups/pane_FECHA.dump` de la laptop al VPS (por `scp`,
`rsync`, etc.) dentro de `backups/`, y restáuralo:

```bash
chmod +x scripts/*.sh
./scripts/restore.sh backups/pane_FECHA.dump
```

Esto reemplaza los datos sembrados con los reales (incluye clientes, facturas y
el censo ya cargado). La app queda idéntica a la de la laptop.

### 5. Respaldos en Linux (cron)

```bash
./scripts/backup.sh          # manual
crontab -e                    # programar
```

Añade (respaldo diario a las 2:00):

```cron
0 2 * * * cd /ruta/al/proyecto && ./scripts/backup.sh >> /var/log/pane-backup.log 2>&1
```

### 6. Dominio + HTTPS (paso posterior)

Hoy la app queda en `http://IP_DEL_VPS:8080`. Para un dominio con HTTPS, pon un
**reverse proxy** delante (no cambia nada del compose de la app):

- **Opción Caddy (más simple, HTTPS automático).** `Caddyfile`:
  ```caddyfile
  tu-dominio.com {
      reverse_proxy localhost:8080
  }
  ```
  Caddy obtiene y renueva el certificado de Let's Encrypt solo.

- **Opción Nginx + Certbot.** Un `server` que haga `proxy_pass http://localhost:8080;`
  y `certbot --nginx` para el certificado.

Apunta el DNS del dominio a la IP del VPS y abre los puertos 80/443 en el
firewall del proveedor.

---

## Notas de operación

- **Actualizar la app** (nuevo código): `git pull` y
  `docker compose -f docker-compose.prod.yml up -d --build`. Las migraciones
  nuevas se aplican solas al arrancar (idempotente).
- **Los seeds son idempotentes:** re-levantar no duplica ni pisa datos.
- **`down -v` borra los datos** (elimina el volumen `pane_pgdata_prod`). Para
  apagar sin perder datos usa `down` (sin `-v`).
- El volumen de producción (`pane_pgdata_prod`) es **distinto** del de
  desarrollo (`pane_pgdata`): no se mezclan.

---

## Uso en el día a día (laptop)

La app **no es un `.exe`**: es una web que corre dentro de Docker en la laptop,
que hace de "servidor". El usuario del negocio solo abre el navegador en
`http://localhost:8080` (en la laptop) o `http://IP-DE-LA-LAPTOP:8080` (desde el
celular u otra compu del WiFi). Puedes dejarle un **acceso directo** en el
escritorio que abra esa dirección, para que se sienta como un programa.

Para que "esté siempre disponible":

1. **Que Docker arranque solo con Windows.** Docker Desktop → *Settings →
   General* → activa *"Start Docker Desktop when you log in"*. Así, al prender la
   laptop, Docker se abre y la app vuelve sola (por `restart: unless-stopped`).
2. **Dejar Docker Desktop corriendo en segundo plano** (minimizado en la bandeja,
   junto al reloj). **Minimizar está bien; salir (Quit) apaga la app.**
3. La laptop debe estar **encendida** para que los demás dispositivos entren: es
   el servidor.

---

## Solución de problemas — "la app no abre"

Si el navegador muestra **"No se puede acceder a este sitio"** o
`ERR_CONNECTION_REFUSED`, casi siempre es que **Docker no está corriendo** (no es
que se perdieron datos: la base sigue guardada en disco). Revisa en orden:

1. **¿Docker Desktop está abierto?** Busca su ícono (ballena) en la bandeja del
   sistema. Si no está o dice *"Docker Desktop is stopped"*, ábrelo y espera a
   que diga **"Engine running"**. Los contenedores se levantan solos.

2. **¿Los contenedores están arriba?** En PowerShell, en la carpeta del proyecto:
   ```powershell
   docker compose -f docker-compose.prod.yml ps
   ```
   Deberías ver `pane-prod-app` y `pane-prod-postgres` en estado `running`/`Up`.
   Si no aparecen o están `exited`, re-levántalos (rápido, sin `--build`):
   ```powershell
   docker compose -f docker-compose.prod.yml up -d
   ```

3. **¿Sigue sin abrir?** Mira los logs de la app para ver el error:
   ```powershell
   docker compose -f docker-compose.prod.yml logs --tail=50 app
   ```

4. **Desde el celular no abre, pero en la laptop sí:** revisa que estén en el
   **mismo WiFi**, que uses la **IP correcta** de la laptop (`ipconfig`) y que la
   **regla del firewall** del puerto siga activa (ver sección A.7).

> ⚠️ Cerrar/"Quit" Docker Desktop **apaga la app** (deja de responder en el
> navegador), pero **no borra nada**. Al volver a abrir Docker, todo regresa con
> sus datos intactos. Lo único que borra los datos es `down -v`.
