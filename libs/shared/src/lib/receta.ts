/**
 * Contratos compartidos de Recetas (Feature 6).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 *
 * Cantidades y costos viajan como STRING (Decimal de Prisma) para no perder
 * precisión; el front formatea para mostrar.
 */
import type { TipoUnidad } from './unidad-medida';

/** Un ingrediente de la receta con su costeo al costo actual del insumo. */
export interface RecetaIngredienteDto {
  id: number;
  insumoId: number;
  insumoNombre: string;
  insumoTipo: TipoUnidad;
  /** Cantidad en la unidad indicada. */
  cantidad: string;
  unidadId: number;
  unidadAbrev: string;
  /** Cantidad convertida a la unidad base del insumo. */
  cantidadBase: string;
  /** Costo promedio actual del insumo por unidad base. */
  costoUnitario: string;
  /** Costo de este ingrediente (cantidadBase × costoUnitario). */
  costo: string;
}

/** Receta completa con sus ingredientes y costeo. */
export interface RecetaDto {
  id: number;
  productoId: number;
  productoNombre: string;
  /** Bolsas que rinde un lote. */
  rendimiento: number;
  /** Etiqueta del lote ("quintal", "saco"...). */
  unidadLote: string;
  ingredientes: RecetaIngredienteDto[];
  /** Costo total de un lote, valorando insumos al costo actual (promedio pond.). */
  costoReceta: string;
  /** costoReceta ÷ rendimiento. */
  costoPorBolsa: string;
}

/** Resumen para el listado (sin el detalle de ingredientes). */
export interface RecetaResumenDto {
  id: number;
  productoId: number;
  productoNombre: string;
  rendimiento: number;
  unidadLote: string;
  numIngredientes: number;
  costoReceta: string;
  costoPorBolsa: string;
}

/** Un ingrediente dentro de una petición de crear/actualizar receta. */
export interface IngredienteInput {
  insumoId: number;
  cantidad: number;
  unidadId: number;
}

/** Crear receta para un producto (que aún no tenga). */
export interface CrearRecetaRequest {
  productoId: number;
  rendimiento: number;
  unidadLote: string;
  ingredientes: IngredienteInput[];
}

/** Actualizar receta. Si `ingredientes` viene, reemplaza todo el set. */
export interface ActualizarRecetaRequest {
  rendimiento?: number;
  unidadLote?: string;
  ingredientes?: IngredienteInput[];
}
