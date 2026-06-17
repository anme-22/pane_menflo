import { Module } from '@nestjs/common';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';
import { PreciosService } from './precios.service';

/**
 * Módulo de productos. PrismaService llega por el PrismaModule global.
 * Separa la gestión de productos (ProductosService) de la lógica de precios
 * (PreciosService).
 */
@Module({
  controllers: [ProductosController],
  providers: [ProductosService, PreciosService],
})
export class ProductosModule {}
