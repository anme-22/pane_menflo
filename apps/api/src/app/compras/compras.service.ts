import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CompraDto } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionService } from '../unidades/conversion.service';
import { SucursalesService } from '../sucursales/sucursales.service';
import { InventarioService } from '../inventario/inventario.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { toCompraDto } from './compra.mapper';

/**
 * Registro de compras (lotes). Al crear una compra:
 *  1) valida que la unidad de compra sea del mismo tipo que el insumo,
 *  2) convierte la cantidad a unidad base (vía ConversionService),
 *  3) calcula el costo por unidad base del lote (= costo total / cantidad base),
 *  4) delega en InventarioService la entrada al stock (promedio ponderado) y el
 *     asiento del movimiento de ENTRADA, todo dentro de una transacción.
 * La lógica de costeo/inventario vive en InventarioService (DI, no se duplica).
 */
@Injectable()
export class ComprasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversion: ConversionService,
    private readonly sucursales: SucursalesService,
    private readonly inventario: InventarioService,
  ) {}

  /** Lista compras (todas o filtradas por insumo), más recientes primero. */
  async listar(insumoId?: number): Promise<CompraDto[]> {
    const compras = await this.prisma.compra.findMany({
      where: insumoId ? { insumoId } : undefined,
      orderBy: { fecha: 'desc' },
      include: { insumo: true, unidadCompra: true },
    });
    return compras.map(toCompraDto);
  }

  /** Registra una compra y actualiza la existencia (costo promedio ponderado). */
  async crear(dto: CrearCompraDto): Promise<CompraDto> {
    const insumo = await this.prisma.insumo.findUnique({
      where: { id: dto.insumoId },
    });
    if (!insumo) {
      throw new NotFoundException('Insumo no encontrado.');
    }
    if (!insumo.activo) {
      throw new BadRequestException('El insumo está inactivo.');
    }

    const unidad = await this.conversion.obtenerUnidad(dto.unidadCompraId);
    if (unidad.tipo !== insumo.tipo) {
      throw new BadRequestException(
        'La unidad de compra no corresponde al tipo del insumo.',
      );
    }

    const { cantidadBase } = await this.conversion.convertirABase(
      dto.cantidad,
      dto.unidadCompraId,
    );
    if (cantidadBase <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor que 0.');
    }
    const costoPorUnidadBase = dto.costo / cantidadBase;

    const sucursalId = await this.sucursales.obtenerDefaultId();
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();

    const compra = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.compra.create({
        data: {
          insumoId: dto.insumoId,
          sucursalId,
          fecha,
          cantidadCompra: dto.cantidad,
          unidadCompraId: dto.unidadCompraId,
          costo: dto.costo,
          cantidadBase,
          costoPorUnidadBase,
        },
        include: { insumo: true, unidadCompra: true },
      });

      // Entrada al stock (promedio ponderado) + asiento del movimiento ENTRADA.
      await this.inventario.registrarEntrada(tx, {
        insumoId: dto.insumoId,
        sucursalId,
        cantidadBase,
        costoTotal: dto.costo,
        costoUnitario: costoPorUnidadBase,
        compraId: creada.id,
        fecha,
      });

      return creada;
    });

    return toCompraDto(compra);
  }
}
