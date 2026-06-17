import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Resuelve la sucursal por defecto. Por ahora no hay selector ni administración
 * de sucursales (CLAUDE.md §6): todo usa la sucursal default automáticamente.
 * El id se cachea porque la sucursal default no cambia en caliente.
 */
@Injectable()
export class SucursalesService {
  private defaultId: number | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async obtenerDefaultId(): Promise<number> {
    if (this.defaultId !== null) {
      return this.defaultId;
    }
    const sucursal = await this.prisma.sucursal.findFirst({
      where: { esDefault: true },
      select: { id: true },
    });
    if (!sucursal) {
      throw new NotFoundException('No hay sucursal por defecto configurada.');
    }
    this.defaultId = sucursal.id;
    return sucursal.id;
  }
}
