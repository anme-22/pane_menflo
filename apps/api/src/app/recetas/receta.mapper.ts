import type {
  Insumo,
  Producto,
  Receta,
  RecetaIngrediente,
  UnidadMedida,
} from '@prisma/client';
import type { RecetaDto, RecetaResumenDto } from '@pane/shared';
import { CostoRecetaResultado } from './costo-receta.service';

/** Receta con sus relaciones cargadas para mapear/costear. */
export type RecetaConRelaciones = Receta & {
  producto?: Producto;
  ingredientes: (RecetaIngrediente & {
    insumo?: Insumo;
    unidad?: UnidadMedida;
  })[];
};

/** Mapea una receta + su costeo al DTO completo. */
export function toRecetaDto(
  receta: RecetaConRelaciones,
  costo: CostoRecetaResultado,
): RecetaDto {
  return {
    id: receta.id,
    productoId: receta.productoId,
    productoNombre: receta.producto?.nombre ?? '',
    rendimiento: receta.rendimiento,
    unidadLote: receta.unidadLote,
    ingredientes: receta.ingredientes.map((ing) => {
      const c = costo.porIngrediente.get(ing.id);
      return {
        id: ing.id,
        insumoId: ing.insumoId,
        insumoNombre: ing.insumo?.nombre ?? '',
        insumoTipo: ing.insumo?.tipo ?? 'peso',
        cantidad: ing.cantidad.toString(),
        unidadId: ing.unidadId,
        unidadAbrev: ing.unidad?.abreviatura ?? '',
        cantidadBase: (c?.cantidadBase ?? 0).toString(),
        costoUnitario: (c?.costoUnitario ?? 0).toString(),
        costo: (c?.costo ?? 0).toString(),
      };
    }),
    costoMateriales: costo.costoMateriales.toString(),
    costoIndirecto: costo.costoIndirecto.toString(),
    costoReceta: costo.costoReceta.toString(),
    costoPorBolsa: costo.costoPorBolsa.toString(),
  };
}

/** Mapea una receta + su costeo al resumen del listado. */
export function toRecetaResumenDto(
  receta: RecetaConRelaciones,
  costo: CostoRecetaResultado,
): RecetaResumenDto {
  return {
    id: receta.id,
    productoId: receta.productoId,
    productoNombre: receta.producto?.nombre ?? '',
    rendimiento: receta.rendimiento,
    unidadLote: receta.unidadLote,
    numIngredientes: receta.ingredientes.length,
    costoMateriales: costo.costoMateriales.toString(),
    costoIndirecto: costo.costoIndirecto.toString(),
    costoReceta: costo.costoReceta.toString(),
    costoPorBolsa: costo.costoPorBolsa.toString(),
  };
}
