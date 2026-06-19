/**
 * Contratos compartidos de Costos indirectos (mejora de costeo).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 *
 * Los montos viajan como STRING (Decimal de Prisma) para no perder precisión.
 */

/** Periodicidad del costo indirecto. */
export type TipoCostoIndirecto = 'POR_QUINTAL' | 'POR_MES';

export const TIPO_COSTO_INDIRECTO_LABEL: Record<TipoCostoIndirecto, string> = {
  POR_QUINTAL: 'Por quintal',
  POR_MES: 'Por mes',
};

export const TIPOS_COSTO_INDIRECTO: readonly TipoCostoIndirecto[] = [
  'POR_QUINTAL',
  'POR_MES',
];

/** Un costo indirecto (mano de obra, luz/agua/gas...). */
export interface CostoIndirectoDto {
  id: number;
  nombre: string;
  monto: string;
  tipo: TipoCostoIndirecto;
  activo: boolean;
}

/** Listado + el parámetro de prorrateo (quintales producidos al mes). */
export interface CostosIndirectosResumenDto {
  items: CostoIndirectoDto[];
  quintalesPorMes: number;
  /** Indirecto por lote con los activos: Σ POR_QUINTAL + Σ POR_MES/quintalesPorMes. */
  indirectoPorLote: string;
}

/** Crear un costo indirecto. */
export interface CrearCostoIndirectoRequest {
  nombre: string;
  monto: number;
  tipo: TipoCostoIndirecto;
}

/** Actualizar un costo indirecto. */
export interface ActualizarCostoIndirectoRequest {
  nombre?: string;
  monto?: number;
  tipo?: TipoCostoIndirecto;
}

/** Actualizar el parámetro de prorrateo. */
export interface ActualizarParametrosRequest {
  quintalesPorMes: number;
}
