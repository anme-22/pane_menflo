import { Module } from '@nestjs/common';
import { ESTRATEGIA_IMPUESTO } from './estrategia-impuesto';
import { ImpuestoPorLineaStrategy } from './impuesto-por-linea.strategy';

/**
 * Provee la estrategia de impuesto por token (DI). Hoy es por línea (default 0);
 * cambiarla no toca a FacturasService (abierto/cerrado).
 */
@Module({
  providers: [
    { provide: ESTRATEGIA_IMPUESTO, useClass: ImpuestoPorLineaStrategy },
  ],
  exports: [ESTRATEGIA_IMPUESTO],
})
export class ImpuestoModule {}
