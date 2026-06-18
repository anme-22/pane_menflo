import type { EstadoFactura, EstadoPago, TipoPago } from '@pane/shared';

/** Resultado del cálculo de pago de una factura (no se almacena). */
export interface ResultadoPago {
  totalAbonado: number;
  saldoPendiente: number;
  estadoPago: EstadoPago;
}

const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Calcula el estado de pago y el saldo de una factura a partir de sus abonos.
 * Función PURA (fácil de testear). Regla:
 *  - CONTADO emitida: se considera pagada (saldo 0).
 *  - Crédito (o cualquier otro caso): se deriva de la suma de abonos.
 */
export function calcularPago(
  total: number,
  tipoPago: TipoPago,
  estado: EstadoFactura,
  montosAbonos: number[],
): ResultadoPago {
  if (tipoPago === 'CONTADO' && estado === 'EMITIDA') {
    return { totalAbonado: r2(total), saldoPendiente: 0, estadoPago: 'PAGADA' };
  }
  const totalAbonado = r2(montosAbonos.reduce((s, m) => s + m, 0));
  const saldoPendiente = r2(Math.max(0, total - totalAbonado));
  const estadoPago: EstadoPago =
    totalAbonado <= 0 ? 'PENDIENTE' : totalAbonado >= total ? 'PAGADA' : 'PARCIAL';
  return { totalAbonado, saldoPendiente, estadoPago };
}
