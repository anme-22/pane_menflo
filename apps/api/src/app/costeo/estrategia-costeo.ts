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

/** Salida de inventario (consumo, p. ej. de una producción). */
export interface SalidaCosteo {
  /** Cantidad que sale, en unidad base. */
  cantidadBase: number;
}

/** Resultado de valorar una salida: a qué costo sale y cómo queda el saldo. */
export interface ResultadoSalida {
  /** Costo unitario aplicado a la salida (en promedio ponderado, el promedio). */
  costoUnitario: number;
  /** Costo total de la salida (= cantidadBase × costoUnitario). */
  costo: number;
  /** Saldo resultante tras la salida. */
  saldo: SaldoCosteo;
}

/**
 * Estrategia de costeo de inventario. Sabe cómo afecta una ENTRADA al saldo/
 * costo y cómo valorar una SALIDA. Una variación futura (FIFO/LIFO) implementa
 * esta misma interfaz sin tocar a quien la usa (ComprasService, InventarioService).
 */
export interface EstrategiaCosteo {
  aplicarEntrada(saldo: SaldoCosteo, entrada: EntradaCosteo): SaldoCosteo;
  valorarSalida(saldo: SaldoCosteo, salida: SalidaCosteo): ResultadoSalida;
}

/** Token de DI para inyectar la estrategia de costeo. */
export const ESTRATEGIA_COSTEO = Symbol('EstrategiaCosteo');
