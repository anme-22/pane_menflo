/**
 * Abstracción del cálculo de impuesto de una factura (SOLID-D y O/C). Hoy el
 * impuesto es por línea (tasa default 0); mañana se puede inyectar otra regla
 * (ISV global, exoneraciones, etc.) sin tocar a FacturasService. Trabaja con
 * `number`; la conversión Decimal↔number ocurre en el borde (servicio).
 */

/** Una línea para calcular impuesto. */
export interface LineaImpuesto {
  precioUnitario: number;
  cantidad: number;
  /** Tasa 0..1. */
  tasaImpuesto: number;
}

/** Totales calculados de una línea. */
export interface LineaCalculada {
  subtotal: number;
  impuesto: number;
  total: number;
}

/** Totales de la factura + el desglose por línea (mismo orden de entrada). */
export interface TotalesFactura {
  subtotal: number;
  impuesto: number;
  total: number;
  porLinea: LineaCalculada[];
}

/** Estrategia que, dadas las líneas, calcula subtotal/impuesto/total. */
export interface EstrategiaImpuesto {
  calcular(lineas: LineaImpuesto[]): TotalesFactura;
}

/** Token de DI para inyectar la estrategia de impuesto. */
export const ESTRATEGIA_IMPUESTO = Symbol('EstrategiaImpuesto');
