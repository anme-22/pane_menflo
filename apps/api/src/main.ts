/**
 * Punto de entrada de la API (NestJS).
 * Cargamos .env lo primero, antes de construir el grafo de módulos, para
 * garantizar que DATABASE_URL esté disponible cuando se cree PrismaService.
 */
import 'dotenv/config';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { servirFrontend } from './serve-frontend';

async function bootstrap() {
  // Tipamos como NestExpressApplication para poder servir estáticos (el SPA) en
  // producción; en desarrollo no cambia nada (la web usa su propio dev-server).
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // El prefijo global 'api' aplica a todas las rutas EXCEPTO /health,
  // que debe quedar en la raíz para servir como sonda estándar.
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, { exclude: ['health'] });

  // Validación global de DTOs (preparado para las features con entrada de datos).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS abierto en desarrollo para que la web (Angular) consuma la API.
  app.enableCors();

  // --- Frontend en producción (un solo contenedor) ---
  // Si WEB_STATIC_PATH apunta a un directorio existente (así lo hace la imagen
  // Docker), la API sirve el Angular ya compilado y hace fallback SPA. En
  // desarrollo la variable no existe, por lo que esto queda inerte.
  const webStaticPath = process.env.WEB_STATIC_PATH;
  if (webStaticPath && existsSync(join(webStaticPath, 'index.html'))) {
    await servirFrontend(app, webStaticPath, globalPrefix);
    Logger.log(`🖥  Sirviendo frontend desde ${webStaticPath}`);
  }

  const port = process.env.API_PORT ?? process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  Logger.log(`🚀 API lista en http://localhost:${port}/${globalPrefix}`);
  Logger.log(`❤  Health check en http://localhost:${port}/health`);
}

bootstrap();
