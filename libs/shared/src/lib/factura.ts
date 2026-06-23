/**
 * Contratos compartidos de Facturación (Feature 9).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 *
 * Importes viajan como STRING (Decimal de Prisma) para no perder precisión.
 * El estado de pago y el saldo se CALCULAN (no son columnas).
 */

/** Estado del ciclo de vida de la factura. */
export type EstadoFactura = 'BORRADOR' | 'EMITIDA' | 'ANULADA';

/** Forma de pago. */
export type TipoPago = 'CONTADO' | 'CREDITO';

/** Estado de pago calculado a partir de los abonos. */
export type EstadoPago = 'PENDIENTE' | 'PARCIAL' | 'PAGADA';

export const ESTADO_FACTURA_LABEL: Record<EstadoFactura, string> = {
  BORRADOR: 'Borrador',
  EMITIDA: 'Emitida',
  ANULADA: 'Anulada',
};

export const TIPO_PAGO_LABEL: Record<TipoPago, string> = {
  CONTADO: 'Contado',
  CREDITO: 'Crédito',
};

export const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Parcial',
  PAGADA: 'Pagada',
};

/** Métodos de abono sugeridos (texto libre en la BD). */
export const METODOS_ABONO = ['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque'] as const;

/** Métodos de pago para ventas de CONTADO (los mismos que los abonos). */
export const METODOS_PAGO = METODOS_ABONO;

/** Línea de factura con su snapshot y totales calculados. */
export interface FacturaDetalleDto {
  id: number;
  productoId: number;
  /** Nombre del producto al momento de la venta (snapshot). */
  nombreProducto: string;
  /** Precio unitario al momento de la venta (snapshot). */
  precioUnitario: string;
  cantidad: string;
  /** Tasa de impuesto de la línea (0..1; default 0). */
  tasaImpuesto: string;
  /** precioUnitario × cantidad. */
  subtotalLinea: string;
  /** subtotalLinea × tasaImpuesto. */
  impuestoLinea: string;
  /** subtotalLinea + impuestoLinea. */
  totalLinea: string;
}

/** Abono (pago parcial). */
export interface AbonoDto {
  id: number;
  monto: string;
  fecha: string;
  metodo: string;
}

/** Entrada de la bitácora de la factura. */
export interface FacturaBitacoraDto {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  cuando: string;
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  motivo: string | null;
}

/** Factura completa con detalle, abonos, bitácora y los cálculos de pago. */
export interface FacturaDto {
  id: number;
  numero: string | null;
  clienteIdentidad: string | null;
  clienteNombre: string | null;
  usuarioId: number;
  usuarioNombre: string;
  estado: EstadoFactura;
  tipoPago: TipoPago;
  /** Cómo se pagó (solo CONTADO; null en crédito). */
  metodoPago: string | null;
  fecha: string;
  subtotal: string;
  impuesto: string;
  total: string;
  cai: string | null;
  caiRango: string | null;
  caiFechaLimite: string | null;
  motivoAnulacion: string | null;
  emitidaEn: string | null;
  detalles: FacturaDetalleDto[];
  abonos: AbonoDto[];
  bitacora: FacturaBitacoraDto[];
  /** Σ abonos (o el total, si es contado emitido). */
  totalAbonado: string;
  /** total − totalAbonado. */
  saldoPendiente: string;
  /** Calculado desde los abonos / tipo de pago. */
  estadoPago: EstadoPago;
  creadoEn: string;
}

/** Resumen para el listado (sin detalle/bitácora). */
export interface FacturaResumenDto {
  id: number;
  numero: string | null;
  fecha: string;
  clienteNombre: string | null;
  estado: EstadoFactura;
  tipoPago: TipoPago;
  total: string;
  saldoPendiente: string;
  estadoPago: EstadoPago;
}

/** Una línea dentro de una petición de crear/editar factura. */
export interface LineaFacturaInput {
  productoId: number;
  cantidad: number;
  /** Tasa de impuesto (0..1). Si se omite, sale del default (0 o ISV). */
  tasaImpuesto?: number;
}

/** Filtros + paginación del listado de facturas. */
export interface FacturasQuery {
  page?: number;
  pageSize?: number;
  estado?: EstadoFactura;
  tipoPago?: TipoPago;
  /** Rango por fecha de la factura (YYYY-MM-DD, inclusivo). */
  desde?: string;
  hasta?: string;
  /** Busca en número de factura y nombre del cliente. */
  buscar?: string;
}

/** Crear una factura (BORRADOR). El precio/nombre se snapshotan en el servidor. */
export interface CrearFacturaRequest {
  clienteIdentidad?: string | null;
  tipoPago: TipoPago;
  /** Método de pago. Obligatorio si `tipoPago` es CONTADO; ignorado en crédito. */
  metodoPago?: string;
  items: LineaFacturaInput[];
}

/**
 * Editar una factura. En BORRADOR es libre. En EMITIDA exige `motivo` (queda en
 * la bitácora). Los campos enviados reemplazan; `items` reemplaza todo el set.
 */
export interface ActualizarFacturaRequest {
  clienteIdentidad?: string | null;
  tipoPago?: TipoPago;
  /** Método de pago (CONTADO). Cambiarlo en una EMITIDA exige `motivo`. */
  metodoPago?: string;
  items?: LineaFacturaInput[];
  /** Obligatorio si la factura ya está EMITIDA. */
  motivo?: string;
}

/** Anular una factura (motivo obligatorio; deja rastro, no se borra). */
export interface AnularFacturaRequest {
  motivo: string;
}

/** Registrar un abono (solo facturas de crédito emitidas). */
export interface RegistrarAbonoRequest {
  monto: number;
  metodo: string;
  fecha?: string;
}
