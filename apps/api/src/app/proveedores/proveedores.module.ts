import { Module } from '@nestjs/common';
import { ProveedoresController } from './proveedores.controller';
import { ProveedoresService } from './proveedores.service';

/**
 * Módulo de proveedores. PrismaService llega por el PrismaModule global.
 * Exporta el servicio por si otras capas (p. ej. compras) lo necesitan.
 */
@Module({
  controllers: [ProveedoresController],
  providers: [ProveedoresService],
  exports: [ProveedoresService],
})
export class ProveedoresModule {}
