/**
 * Servido del frontend (Angular ya compilado) desde la propia API.
 *
 * Responsabilidad única (SOLID-S): dejar que Nest sirva el SPA en producción sin
 * añadir dependencias (usa el Express que Nest ya trae). Se separa de `main.ts`
 * para que el arranque quede legible y esto sea testeable/reutilizable.
 *
 * Cómo funciona el orden de middlewares (importa):
 *  1. `useStaticAssets` sirve los archivos reales (JS, CSS, index.html en `/`).
 *  2. `app.init()` mapea las rutas de Nest (`/api/...` y `/health`).
 *  3. El fallback SPA se registra DESPUÉS de init: solo entra si Nest no
 *     respondió, y reenvía a `index.html` cualquier GET que no sea de la API
 *     (para que las rutas del router de Angular, p.ej. `/facturas`, funcionen al
 *     recargar). Las rutas `/api/*` y `/health` se excluyen para no tapar 404s
 *     legítimos de la API.
 */
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';

export async function servirFrontend(
  app: NestExpressApplication,
  webStaticPath: string,
  globalPrefix: string,
): Promise<void> {
  const indexHtml = join(webStaticPath, 'index.html');
  const apiPrefix = `/${globalPrefix}`;

  // 1) Archivos estáticos del build de Angular.
  app.useStaticAssets(webStaticPath);

  // 2) Mapear rutas de Nest antes de registrar el fallback.
  await app.init();

  // 3) Fallback SPA (se registra tras init → corre solo si Nest no respondió).
  const server = app.getHttpAdapter().getInstance();
  server.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    // No tapar la API ni el health check: que devuelvan sus propios 404.
    if (req.path === '/health' || req.path === apiPrefix || req.path.startsWith(`${apiPrefix}/`)) {
      return next();
    }
    return res.sendFile(indexHtml);
  });
}
