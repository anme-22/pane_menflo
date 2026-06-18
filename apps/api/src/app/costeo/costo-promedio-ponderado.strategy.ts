import { Injectable } from '@nestjs/common';
import {
  EntradaCosteo,
  EstrategiaCosteo,
  ResultadoSalida,
  SalidaCosteo,
  SaldoCosteo,
} from './estrategia-costeo';

/**
 * Costo promedio ponderado:
 *   nuevo_costo = (valor_actual + costo_total_lote) / (cantidad_actual + cantidad_lote)
 * donde valor_actual = cantidad_actual * costo_promedio_actual.
 * En una SALIDA el promedio NO cambia: la salida se valora al promedio vigente
 * y el saldo solo baja en cantidad.
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

  valorarSalida(saldo: SaldoCosteo, salida: SalidaCosteo): ResultadoSalida {
    const costoUnitario = saldo.costoPromedio;
    const costo = salida.cantidadBase * costoUnitario;
    return {
      costoUnitario,
      costo,
      // El promedio se conserva; solo baja la cantidad disponible.
      saldo: {
        cantidadBase: saldo.cantidadBase - salida.cantidadBase,
        costoPromedio: saldo.costoPromedio,
      },
    };
  }
}
