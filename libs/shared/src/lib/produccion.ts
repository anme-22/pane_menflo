/**
 * Contratos compartidos de Producción (Feature 7).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 *
 * Cantidades y costos viajan como STRING (Decimal de Prisma) para no perder
 * precisión; el front formatea para mostrar. Las bolsas son enteros.
 */

/** Estados de una orden de producción. */
export type EstadoProduccion = 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';

/** Tipos de movimiento de inventario (hoy solo se genera SALIDA). */
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

/** Etiquetas legibles de cada estado, para la UI. */
export const ESTADO_PRODUCCION_LABEL: Record<EstadoProduccion, string> = {
  BORRADOR: 'Borrador',
  CONFIRMADA: 'Confirmada',
  ANULADA: 'Anulada',
};

/** Un insumo consumido por una orden ya confirmada (asiento del movimiento). */
export interface ConsumoOrdenDto {
  movimientoId: number;
  insumoId: number;
  insumoNombre: string;
  /** Cantidad consumida en la unidad base del insumo. */
  cantidadBase: string;
  /** Abreviatura de la unidad base (g, ml, u). */
  unidadBaseAbrev: string;
  /** Costo promedio vigente al confirmar. */
  costoUnitario: string;
  /** cantidadBase × costoUnitario. */
  costo: string;
}

/** Orden de producción completa (con sus consumos si está confirmada). */
export interface OrdenProduccionDto {
  id: number;
  fecha: string;
  productoId: number;
  productoNombre: string;
  recetaId: number;
  /** Lotes (sacos/quintales) a producir. */
  sacos: string;
  /** Etiqueta del lote de la receta ("quintal", "saco"...). */
  unidadLote: string;
  /** Rendimiento de la receta (bolsas por lote) al crear la orden. */
  rendimiento: number;
  /** = sacos × rendimiento, congelado al crear. */
  bolsasEsperadas: number;
  /** Capturado tras producir; null si aún no. */
  bolsasReales: number | null;
  /** bolsasEsperadas − bolsasReales (null si no hay reales). */
  merma: number | null;
  /** Costo total de los insumos al confirmar (0 mientras es BORRADOR). */
  costoDelMomento: string;
  estado: EstadoProduccion;
  motivoAnulacion: string | null;
  confirmadaEn: string | null;
  /** Consumos generados al confirmar (vacío si aún no se ha confirmado). */
  consumos: ConsumoOrdenDto[];
}

/** Resumen para el listado (sin el detalle de consumos). */
export interface OrdenProduccionResumenDto {
  id: number;
  fecha: string;
  productoId: number;
  productoNombre: string;
  sacos: string;
  unidadLote: string;
  bolsasEsperadas: number;
  bolsasReales: number | null;
  merma: number | null;
  costoDelMomento: string;
  estado: EstadoProduccion;
}

/** Crear una orden: producto (con receta) + número de sacos. */
export interface CrearOrdenProduccionRequest {
  productoId: number;
  sacos: number;
  /** Opcional; por defecto la fecha del servidor (ISO). */
  fecha?: string;
}

/** Capturar las bolsas realmente producidas (para medir la merma). */
export interface CapturarBolsasRealesRequest {
  bolsasReales: number;
}

/** Anular una orden (motivo obligatorio; deja rastro, no se borra). */
export interface AnularOrdenProduccionRequest {
  motivo: string;
}
