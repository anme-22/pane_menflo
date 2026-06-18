import { Module } from '@nestjs/common';
import { UnidadesModule } from '../unidades/unidades.module';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { InventarioModule } from '../inventario/inventario.module';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';

/**
 * Módulo de compras. Recibe ConversionService (UnidadesModule), SucursalesService
 * (SucursalesModule) e InventarioService (InventarioModule) por DI. La entrada al
 * stock y el asiento del movimiento de ENTRADA los hace InventarioService.
 */
@Module({
  imports: [UnidadesModule, SucursalesModule, InventarioModule],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}
