import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ProveedorDto } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CrearProveedorDto } from './dto/crear-proveedor.dto';
import { ActualizarProveedorDto } from './dto/actualizar-proveedor.dto';
import { toProveedorDto } from './proveedor.mapper';

/**
 * Gestión de proveedores (SOLID-S). NO se borran: se desactivan. El nombre es
 * único (se valida aquí con mensaje claro, además del índice único en BD).
 */
@Injectable()
export class ProveedoresService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista todos los proveedores (activos e inactivos), por nombre. */
  async listar(): Promise<ProveedorDto[]> {
    const proveedores = await this.prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' },
    });
    return proveedores.map(toProveedorDto);
  }

  /** Obtiene un proveedor por id o lanza 404. */
  async obtener(id: number): Promise<ProveedorDto> {
    const proveedor = await this.prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado.');
    }
    return toProveedorDto(proveedor);
  }

  /** Crea un proveedor (nombre único). */
  async crear(dto: CrearProveedorDto): Promise<ProveedorDto> {
    await this.asegurarNombreLibre(dto.nombre);
    const proveedor = await this.prisma.proveedor.create({
      data: { nombre: dto.nombre.trim(), telefono: dto.telefono?.trim() || null },
    });
    return toProveedorDto(proveedor);
  }

  /** Actualiza nombre y/o teléfono del proveedor. */
  async actualizar(id: number, dto: ActualizarProveedorDto): Promise<ProveedorDto> {
    await this.asegurarExiste(id);
    if (dto.nombre !== undefined) {
      await this.asegurarNombreLibre(dto.nombre, id);
    }
    const proveedor = await this.prisma.proveedor.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        telefono: dto.telefono === undefined ? undefined : dto.telefono.trim() || null,
      },
    });
    return toProveedorDto(proveedor);
  }

  /** Activa/desactiva el proveedor (no se borra). */
  async cambiarEstado(id: number, activo: boolean): Promise<ProveedorDto> {
    await this.asegurarExiste(id);
    const proveedor = await this.prisma.proveedor.update({
      where: { id },
      data: { activo },
    });
    return toProveedorDto(proveedor);
  }

  private async asegurarExiste(id: number): Promise<void> {
    const existe = await this.prisma.proveedor.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Proveedor no encontrado.');
    }
  }

  /** Rechaza un nombre ya usado por otro proveedor (sin distinguir mayúsculas). */
  private async asegurarNombreLibre(nombre: string, exceptoId?: number): Promise<void> {
    const existente = await this.prisma.proveedor.findFirst({
      where: {
        nombre: { equals: nombre.trim(), mode: 'insensitive' },
        ...(exceptoId ? { id: { not: exceptoId } } : {}),
      },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException('Ya existe un proveedor con ese nombre.');
    }
  }
}
