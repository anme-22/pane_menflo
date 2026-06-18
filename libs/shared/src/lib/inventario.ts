/**
 * Contratos compartidos de Inventario / existencias (Feature 8).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 *
 * Es la capa de CONSULTA sobre las existencias (F5) y los movimientos que
 * generan compras (ENTRADA) y producción (SALIDA). Las cantidades y costos
 * viajan como STRING (Decimal de Prisma) para no perder precisión.
 */
import type { TipoUnidad } from './unidad-medida';
import type { TipoMovimiento } from './produccion';

/** Stock actual de un insumo (unidad base + equivalente legible + alerta). */
export interface StockDto {
  insumoId: number;
  insumoNombre: string;
  tipo: TipoUnidad;
  activo: boolean;
  /** Saldo en unidad base. */
  cantidadBase: string;
  /** Abreviatura de la unidad base (g, ml, u). */
  unidadBaseAbrev: string;
  /** Equivalente legible (p. ej. "133.81 kg", "2 L", "12 u"). */
  equivalente: string;
  /** Costo promedio ponderado por unidad base. */
  costoPromedio: string;
  /** Valor del stock = cantidadBase × costoPromedio. */
  valor: string;
  /** Umbral configurado (unidad base; 0 = sin alerta). */
  stockMinimo: string;
  /** true si stockMinimo > 0 y cantidadBase < stockMinimo. */
  bajoStock: boolean;
}

/** Un movimiento del kardex de un insumo, con saldo acumulado. */
export interface MovimientoKardexDto {
  id: number;
  fecha: string;
  tipo: TipoMovimiento;
  /** Origen legible ("Compra #3", "Producción #7"). */
  origen: string;
  /** Cantidad del movimiento en unidad base (positiva). */
  cantidadBase: string;
  /** +1 entrada, -1 salida (signo aplicado al saldo). */
  signo: 1 | -1;
  /** Costo por unidad base del movimiento. */
  costoUnitario: string;
  /** Saldo acumulado en unidad base tras este movimiento. */
  saldo: string;
}

/** Kardex completo de un insumo. */
export interface KardexDto {
  insumoId: number;
  insumoNombre: string;
  unidadBaseAbrev: string;
  /** Saldo final (debe coincidir con la existencia). */
  saldoFinal: string;
  movimientos: MovimientoKardexDto[];
}

/** Escenario de cobertura: producir `sacosPorDia` lotes de un producto. */
export interface CoberturaRequest {
  productoId: number;
  sacosPorDia: number;
}

/** Cobertura de un insumo dentro del escenario. */
export interface CoberturaInsumoDto {
  insumoId: number;
  insumoNombre: string;
  unidadBaseAbrev: string;
  /** Stock disponible en unidad base. */
  stockBase: string;
  /** Consumo diario en unidad base (= cantidad receta × sacosPorDia). */
  consumoDiarioBase: string;
  /** Días de cobertura = stockBase ÷ consumoDiarioBase (null si no consume). */
  diasCobertura: number | null;
}

/** Resultado de la calculadora de cobertura. */
export interface CoberturaResultadoDto {
  productoId: number;
  productoNombre: string;
  sacosPorDia: number;
  insumos: CoberturaInsumoDto[];
  /** Días que aguanta el escenario (= el mínimo de los insumos). */
  diasCoberturaMin: number | null;
  /** Insumo que se agota primero (limitante), o null. */
  insumoLimitante: string | null;
}

/** Insumo por debajo de su umbral de stock. */
export interface AlertaStockDto {
  insumoId: number;
  insumoNombre: string;
  unidadBaseAbrev: string;
  cantidadBase: string;
  stockMinimo: string;
  equivalente: string;
}
