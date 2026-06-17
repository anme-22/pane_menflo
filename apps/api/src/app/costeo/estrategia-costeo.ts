/**
 * Abstracción de la estrategia de costeo de inventario (SOLID-D y O/C).
 * Hoy se usa costo promedio ponderado; mañana se puede inyectar FIFO/LIFO sin
 * tocar a los consumidores (ComprasService depende de esta interfaz, no de la
 * implementación). Se trabaja con `number` para que la estrategia sea pura y
 * fácil de testear; la conversión Decimal↔number ocurre en el borde (servicio).
 */

/** Saldo actual de existencias (en unidad base). */
export interface SaldoCosteo {
  cantidadBase: number;
  /** Costo promedio por unidad base. */
  costoPromedio: number;
}

/** Entrada de inventario (un lote que ingresa). */
export interface EntradaCosteo {
  cantidadBase: number;
  /** Costo TOTAL del lote que ingresa. */
  costoTotal: number;
}

/** Estrategia que, dado el saldo y una entrada, calcula el nuevo saldo/costo. */
export interface EstrategiaCosteo {
  aplicarEntrada(saldo: SaldoCosteo, entrada: EntradaCosteo): SaldoCosteo;
}

/** Token de DI para inyectar la estrategia de costeo. */
export const ESTRATEGIA_COSTEO = Symbol('EstrategiaCosteo');
