import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CostosIndirectosResumenDto } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { CrearCostoIndirectoDto } from './dto/crear-costo-indirecto.dto';
import { ActualizarCostoIndirectoDto } from './dto/actualizar-costo-indirecto.dto';
import { toCostoIndirectoDto } from './costo-indirecto.mapper';

const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Gestión de costos indirectos (SOLID-S). NO se borran: se desactivan. Expone el
 * listado + el parámetro `quintalesPorMes` (base del prorrateo POR_MES) y el
 * indirecto por lote resultante con los activos.
 */
@Injectable()
export class CostosIndirectosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  /** Lista costos indirectos + quintalesPorMes + el indirecto por lote (activos). */
  async listar(): Promise<CostosIndirectosResumenDto> {
    const items = await this.prisma.costoIndirecto.findMany({
      orderBy: { nombre: 'asc' },
    });
    const { quintalesPorMes } = await this.configuracion.obtener();
    const divisor = quintalesPorMes > 0 ? quintalesPorMes : 1;
    const indirectoPorLote = items
      .filter((c) => c.activo)
      .reduce(
        (s, c) =>
          s + (c.tipo === 'POR_MES' ? Number(c.monto) / divisor : Number(c.monto)),
        0,
      );
    return {
      items: items.map(toCostoIndirectoDto),
      quintalesPorMes,
      indirectoPorLote: r2(indirectoPorLote).toString(),
    };
  }

  /** Crea un costo indirecto (nombre único). */
  async crear(dto: CrearCostoIndirectoDto): Promise<CostosIndirectosResumenDto> {
    const existe = await this.prisma.costoIndirecto.findUnique({
      where: { nombre: dto.nombre },
      select: { id: true },
    });
    if (existe) {
      throw new ConflictException('Ya existe un costo indirecto con ese nombre.');
    }
    await this.prisma.costoIndirecto.create({
      data: { nombre: dto.nombre, monto: dto.monto, tipo: dto.tipo },
    });
    return this.listar();
  }

  /** Actualiza nombre/monto/tipo de un costo indirecto. */
  async actualizar(
    id: number,
    dto: ActualizarCostoIndirectoDto,
  ): Promise<CostosIndirectosResumenDto> {
    await this.asegurarExiste(id);
    if (dto.nombre) {
      const otro = await this.prisma.costoIndirecto.findUnique({
        where: { nombre: dto.nombre },
        select: { id: true },
      });
      if (otro && otro.id !== id) {
        throw new ConflictException('Ya existe un costo indirecto con ese nombre.');
      }
    }
    await this.prisma.costoIndirecto.update({
      where: { id },
      data: { nombre: dto.nombre, monto: dto.monto, tipo: dto.tipo },
    });
    return this.listar();
  }

  /** Activa/desactiva un costo indirecto (no se borra). */
  async cambiarEstado(id: number, activo: boolean): Promise<CostosIndirectosResumenDto> {
    await this.asegurarExiste(id);
    await this.prisma.costoIndirecto.update({ where: { id }, data: { activo } });
    return this.listar();
  }

  /** Actualiza el parámetro de prorrateo (quintales producidos al mes). */
  async actualizarQuintalesPorMes(
    quintalesPorMes: number,
  ): Promise<CostosIndirectosResumenDto> {
    if (!Number.isInteger(quintalesPorMes) || quintalesPorMes <= 0) {
      throw new BadRequestException('quintalesPorMes debe ser un entero mayor que 0.');
    }
    await this.configuracion.actualizarQuintalesPorMes(quintalesPorMes);
    return this.listar();
  }

  private async asegurarExiste(id: number): Promise<void> {
    const existe = await this.prisma.costoIndirecto.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Costo indirecto no encontrado.');
    }
  }
}
