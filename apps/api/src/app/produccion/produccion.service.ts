import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoProduccion } from '@prisma/client';
import type {
  OrdenProduccionDto,
  OrdenProduccionResumenDto,
} from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionService } from '../unidades/conversion.service';
import { SucursalesService } from '../sucursales/sucursales.service';
import { InventarioService } from '../inventario/inventario.service';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { CapturarBolsasRealesDto } from './dto/capturar-bolsas-reales.dto';
import { AnularOrdenDto } from './dto/anular-orden.dto';
import {
  toOrdenProduccionDto,
  toOrdenProduccionResumenDto,
} from './orden.mapper';

/** Relaciones que se cargan para mapear una orden por completo. */
const CON_RELACIONES = {
  producto: true,
  receta: true,
  movimientos: { include: { insumo: true }, orderBy: { id: 'asc' } },
} as const;

/** Insumo a consumir, ya agregado por insumo y convertido a unidad base. */
interface ConsumoCalculado {
  insumoId: number;
  insumoNombre: string;
  cantidadBase: number;
}

/**
 * Órdenes de producción (SOLID-S). Al crear, congela `bolsasEsperadas` desde el
 * rendimiento de la receta. Al confirmar, descuenta el inventario y "congela" el
 * costo del momento en UNA transacción; es idempotente (una orden confirmada no
 * vuelve a descontar). El descuento de stock y el asiento del movimiento se
 * delegan en InventarioService (DI); la conversión a unidad base reutiliza el
 * ConversionService de F5.
 */
@Injectable()
export class ProduccionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversion: ConversionService,
    private readonly sucursales: SucursalesService,
    private readonly inventario: InventarioService,
  ) {}

  /** Lista las órdenes (resumen), más recientes primero. */
  async listar(): Promise<OrdenProduccionResumenDto[]> {
    const ordenes = await this.prisma.ordenProduccion.findMany({
      orderBy: { id: 'desc' },
      include: { producto: true, receta: true },
    });
    return ordenes.map(toOrdenProduccionResumenDto);
  }

  /** Obtiene una orden por id (con sus consumos) o lanza 404. */
  async obtener(id: number): Promise<OrdenProduccionDto> {
    const orden = await this.prisma.ordenProduccion.findUnique({
      where: { id },
      include: CON_RELACIONES,
    });
    if (!orden) {
      throw new NotFoundException('Orden de producción no encontrada.');
    }
    return toOrdenProduccionDto(orden);
  }

  /**
   * Crea una orden en BORRADOR. El producto debe tener receta; `bolsasEsperadas`
   * se congela = sacos × rendimiento (redondeado al entero más cercano).
   */
  async crear(dto: CrearOrdenDto): Promise<OrdenProduccionDto> {
    const receta = await this.prisma.receta.findUnique({
      where: { productoId: dto.productoId },
      select: { id: true, rendimiento: true },
    });
    if (!receta) {
      throw new BadRequestException(
        'El producto no tiene receta; no se puede producir.',
      );
    }

    const sucursalId = await this.sucursales.obtenerDefaultId();
    const bolsasEsperadas = Math.round(dto.sacos * receta.rendimiento);
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();

    const orden = await this.prisma.ordenProduccion.create({
      data: {
        fecha,
        productoId: dto.productoId,
        recetaId: receta.id,
        sucursalId,
        sacos: dto.sacos,
        bolsasEsperadas,
        estado: EstadoProduccion.BORRADOR,
      },
    });
    return this.obtener(orden.id);
  }

  /**
   * Confirma una orden: en UNA transacción descuenta del inventario los insumos
   * de la receta (cantidad × sacos, en unidad base), registra un movimiento de
   * salida por insumo y congela el costo del momento. IDEMPOTENTE: si la orden
   * ya está CONFIRMADA se devuelve sin volver a descontar.
   */
  async confirmar(id: number): Promise<OrdenProduccionDto> {
    const orden = await this.prisma.ordenProduccion.findUnique({
      where: { id },
      include: {
        receta: { include: { ingredientes: { include: { insumo: true } } } },
      },
    });
    if (!orden) {
      throw new NotFoundException('Orden de producción no encontrada.');
    }
    // Idempotencia: una orden ya confirmada no vuelve a descontar.
    if (orden.estado === EstadoProduccion.CONFIRMADA) {
      return this.obtener(id);
    }
    if (orden.estado === EstadoProduccion.ANULADA) {
      throw new BadRequestException('La orden está anulada; no se puede confirmar.');
    }
    if (orden.receta.ingredientes.length === 0) {
      throw new BadRequestException('La receta no tiene ingredientes.');
    }

    // Calcula el consumo agregado por insumo (un movimiento por insumo), fuera
    // de la transacción: la conversión solo lee el catálogo de unidades.
    const sacos = Number(orden.sacos);
    const porInsumo = new Map<number, ConsumoCalculado>();
    for (const ing of orden.receta.ingredientes) {
      const { cantidadBase } = await this.conversion.convertirABase(
        Number(ing.cantidad) * sacos,
        ing.unidadId,
      );
      const previo = porInsumo.get(ing.insumoId);
      if (previo) {
        previo.cantidadBase += cantidadBase;
      } else {
        porInsumo.set(ing.insumoId, {
          insumoId: ing.insumoId,
          insumoNombre: ing.insumo?.nombre ?? `insumo ${ing.insumoId}`,
          cantidadBase,
        });
      }
    }

    const sucursalId = orden.sucursalId;
    const actualizada = await this.prisma.$transaction(async (tx) => {
      let costoDelMomento = 0;
      for (const consumo of porInsumo.values()) {
        const aplicada = await this.inventario.registrarSalida(
          tx,
          {
            insumoId: consumo.insumoId,
            sucursalId,
            cantidadBase: consumo.cantidadBase,
            ordenProduccionId: orden.id,
          },
          consumo.insumoNombre,
        );
        costoDelMomento += aplicada.costo;
      }

      return tx.ordenProduccion.update({
        where: { id: orden.id },
        data: {
          estado: EstadoProduccion.CONFIRMADA,
          costoDelMomento,
          confirmadaEn: new Date(),
        },
      });
    });

    return this.obtener(actualizada.id);
  }

  /** Captura las bolsas realmente producidas (para medir la merma). */
  async capturarBolsasReales(
    id: number,
    dto: CapturarBolsasRealesDto,
  ): Promise<OrdenProduccionDto> {
    const orden = await this.asegurarExiste(id);
    if (orden.estado === EstadoProduccion.ANULADA) {
      throw new BadRequestException(
        'La orden está anulada; no se pueden capturar bolsas reales.',
      );
    }
    await this.prisma.ordenProduccion.update({
      where: { id },
      data: { bolsasReales: dto.bolsasReales },
    });
    return this.obtener(id);
  }

  /** Anula una orden con motivo obligatorio (deja rastro; no se borra). */
  async anular(id: number, dto: AnularOrdenDto): Promise<OrdenProduccionDto> {
    const orden = await this.asegurarExiste(id);
    if (orden.estado === EstadoProduccion.ANULADA) {
      throw new BadRequestException('La orden ya está anulada.');
    }
    await this.prisma.ordenProduccion.update({
      where: { id },
      data: { estado: EstadoProduccion.ANULADA, motivoAnulacion: dto.motivo },
    });
    return this.obtener(id);
  }

  // ---- helpers privados ----

  private async asegurarExiste(id: number) {
    const orden = await this.prisma.ordenProduccion.findUnique({
      where: { id },
    });
    if (!orden) {
      throw new NotFoundException('Orden de producción no encontrada.');
    }
    return orden;
  }
}
