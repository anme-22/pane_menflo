import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { StockDto } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionService } from '../unidades/conversion.service';
import { SucursalesService } from '../sucursales/sucursales.service';
import { InventarioService } from './inventario.service';
import { CrearAjusteDto } from './dto/crear-ajuste.dto';
import { toStockDto } from './inventario.mapper';

/**
 * Ajustes manuales de stock (SOLID-S). Resuelve la sucursal por defecto, valida
 * que la unidad sea del mismo tipo que el insumo, convierte la cantidad a unidad
 * base (reutiliza ConversionService) y delega la mutación en InventarioService
 * dentro de una transacción. Devuelve el stock actualizado del insumo.
 */
@Injectable()
export class AjustesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversion: ConversionService,
    private readonly sucursales: SucursalesService,
    private readonly inventario: InventarioService,
  ) {}

  async ajustar(dto: CrearAjusteDto): Promise<StockDto> {
    const insumo = await this.prisma.insumo.findUnique({
      where: { id: dto.insumoId },
    });
    if (!insumo) {
      throw new NotFoundException('Insumo no encontrado.');
    }

    // La unidad del ajuste debe ser del mismo tipo que el insumo.
    const { cantidadBase, tipo } = await this.conversion.convertirABase(
      dto.cantidad,
      dto.unidadId,
    );
    if (tipo !== insumo.tipo) {
      throw new BadRequestException(
        `La unidad es de tipo "${tipo}" pero el insumo es de tipo "${insumo.tipo}".`,
      );
    }

    const sucursalId = await this.sucursales.obtenerDefaultId();
    await this.prisma.$transaction((tx) =>
      this.inventario.registrarAjuste(tx, {
        insumoId: dto.insumoId,
        sucursalId,
        incrementa: dto.incrementa,
        cantidadBase,
        motivo: dto.motivo,
      }),
    );

    // Stock actualizado del insumo (para refrescar la fila en la UI).
    const existencia = await this.prisma.existencia.findUnique({
      where: { insumoId_sucursalId: { insumoId: dto.insumoId, sucursalId } },
    });
    return toStockDto(insumo, {
      cantidadBase: existencia ? Number(existencia.cantidadBase) : 0,
      costoPromedio: existencia ? Number(existencia.costoPromedio) : 0,
    });
  }
}
