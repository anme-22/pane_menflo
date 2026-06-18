import { Module } from '@nestjs/common';
import { CosteoModule } from '../costeo/costeo.module';
import { InventarioService } from './inventario.service';

/**
 * Módulo de inventario. Hoy expone InventarioService (salida + movimiento),
 * que produccion recibe por DI. Reutiliza la estrategia de costeo (CosteoModule).
 * En la Feature 8 se ampliará con kardex, cobertura y alertas.
 */
@Module({
  imports: [CosteoModule],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
