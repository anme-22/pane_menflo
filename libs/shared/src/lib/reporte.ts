/**
 * Contratos compartidos de Reportes (Feature 10).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 *
 * Capa de CONSULTA sobre facturas (F9) y movimientos (F7). Importes/cantidades
 * como STRING (Decimal) para no perder precisión; las fechas en ISO `YYYY-MM-DD`.
 */

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
