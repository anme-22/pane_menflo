import { Module } from '@nestjs/common';
import { ESTRATEGIA_COSTEO } from './estrategia-costeo';
import { CostoPromedioPonderadoStrategy } from './costo-promedio-ponderado.strategy';

/**
 * Provee la estrategia de costeo por token (DI). Hoy es promedio ponderado;
 * cambiarla (FIFO/LIFO) solo toca este módulo, no a sus consumidores
 * (ComprasService, InventarioService). Una sola instancia compartida evita
 * providers duplicados en cada módulo.
 */
@Module({
  providers: [
    { provide: ESTRATEGIA_COSTEO, useClass: CostoPromedioPonderadoStrategy },
  ],
  exports: [ESTRATEGIA_COSTEO],
})
export class CosteoModule {}
