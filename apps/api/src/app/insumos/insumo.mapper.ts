import type { Existencia, Insumo } from '@prisma/client';
import type { InsumoDto } from '@pane/shared';

/** Insumo con (opcionalmente) sus existencias cargadas. */
type InsumoConExistencias = Insumo & { existencias?: Existencia[] };

/**
 * Mapea un insumo a su DTO, tomando la existencia de la sucursal por defecto
 * (saldo en unidad base + costo promedio). Si aún no tiene existencia, va en 0.
 */
export function toInsumoDto(
  insumo: InsumoConExistencias,
  sucursalDefaultId: number,
): InsumoDto {
  const ex = insumo.existencias?.find((e) => e.sucursalId === sucursalDefaultId);
  return {
    id: insumo.id,
    nombre: insumo.nombre,
    tipo: insumo.tipo,
    activo: insumo.activo,
    existencia: {
      cantidadBase: ex ? ex.cantidadBase.toString() : '0',
      costoPromedio: ex ? ex.costoPromedio.toString() : '0',
    },
    stockMinimo: insumo.stockMinimo.toString(),
    creadoEn: insumo.creadoEn.toISOString(),
    actualizadoEn: insumo.actualizadoEn.toISOString(),
  };
}
