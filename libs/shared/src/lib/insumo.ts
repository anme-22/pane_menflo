/**
 * Contratos compartidos de Insumos, Compras y Existencias (Feature 5).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 *
 * Las cantidades y costos viajan como STRING para no perder precisión decimal
 * (Prisma serializa Decimal como string; el front formatea para mostrar).
 */
import type { TipoUnidad } from './unidad-medida';

/** Abreviatura de la unidad BASE de cada tipo (peso→g, volumen→ml, conteo→u). */
export const ABREVIATURA_BASE: Record<TipoUnidad, string> = {
  peso: 'g',
  volumen: 'ml',
  conteo: 'u',
};

/** Etiqueta legible del tipo de insumo, para la UI. */
export const TIPO_LABEL: Record<TipoUnidad, string> = {
  peso: 'Peso',
  volumen: 'Volumen',
  conteo: 'Conteo',
};

/** Tipos válidos en runtime (para selects y validaciones). */
export const TIPOS_UNIDAD: readonly TipoUnidad[] = ['peso', 'volumen', 'conteo'];

/** Saldo de existencias (en unidad base) + costo promedio ponderado. */
export interface ExistenciaResumen {
  /** Cantidad en la unidad base del insumo. */
  cantidadBase: string;
  /** Costo promedio ponderado por unidad base. */
  costoPromedio: string;
}

/** Insumo (materia prima) con su existencia en la sucursal por defecto. */
export interface InsumoDto {
  id: number;
  nombre: string;
  tipo: TipoUnidad;
  activo: boolean;
  existencia: ExistenciaResumen;
  /** Umbral de stock bajo en unidad base (0 = sin alerta). */
  stockMinimo: string;
  creadoEn: string;
  actualizadoEn: string;
}

/** Crear insumo. El `tipo` define la unidad base y es fijo tras crearse. */
export interface CrearInsumoRequest {
  nombre: string;
  tipo: TipoUnidad;
  /** Umbral de stock bajo en unidad base (opcional; default 0). */
  stockMinimo?: number;
}

/** Actualizar insumo (el tipo no cambia para no romper el stock guardado). */
export interface ActualizarInsumoRequest {
  nombre?: string;
  /** Umbral de stock bajo en unidad base (0 = sin alerta). */
  stockMinimo?: number;
}

/** Compra (lote) tal como la expone la API. */
export interface CompraDto {
  id: number;
  insumoId: number;
  insumoNombre: string;
  fecha: string;
  /** Cantidad en la unidad de compra. */
  cantidadCompra: string;
  unidadCompraId: number;
  unidadCompraAbrev: string;
  /** Costo TOTAL pagado por la compra. */
  costo: string;
  /** Cantidad convertida a la unidad base. */
  cantidadBase: string;
  /** Costo por unidad base del lote (= costo / cantidadBase). */
  costoPorUnidadBase: string;
}

/** Registrar una compra. `costo` es el TOTAL de la compra. */
export interface CrearCompraRequest {
  insumoId: number;
  unidadCompraId: number;
  cantidad: number;
  costo: number;
  /** ISO opcional; si no viene, se usa la fecha actual. */
  fecha?: string;
}
