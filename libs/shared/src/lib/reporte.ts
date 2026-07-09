/**
 * Contratos compartidos de Reportes (Feature 10).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 *
 * Capa de CONSULTA sobre facturas (F9) y movimientos (F7). Importes/cantidades
 * como STRING (Decimal) para no perder precisión; las fechas en ISO `YYYY-MM-DD`.
 */

import type { TipoPago } from './factura';

/** Filtro de periodo (inclusivo). */
export interface PeriodoReporte {
  desde: string;
  hasta: string;
}

// ---- Ventas por periodo ----

export interface VentaPorDiaDto {
  fecha: string;
  numFacturas: number;
  total: string;
}

export interface VentasReporteDto {
  desde: string;
  hasta: string;
  numFacturas: number;
  subtotal: string;
  impuesto: string;
  total: string;
  porDia: VentaPorDiaDto[];
}

// ---- Ventas detalladas por día (libro de ventas) ----

/** Una línea (producto) de una factura dentro del reporte detallado. */
export interface LineaVentaDto {
  productoId: number;
  /** Nombre del producto en el momento de la venta (snapshot). */
  nombreProducto: string;
  cantidad: string;
  /** Precio unitario del snapshot de la factura. */
  precioUnitario: string;
  /** cantidad × precioUnitario; 0 si la línea es cortesía (no cobra). */
  totalLinea: string;
  esCortesia: boolean;
}

/** Una factura emitida, con su cliente y sus líneas. */
export interface FacturaVentaDto {
  facturaId: number;
  numero: string | null;
  /** ISO completo (para mostrar la hora si se quiere). */
  fecha: string;
  clienteNombre: string | null;
  tipoPago: TipoPago;
  lineas: LineaVentaDto[];
  /** Total cobrado de la factura (excluye cortesías). */
  total: string;
}

/** Un día del periodo, con sus facturas y el total del día. */
export interface DiaVentaDto {
  /** Día en formato YYYY-MM-DD. */
  fecha: string;
  facturas: FacturaVentaDto[];
  numFacturas: number;
  /** Total vendido en el día (Σ total de sus facturas). */
  total: string;
}

/** Reporte de ventas detallado: por día → factura (cliente) → líneas. */
export interface VentasDetalladasReporteDto {
  desde: string;
  hasta: string;
  dias: DiaVentaDto[];
  numFacturas: number;
  total: string;
}

// ---- Ganancia por producto ----

export interface GananciaProductoDto {
  productoId: number;
  nombreProducto: string;
  cantidadVendida: string;
  /** Ingreso = Σ (precio de la FACTURA × cantidad) — snapshot, no el precio actual. */
  ingreso: string;
  /** Costo por bolsa actual (promedio ponderado vigente); null si el producto no tiene receta. */
  costoUnitario: string | null;
  /** costoUnitario × cantidadVendida; null si no hay costeo. */
  costoTotal: string | null;
  /** ingreso − costoTotal. */
  ganancia: string;
  /** false si el producto no tiene receta (la ganancia no descuenta costo). */
  conCosteo: boolean;
}

export interface GananciaReporteDto {
  desde: string;
  hasta: string;
  productos: GananciaProductoDto[];
  ingresoTotal: string;
  costoTotal: string;
  gananciaTotal: string;
}

// ---- Consumo de insumos ----

export interface ConsumoInsumoDto {
  insumoId: number;
  insumoNombre: string;
  unidadBaseAbrev: string;
  /** Cantidad consumida en unidad base (salidas de producción del periodo). */
  cantidadBase: string;
  costo: string;
}

export interface ConsumoInsumosReporteDto {
  desde: string;
  hasta: string;
  insumos: ConsumoInsumoDto[];
  costoTotal: string;
}

// ---- Cuentas por cobrar ----

export interface CuentaPorCobrarDto {
  facturaId: number;
  numero: string | null;
  fecha: string;
  clienteNombre: string | null;
  total: string;
  abonado: string;
  saldo: string;
}

export interface CuentasPorCobrarReporteDto {
  cuentas: CuentaPorCobrarDto[];
  totalPorCobrar: string;
}
