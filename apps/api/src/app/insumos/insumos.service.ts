import { Injectable, NotFoundException } from '@nestjs/common';
import type { InsumoDto } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SucursalesService } from '../sucursales/sucursales.service';
import { CrearInsumoDto } from './dto/crear-insumo.dto';
import { ActualizarInsumoDto } from './dto/actualizar-insumo.dto';
import { toInsumoDto } from './insumo.mapper';

/**
 * Gestión de insumos (SOLID-S). El stock vive en `existencia` (unidad base) y
 * se alimenta desde las compras. Los insumos NO se borran: se desactivan.
 */
@Injectable()
export class InsumosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sucursales: SucursalesService,
  ) {}

  /** Lista insumos con su existencia en la sucursal por defecto. */
  async listar(): Promise<InsumoDto[]> {
    const sucursalId = await this.sucursales.obtenerDefaultId();
    const insumos = await this.prisma.insumo.findMany({
      orderBy: { nombre: 'asc' },
      include: { existencias: { where: { sucursalId } } },
    });
    return insumos.map((i) => toInsumoDto(i, sucursalId));
  }

  /** Obtiene un insumo con su existencia o lanza 404. */
  async obtener(id: number): Promise<InsumoDto> {
    const sucursalId = await this.sucursales.obtenerDefaultId();
    const insumo = await this.prisma.insumo.findUnique({
      where: { id },
      include: { existencias: { where: { sucursalId } } },
    });
    if (!insumo) {
      throw new NotFoundException('Insumo no encontrado.');
    }
    return toInsumoDto(insumo, sucursalId);
  }

  /** Crea un insumo (sin existencia: el stock entra con la primera compra). */
  async crear(dto: CrearInsumoDto): Promise<InsumoDto> {
    const insumo = await this.prisma.insumo.create({
      data: { nombre: dto.nombre, tipo: dto.tipo, stockMinimo: dto.stockMinimo ?? 0 },
    });
    return this.obtener(insumo.id);
  }

  /** Actualiza nombre y/o umbral de stock del insumo (el tipo no cambia). */
  async actualizar(id: number, dto: ActualizarInsumoDto): Promise<InsumoDto> {
    await this.asegurarExiste(id);
    await this.prisma.insumo.update({
      where: { id },
      data: { nombre: dto.nombre, stockMinimo: dto.stockMinimo },
    });
    return this.obtener(id);
  }

  /** Activa/desactiva el insumo (no se borra). */
  async cambiarEstado(id: number, activo: boolean): Promise<InsumoDto> {
    await this.asegurarExiste(id);
    await this.prisma.insumo.update({ where: { id }, data: { activo } });
    return this.obtener(id);
  }

  private async asegurarExiste(id: number): Promise<void> {
    const existe = await this.prisma.insumo.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Insumo no encontrado.');
    }
  }
}
