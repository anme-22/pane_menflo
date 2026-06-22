import type { CajaSesion, MovimientoCaja, Usuario } from '@prisma/client';
import type {
  CajaResumenDto,
  CajaSesionDto,
  CajaSesionResumenDto,
  MovimientoCajaDto,
} from '@pane/shared';

/** Sesión con relaciones para el DTO completo. */
export type CajaSesionConRelaciones = CajaSesion & {
  usuarioApertura?: Usuario | null;
  usuarioCierre?: Usuario | null;
  movimientos?: (MovimientoCaja & { usuario?: Usuario | null })[];
};

export function toMovimientoCajaDto(
  m: MovimientoCaja & { usuario?: Usuario | null },
): MovimientoCajaDto {
  return {
    id: m.id,
    tipo: m.tipo,
    monto: m.monto.toString(),
    concepto: m.concepto,
    usuarioId: m.usuarioId,
    usuarioNombre: m.usuario?.nombre ?? '',
    fecha: m.fecha.toISOString(),
  };
}

/** Mapea una sesión + su resumen (calculado aparte) al DTO completo. */
export function toCajaSesionDto(
  s: CajaSesionConRelaciones,
  resumen: CajaResumenDto,
): CajaSesionDto {
  return {
    id: s.id,
    estado: s.estado,
    montoInicial: s.montoInicial.toString(),
    usuarioAperturaId: s.usuarioAperturaId,
    usuarioAperturaNombre: s.usuarioApertura?.nombre ?? '',
    abiertaEn: s.abiertaEn.toISOString(),
    montoContado: s.montoContado?.toString() ?? null,
    montoEsperado: s.montoEsperado?.toString() ?? null,
    diferencia: s.diferencia?.toString() ?? null,
    usuarioCierreNombre: s.usuarioCierre?.nombre ?? null,
    cerradaEn: s.cerradaEn?.toISOString() ?? null,
    observacion: s.observacion,
    movimientos: (s.movimientos ?? []).map(toMovimientoCajaDto),
    resumen,
  };
}

/** Mapea una sesión al resumen del histórico (sin movimientos). */
export function toCajaSesionResumenDto(
  s: CajaSesion & { usuarioApertura?: Usuario | null },
): CajaSesionResumenDto {
  return {
    id: s.id,
    estado: s.estado,
    abiertaEn: s.abiertaEn.toISOString(),
    cerradaEn: s.cerradaEn?.toISOString() ?? null,
    montoInicial: s.montoInicial.toString(),
    montoEsperado: s.montoEsperado?.toString() ?? null,
    montoContado: s.montoContado?.toString() ?? null,
    diferencia: s.diferencia?.toString() ?? null,
    usuarioAperturaNombre: s.usuarioApertura?.nombre ?? '',
  };
}
