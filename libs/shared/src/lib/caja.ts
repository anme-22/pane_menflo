/**
 * Contratos compartidos de Caja / Arqueo (Mejora — sesión de caja completa).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 *
 * Una sesión de caja abre con un fondo, acumula el efectivo del periodo y se
 * cierra contando el efectivo físico contra el esperado (con su diferencia).
 * Los importes viajan como STRING (Decimal de Prisma) para no perder precisión.
 */

/** Estado de una sesión de caja. */
export type EstadoCaja = 'ABIERTA' | 'CERRADA';

/** Tipo de movimiento manual de caja. */
export type TipoMovimientoCaja = 'INGRESO' | 'EGRESO';

export const ESTADO_CAJA_LABEL: Record<EstadoCaja, string> = {
  ABIERTA: 'Abierta',
  CERRADA: 'Cerrada',
};

export const TIPO_MOVIMIENTO_CAJA_LABEL: Record<TipoMovimientoCaja, string> = {
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
};

/** Movimiento manual de caja (ingreso/egreso de efectivo que NO es una venta). */
export interface MovimientoCajaDto {
  id: number;
  tipo: TipoMovimientoCaja;
  monto: string;
  concepto: string;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
}

/**
 * Desglose del efectivo de la sesión, calculado dentro de la ventana
 * [abiertaEn, cerradaEn ?? ahora). Solo el EFECTIVO entra al esperado; las
 * ventas con otros métodos se reportan aparte (informativo).
 */
export interface CajaResumenDto {
  montoInicial: string;
  /** Ventas CONTADO en Efectivo emitidas dentro de la ventana. */
  ventasContadoEfectivo: string;
  /** Abonos de crédito en Efectivo dentro de la ventana. */
  abonosEfectivo: string;
  /** Σ de ingresos manuales. */
  ingresos: string;
  /** Σ de egresos manuales. */
  egresos: string;
  /** montoInicial + ventas + abonos + ingresos − egresos. */
  efectivoEsperado: string;
  /** Ventas con método distinto a efectivo (tarjeta/transferencia/cheque). Informativo. */
  ventasOtrosMetodos: string;
}

/** Sesión de caja completa (con movimientos y resumen en vivo). */
export interface CajaSesionDto {
  id: number;
  estado: EstadoCaja;
  montoInicial: string;
  usuarioAperturaId: number;
  usuarioAperturaNombre: string;
  abiertaEn: string;
  /** Conteo físico al cerrar (null si sigue abierta). */
  montoContado: string | null;
  /** Esperado congelado al cerrar (null si sigue abierta). */
  montoEsperado: string | null;
  /** montoContado − montoEsperado (null si sigue abierta). */
  diferencia: string | null;
  usuarioCierreNombre: string | null;
  cerradaEn: string | null;
  observacion: string | null;
  movimientos: MovimientoCajaDto[];
  /** Desglose calculado en vivo (cuadra con lo congelado si está CERRADA). */
  resumen: CajaResumenDto;
}

/** Resumen de una sesión para el histórico (sin movimientos). */
export interface CajaSesionResumenDto {
  id: number;
  estado: EstadoCaja;
  abiertaEn: string;
  cerradaEn: string | null;
  montoInicial: string;
  montoEsperado: string | null;
  montoContado: string | null;
  diferencia: string | null;
  usuarioAperturaNombre: string;
}

/** Abrir una sesión de caja con un fondo inicial. */
export interface AbrirCajaRequest {
  montoInicial: number;
}

/** Registrar un movimiento manual (ingreso/egreso de efectivo). */
export interface RegistrarMovimientoCajaRequest {
  tipo: TipoMovimientoCaja;
  monto: number;
  concepto: string;
}

/** Cerrar la sesión con el conteo físico del efectivo. */
export interface CerrarCajaRequest {
  montoContado: number;
  observacion?: string;
}
