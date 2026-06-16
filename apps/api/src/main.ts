/**
 * Punto de entrada de la API (NestJS).
 * Cargamos .env lo primero, antes de construir el grafo de módulos, para
 * garantizar que DATABASE_URL esté disponible cuando se cree PrismaService.
 */
import 'dotenv/config';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // El prefijo global 'api' aplica a todas las rutas EXCEPTO /health,
  // que debe quedar en la raíz para servir como sonda estándar.
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, { exclude: ['health'] });

  // Validación global de DTOs (preparado para las features con entrada de datos).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS abierto en desarrollo para que la web (Angular) consuma la API.
  app.enableCors();

  const port = process.env.API_PORT ?? process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.log(`🚀 API lista en http://localhost:${port}/${globalPrefix}`);
  Logger.log(`❤  Health check en http://localhost:${port}/health`);
}

bootstrap();
