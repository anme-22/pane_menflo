import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TipoMovimiento } from '@prisma/client';
import {
  ABREVIATURA_BASE,
  type AlertaStockDto,
  type CoberturaInsumoDto,
  type CoberturaResultadoDto,
  type KardexDto,
  type StockDto,
} from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionService } from '../unidades/conversion.service';
import { SucursalesService } from '../sucursales/sucursales.service';
import { CoberturaDto } from './dto/cobertura.dto';
import { toMovimientoKardexDto, toStockDto } from './inventario.mapper';

/** Consumo acumulado por insumo dentro de un escenario de cobertura. */
interface ConsumoInsumo {
  insumoId: number;
  insumoNombre: string;
  tipo: 'peso' | 'volumen' | 'conteo';
  consumoDiarioBase: number;
}

/**
 * Capa de CONSULTA del inventario (SOLID-S; solo lectura). No muta nada: lee las
 * existencias (F5) y los movimientos (compras=ENTRADA, producción=SALIDA) para
 * exponer stock, kardex, cobertura y alertas. Reutiliza ConversionService (no
 * duplica la conversión a unidad base) y la sucursal por defecto.
 */
@Injectable()
export class ConsultaInventarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversion: ConversionService,
    private readonly sucursales: SucursalesService,
  ) {}

  /** Stock actual de cada insumo (unidad base + equivalente + alerta). */
  async existencias(): Promise<StockDto[]> {
    const sucursalId = await this.sucursales.obtenerDefaultId();
    const insumos = await this.prisma.insumo.findMany({
      orderBy: { nombre: 'asc' },
      include: { existencias: { where: { sucursalId } } },
    });
    return insumos.map((i) => {
      const ex = i.existencias[0];
      return toStockDto(i, {
        cantidadBase: ex ? Number(ex.cantidadBase) : 0,
        costoPromedio: ex ? Number(ex.costoPromedio) : 0,
      });
    });
  }

  /** Insumos por debajo de su umbral (stockMinimo > 0 y stock < umbral). */
  async alertas(): Promise<AlertaStockDto[]> {
    const existencias = await this.existencias();
    return existencias
      .filter((s) => s.bajoStock)
      .map((s) => ({
        insumoId: s.insumoId,
        insumoNombre: s.insumoNombre,
        unidadBaseAbrev: s.unidadBaseAbrev,
        cantidadBase: s.cantidadBase,
        stockMinimo: s.stockMinimo,
        equivalente: s.equivalente,
      }));
  }

  /** Kardex de un insumo: entradas/salidas en orden, con saldo acumulado. */
  async kardex(insumoId: number): Promise<KardexDto> {
    const insumo = await this.prisma.insumo.findUnique({ where: { id: insumoId } });
    if (!insumo) {
      throw new NotFoundException('Insumo no encontrado.');
    }
    const sucursalId = await this.sucursales.obtenerDefaultId();
    const movimientos = await this.prisma.movimientoInventario.findMany({
      where: { insumoId, sucursalId },
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
    });

    let saldo = 0;
    const filas = movimientos.map((m) => {
      const signo: 1 | -1 = m.tipo === TipoMovimiento.SALIDA ? -1 : 1;
      saldo += signo * Number(m.cantidadBase);
      return toMovimientoKardexDto(m, signo, saldo);
    });

    return {
      insumoId: insumo.id,
      insumoNombre: insumo.nombre,
      unidadBaseAbrev: ABREVIATURA_BASE[insumo.tipo],
      saldoFinal: saldo.toString(),
      movimientos: filas,
    };
  }

  /**
   * Cobertura en días para un escenario "producir N sacos/día de un producto":
   * días = stock_base ÷ consumo_diario_base, por insumo de la receta. El mínimo
   * es lo que aguanta el escenario (el insumo que se agota primero).
   */
  async cobertura(dto: CoberturaDto): Promise<CoberturaResultadoDto> {
    const receta = await this.prisma.receta.findUnique({
      where: { productoId: dto.productoId },
      include: {
        producto: { select: { nombre: true } },
        ingredientes: { include: { insumo: true } },
      },
    });
    if (!receta) {
      throw new BadRequestException('El producto no tiene receta.');
    }

    // Consumo diario por insumo (agrega ingredientes repetidos), a unidad base.
    const porInsumo = new Map<number, ConsumoInsumo>();
    for (const ing of receta.ingredientes) {
      const { cantidadBase } = await this.conversion.convertirABase(
        Number(ing.cantidad) * dto.sacosPorDia,
        ing.unidadId,
      );
      const previo = porInsumo.get(ing.insumoId);
      if (previo) {
        previo.consumoDiarioBase += cantidadBase;
      } else {
        porInsumo.set(ing.insumoId, {
          insumoId: ing.insumoId,
          insumoNombre: ing.insumo.nombre,
          tipo: ing.insumo.tipo,
          consumoDiarioBase: cantidadBase,
        });
      }
    }

    const sucursalId = await this.sucursales.obtenerDefaultId();
    const insumoIds = [...porInsumo.keys()];
    const existencias = insumoIds.length
      ? await this.prisma.existencia.findMany({
          where: { sucursalId, insumoId: { in: insumoIds } },
        })
      : [];
    const stockPorInsumo = new Map<number, number>();
    for (const e of existencias) {
      stockPorInsumo.set(e.insumoId, Number(e.cantidadBase));
    }

    const insumos: CoberturaInsumoDto[] = [];
    let diasMin: number | null = null;
    let limitante: string | null = null;
    for (const c of porInsumo.values()) {
      const stockBase = stockPorInsumo.get(c.insumoId) ?? 0;
      const dias =
        c.consumoDiarioBase > 0 ? stockBase / c.consumoDiarioBase : null;
      insumos.push({
        insumoId: c.insumoId,
        insumoNombre: c.insumoNombre,
        unidadBaseAbrev: ABREVIATURA_BASE[c.tipo],
        stockBase: stockBase.toString(),
        consumoDiarioBase: c.consumoDiarioBase.toString(),
        diasCobertura: dias,
      });
      if (dias !== null && (diasMin === null || dias < diasMin)) {
        diasMin = dias;
        limitante = c.insumoNombre;
      }
    }

    return {
      productoId: dto.productoId,
      productoNombre: receta.producto?.nombre ?? '',
      sacosPorDia: dto.sacosPorDia,
      insumos,
      diasCoberturaMin: diasMin,
      insumoLimitante: limitante,
    };
  }
}
