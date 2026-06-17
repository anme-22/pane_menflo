import type { Compra, Insumo, UnidadMedida } from '@prisma/client';
import type { CompraDto } from '@pane/shared';

/** Compra con (opcionalmente) su insumo y unidad de compra cargados. */
type CompraConRel = Compra & {
  insumo?: Insumo;
  unidadCompra?: UnidadMedida;
};

/** Mapea una compra a su DTO (Decimal → string para no perder precisión). */
export function toCompraDto(c: CompraConRel): CompraDto {
  return {
    id: c.id,
    insumoId: c.insumoId,
    insumoNombre: c.insumo?.nombre ?? '',
    fecha: c.fecha.toISOString(),
    cantidadCompra: c.cantidadCompra.toString(),
    unidadCompraId: c.unidadCompraId,
    unidadCompraAbrev: c.unidadCompra?.abreviatura ?? '',
    costo: c.costo.toString(),
    cantidadBase: c.cantidadBase.toString(),
    costoPorUnidadBase: c.costoPorUnidadBase.toString(),
  };
}
