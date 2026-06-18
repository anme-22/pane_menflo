import { Module } from '@nestjs/common';
import { CosteoModule } from '../costeo/costeo.module';
import { UnidadesModule } from '../unidades/unidades.module';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { ConsultaInventarioService } from './consulta-inventario.service';

/**
 * Módulo de inventario.
 * - InventarioService (escritura): entrada/salida de stock + asiento de
 *   movimientos dentro de la transacción del llamador (compras, producción).
 *   Reutiliza la estrategia de costeo (CosteoModule). Exportado por DI.
 * - ConsultaInventarioService (lectura, Feature 8): stock, kardex, cobertura y
 *   alertas. Reutiliza ConversionService y la sucursal por defecto.
 */
@Module({
  imports: [CosteoModule, UnidadesModule, SucursalesModule],
  controllers: [InventarioController],
  providers: [InventarioService, ConsultaInventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
