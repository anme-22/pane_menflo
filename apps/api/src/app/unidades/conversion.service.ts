import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UnidadMedida as UnidadPrisma } from '@prisma/client';
import type { TipoUnidad, UnidadMedida } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toUnidadDto } from './unidad.mapper';

/**
 * Conversión de unidades basada 100% en la TABLA `unidad_medida` (no en código
 * ni JSON). Convertir entre dos unidades del mismo tipo:
 *   cantidad * factor_origen / factor_destino
 * Agregar una unidad nueva = insertar una fila (sin tocar este servicio).
 */
@Injectable()
export class ConversionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista todas las unidades (para selects del frontend). */
  async listar(): Promise<UnidadMedida[]> {
    const unidades = await this.prisma.unidadMedida.findMany({
      orderBy: [{ tipo: 'asc' }, { factorABase: 'asc' }],
    });
    return unidades.map(toUnidadDto);
  }

  /** Convierte `cantidad` de la unidad origen a la unidad destino (mismo tipo). */
  async convertir(
    cantidad: number,
    unidadOrigenId: number,
    unidadDestinoId: number,
  ): Promise<number> {
    const origen = await this.obtenerUnidad(unidadOrigenId);
    const destino = await this.obtenerUnidad(unidadDestinoId);
    if (origen.tipo !== destino.tipo) {
      throw new BadRequestException(
        'No se puede convertir entre unidades de distinto tipo.',
      );
    }
    return (cantidad * Number(origen.factorABase)) / Number(destino.factorABase);
  }

  /** Convierte `cantidad` (en la unidad dada) a la unidad base de su tipo. */
  async convertirABase(
    cantidad: number,
    unidadOrigenId: number,
  ): Promise<{ cantidadBase: number; tipo: TipoUnidad }> {
    const origen = await this.obtenerUnidad(unidadOrigenId);
    const base = await this.unidadBase(origen.tipo);
    const cantidadBase =
      (cantidad * Number(origen.factorABase)) / Number(base.factorABase);
    return { cantidadBase, tipo: origen.tipo };
  }

  /** Unidad base de un tipo (la de factor 1). */
  async unidadBase(tipo: TipoUnidad): Promise<UnidadPrisma> {
    const base = await this.prisma.unidadMedida.findFirst({
      where: { tipo, factorABase: 1 },
    });
    if (!base) {
      throw new NotFoundException(`No hay unidad base para el tipo "${tipo}".`);
    }
    return base;
  }

  /** Obtiene una unidad por id o lanza 404. */
  async obtenerUnidad(id: number): Promise<UnidadPrisma> {
    const unidad = await this.prisma.unidadMedida.findUnique({ where: { id } });
    if (!unidad) {
      throw new NotFoundException('Unidad de medida no encontrada.');
    }
    return unidad;
  }
}
