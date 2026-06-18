import { Module } from '@nestjs/common';
import { UnidadesModule } from '../unidades/unidades.module';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { InventarioModule } from '../inventario/inventario.module';
import { ProduccionController } from './produccion.controller';
import { ProduccionService } from './produccion.service';

/**
 * Módulo de producción. Reutiliza ConversionService (UnidadesModule),
 * SucursalesService (SucursalesModule) e InventarioService (InventarioModule)
 * por DI. Al confirmar una orden, InventarioService descuenta el stock y asienta
 * los movimientos de salida dentro de la transacción de ProduccionService.
 */
@Module({
  imports: [UnidadesModule, SucursalesModule, InventarioModule],
  controllers: [ProduccionController],
  providers: [ProduccionService],
})
export class ProduccionModule {}
