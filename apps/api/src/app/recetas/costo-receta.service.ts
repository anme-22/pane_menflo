import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionService } from '../unidades/conversion.service';
import { SucursalesService } from '../sucursales/sucursales.service';

/** Ingrediente mínimo necesario para costear (estructural, fácil de testear). */
export interface IngredienteParaCosteo {
  id: number;
  insumoId: number;
  /** number, string o Decimal de Prisma (cualquier cosa convertible con Number). */
  cantidad: number | string | { toString(): string };
  unidadId: number;
}

export interface RecetaParaCosteo {
  rendimiento: number;
  ingredientes: IngredienteParaCosteo[];
}

/** Costeo calculado de un ingrediente. */
export interface CostoIngrediente {
  ingredienteId: number;
  cantidadBase: number;
  costoUnitario: number;
  costo: number;
}

export interface CostoRecetaResultado {
  costoReceta: number;
  costoPorBolsa: number;
  porIngrediente: Map<number, CostoIngrediente>;
}

/**
 * Costea una receta valorando los insumos al **costo del momento** (promedio
 * ponderado, leído de `existencia` en la sucursal por defecto). Responsabilidad
 * única (SOLID-S); reutiliza el ConversionService de F5 para llevar cada
 * ingrediente a su unidad base. Un insumo sin existencia aún aporta costo 0.
 */
@Injectable()
export class CostoRecetaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversion: ConversionService,
    private readonly sucursales: SucursalesService,
  ) {}

  async calcular(receta: RecetaParaCosteo): Promise<CostoRecetaResultado> {
    const sucursalId = await this.sucursales.obtenerDefaultId();
    const insumoIds = [...new Set(receta.ingredientes.map((i) => i.insumoId))];

    const existencias = insumoIds.length
      ? await this.prisma.existencia.findMany({
          where: { sucursalId, insumoId: { in: insumoIds } },
        })
      : [];
    const costoPorInsumo = new Map<number, number>();
    for (const e of existencias) {
      costoPorInsumo.set(e.insumoId, Number(e.costoPromedio));
    }

    const porIngrediente = new Map<number, CostoIngrediente>();
    let costoReceta = 0;
    for (const ing of receta.ingredientes) {
      const { cantidadBase } = await this.conversion.convertirABase(
        Number(ing.cantidad),
        ing.unidadId,
      );
      const costoUnitario = costoPorInsumo.get(ing.insumoId) ?? 0;
      const costo = cantidadBase * costoUnitario;
      porIngrediente.set(ing.id, {
        ingredienteId: ing.id,
        cantidadBase,
        costoUnitario,
        costo,
      });
      costoReceta += costo;
    }

    const costoPorBolsa =
      receta.rendimiento > 0 ? costoReceta / receta.rendimiento : 0;

    return { costoReceta, costoPorBolsa, porIngrediente };
  }
}
