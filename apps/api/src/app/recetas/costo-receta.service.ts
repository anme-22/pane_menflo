import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionService } from '../unidades/conversion.service';
import { SucursalesService } from '../sucursales/sucursales.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';

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
  /** Costo de los materiales (insumos) por lote. */
  costoMateriales: number;
  /** Costo indirecto prorrateado por lote (mano de obra, luz/agua/gas...). */
  costoIndirecto: number;
  /** Costo total del lote = materiales + indirecto. */
  costoReceta: number;
  /** costoReceta ÷ rendimiento. */
  costoPorBolsa: number;
  porIngrediente: Map<number, CostoIngrediente>;
}

/**
 * Costea una receta valorando los insumos al **costo del momento** (promedio
 * ponderado, leído de `existencia` en la sucursal por defecto) y sumando los
 * **costos indirectos** por lote: los POR_QUINTAL tal cual y los POR_MES
 * prorrateados (monto / quintalesPorMes). Responsabilidad única (SOLID-S);
 * reutiliza ConversionService (F5) y ConfiguracionService (quintalesPorMes). Un
 * insumo sin existencia aún aporta costo 0.
 */
@Injectable()
export class CostoRecetaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversion: ConversionService,
    private readonly sucursales: SucursalesService,
    private readonly configuracion: ConfiguracionService,
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
    let costoMateriales = 0;
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
      costoMateriales += costo;
    }

    const costoIndirecto = await this.indirectoPorLote();
    const costoReceta = costoMateriales + costoIndirecto;
    const costoPorBolsa =
      receta.rendimiento > 0 ? costoReceta / receta.rendimiento : 0;

    return { costoMateriales, costoIndirecto, costoReceta, costoPorBolsa, porIngrediente };
  }

  /**
   * Costo indirecto por lote (≈ por quintal): Σ POR_QUINTAL + Σ POR_MES /
   * quintalesPorMes. Solo cuenta los costos indirectos activos.
   */
  private async indirectoPorLote(): Promise<number> {
    const indirectos = await this.prisma.costoIndirecto.findMany({
      where: { activo: true },
    });
    if (indirectos.length === 0) {
      return 0;
    }
    const { quintalesPorMes } = await this.configuracion.obtener();
    const porMesDivisor = quintalesPorMes > 0 ? quintalesPorMes : 1;
    let total = 0;
    for (const c of indirectos) {
      const monto = Number(c.monto);
      total += c.tipo === 'POR_MES' ? monto / porMesDivisor : monto;
    }
    return total;
  }
}
