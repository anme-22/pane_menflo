import { Injectable, NotFoundException } from '@nestjs/common';
import type { Configuracion } from '@prisma/client';
import type { ConfiguracionDto } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Lee la configuración del sistema (fila única, sembrada). La EDICIÓN de las
 * banderas es la Feature 12; aquí solo se consulta (para resolver el impuesto y
 * los campos fiscales). Se cachea: no cambia en caliente hoy.
 */
@Injectable()
export class ConfiguracionService {
  private cache: Configuracion | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Configuración como entidad (uso interno, p. ej. FacturasService). */
  async obtener(): Promise<Configuracion> {
    if (this.cache) {
      return this.cache;
    }
    const config = await this.prisma.configuracion.findFirst();
    if (!config) {
      throw new NotFoundException('No hay configuración sembrada.');
    }
    this.cache = config;
    return config;
  }

  /** Actualiza `quintalesPorMes` (base del prorrateo) e invalida la caché. */
  async actualizarQuintalesPorMes(quintalesPorMes: number): Promise<Configuracion> {
    const actual = await this.obtener();
    const updated = await this.prisma.configuracion.update({
      where: { id: actual.id },
      data: { quintalesPorMes },
    });
    this.cache = updated;
    return updated;
  }

  /** Configuración como DTO (para el frontend). */
  async obtenerDto(): Promise<ConfiguracionDto> {
    const c = await this.obtener();
    return {
      isvActivo: c.isvActivo,
      tasaIsv: c.tasaIsv.toString(),
      facturacionFiscalActiva: c.facturacionFiscalActiva,
      cai: c.cai,
      caiRango: c.caiRango,
      caiFechaLimite: c.caiFechaLimite?.toISOString() ?? null,
      pinEdicionActivo: c.pinEdicionActivo,
    };
  }
}
