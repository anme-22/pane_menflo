import { Module } from '@nestjs/common';
import { SucursalesService } from './sucursales.service';

/**
 * Módulo de sucursales. De momento solo provee el SucursalesService (resuelve
 * la sucursal por defecto), que insumos y compras reciben por DI.
 */
@Module({
  providers: [SucursalesService],
  exports: [SucursalesService],
})
export class SucursalesModule {}
