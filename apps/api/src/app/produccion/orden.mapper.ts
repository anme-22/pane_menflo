import type {
  Insumo,
  MovimientoInventario,
  OrdenProduccion,
  Producto,
  Receta,
} from '@prisma/client';
import {
  ABREVIATURA_BASE,
  type ConsumoOrdenDto,
  type OrdenProduccionDto,
  type OrdenProduccionResumenDto,
} from '@pane/shared';

/** Orden con las relaciones que se cargan para mapearla por completo. */
export type OrdenConRelaciones = OrdenProduccion & {
  producto?: Producto | null;
  receta?: Receta | null;
  movimientos?: (MovimientoInventario & { insumo?: Insumo | null })[];
};

/** Merma = esperadas − reales; null si aún no se capturaron las reales. */
function calcularMerma(orden: OrdenProduccion): number | null {
  return orden.bolsasReales === null
    ? null
    : orden.bolsasEsperadas - orden.bolsasReales;
}

/** Mapea un movimiento (salida de producción) a un consumo del DTO. */
function toConsumoDto(
  mov: MovimientoInventario & { insumo?: Insumo | null },
): ConsumoOrdenDto {
  const tipo = mov.insumo?.tipo;
  const cantidadBase = Number(mov.cantidadBase);
  const costoUnitario = Number(mov.costoUnitario);
  return {
    movimientoId: mov.id,
    insumoId: mov.insumoId,
    insumoNombre: mov.insumo?.nombre ?? '',
    cantidadBase: mov.cantidadBase.toString(),
    unidadBaseAbrev: tipo ? ABREVIATURA_BASE[tipo] : '',
    costoUnitario: mov.costoUnitario.toString(),
    costo: (cantidadBase * costoUnitario).toString(),
  };
}

/** Mapea una orden + sus relaciones al DTO completo (con consumos). */
export function toOrdenProduccionDto(
  orden: OrdenConRelaciones,
): OrdenProduccionDto {
  return {
    id: orden.id,
    fecha: orden.fecha.toISOString(),
    productoId: orden.productoId,
    productoNombre: orden.producto?.nombre ?? '',
    recetaId: orden.recetaId,
    sacos: orden.sacos.toString(),
    unidadLote: orden.receta?.unidadLote ?? '',
    rendimiento: orden.receta?.rendimiento ?? 0,
    bolsasEsperadas: orden.bolsasEsperadas,
    bolsasReales: orden.bolsasReales,
    merma: calcularMerma(orden),
    costoDelMomento: orden.costoDelMomento.toString(),
    estado: orden.estado,
    motivoAnulacion: orden.motivoAnulacion,
    confirmadaEn: orden.confirmadaEn?.toISOString() ?? null,
    consumos: (orden.movimientos ?? []).map(toConsumoDto),
  };
}

/** Mapea una orden al resumen del listado (sin consumos). */
export function toOrdenProduccionResumenDto(
  orden: OrdenConRelaciones,
): OrdenProduccionResumenDto {
  return {
    id: orden.id,
    fecha: orden.fecha.toISOString(),
    productoId: orden.productoId,
    productoNombre: orden.producto?.nombre ?? '',
    sacos: orden.sacos.toString(),
    unidadLote: orden.receta?.unidadLote ?? '',
    bolsasEsperadas: orden.bolsasEsperadas,
    bolsasReales: orden.bolsasReales,
    merma: calcularMerma(orden),
    costoDelMomento: orden.costoDelMomento.toString(),
    estado: orden.estado,
  };
}
