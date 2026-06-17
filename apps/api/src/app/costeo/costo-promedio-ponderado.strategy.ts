import { Injectable } from '@nestjs/common';
import {
  EntradaCosteo,
  EstrategiaCosteo,
  SaldoCosteo,
} from './estrategia-costeo';

/**
 * Costo promedio ponderado:
 *   nuevo_costo = (valor_actual + costo_total_lote) / (cantidad_actual + cantidad_lote)
 * donde valor_actual = cantidad_actual * costo_promedio_actual.
 */
@Injectable()
export class CostoPromedioPonderadoStrategy implements EstrategiaCosteo {
  aplicarEntrada(saldo: SaldoCosteo, entrada: EntradaCosteo): SaldoCosteo {
    const cantidadBase = saldo.cantidadBase + entrada.cantidadBase;
    if (cantidadBase <= 0) {
      return { cantidadBase: 0, costoPromedio: 0 };
    }
    const valorPrevio = saldo.cantidadBase * saldo.costoPromedio;
    const valorTotal = valorPrevio + entrada.costoTotal;
    return { cantidadBase, costoPromedio: valorTotal / cantidadBase };
  }
}
