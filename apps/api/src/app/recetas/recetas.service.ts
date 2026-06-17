import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RecetaDto, RecetaResumenDto, IngredienteInput } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionService } from '../unidades/conversion.service';
import { CostoRecetaService } from './costo-receta.service';
import { CrearRecetaDto } from './dto/crear-receta.dto';
import { ActualizarRecetaDto } from './dto/actualizar-receta.dto';
import { toRecetaDto, toRecetaResumenDto } from './receta.mapper';

/** Relaciones que se cargan siempre para mapear/costear una receta. */
const CON_RELACIONES = {
  producto: true,
  ingredientes: { include: { insumo: true, unidad: true } },
} as const;

/**
 * Gestión de recetas (SOLID-S). Una receta por producto (puede no existir). El
 * costeo se delega en CostoRecetaService (DI). Al editar los ingredientes se
 * reemplaza el set completo en una transacción.
 */
@Injectable()
export class RecetasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversion: ConversionService,
    private readonly costoReceta: CostoRecetaService,
  ) {}

  /** Lista las recetas (resumen con costos). */
  async listar(): Promise<RecetaResumenDto[]> {
    const recetas = await this.prisma.receta.findMany({
      orderBy: { producto: { nombre: 'asc' } },
      include: CON_RELACIONES,
    });
    const out: RecetaResumenDto[] = [];
    for (const r of recetas) {
      out.push(toRecetaResumenDto(r, await this.costoReceta.calcular(r)));
    }
    return out;
  }

  /** Obtiene una receta por id (con costeo) o lanza 404. */
  async obtener(id: number): Promise<RecetaDto> {
    const receta = await this.prisma.receta.findUnique({
      where: { id },
      include: CON_RELACIONES,
    });
    if (!receta) {
      throw new NotFoundException('Receta no encontrada.');
    }
    return toRecetaDto(receta, await this.costoReceta.calcular(receta));
  }

  /** Obtiene la receta de un producto, o null si no tiene. Útil para el editor. */
  async obtenerPorProducto(productoId: number): Promise<RecetaDto | null> {
    const receta = await this.prisma.receta.findUnique({
      where: { productoId },
      include: CON_RELACIONES,
    });
    if (!receta) {
      return null;
    }
    return toRecetaDto(receta, await this.costoReceta.calcular(receta));
  }

  /** Crea la receta de un producto (que aún no tenga). */
  async crear(dto: CrearRecetaDto): Promise<RecetaDto> {
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
      select: { id: true },
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado.');
    }
    const existe = await this.prisma.receta.findUnique({
      where: { productoId: dto.productoId },
      select: { id: true },
    });
    if (existe) {
      throw new ConflictException('El producto ya tiene una receta.');
    }
    await this.validarIngredientes(dto.ingredientes);

    const receta = await this.prisma.receta.create({
      data: {
        productoId: dto.productoId,
        rendimiento: dto.rendimiento,
        unidadLote: dto.unidadLote,
        ingredientes: {
          create: dto.ingredientes.map((i) => ({
            insumoId: i.insumoId,
            cantidad: i.cantidad,
            unidadId: i.unidadId,
          })),
        },
      },
    });
    return this.obtener(receta.id);
  }

  /** Actualiza rendimiento/unidadLote y, si vienen, reemplaza los ingredientes. */
  async actualizar(id: number, dto: ActualizarRecetaDto): Promise<RecetaDto> {
    await this.asegurarExiste(id);
    if (dto.ingredientes) {
      await this.validarIngredientes(dto.ingredientes);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.receta.update({
        where: { id },
        data: { rendimiento: dto.rendimiento, unidadLote: dto.unidadLote },
      });
      if (dto.ingredientes) {
        await tx.recetaIngrediente.deleteMany({ where: { recetaId: id } });
        await tx.recetaIngrediente.createMany({
          data: dto.ingredientes.map((i) => ({
            recetaId: id,
            insumoId: i.insumoId,
            cantidad: i.cantidad,
            unidadId: i.unidadId,
          })),
        });
      }
    });
    return this.obtener(id);
  }

  /** Elimina la receta (sus ingredientes se borran en cascada). */
  async eliminar(id: number): Promise<void> {
    await this.asegurarExiste(id);
    await this.prisma.receta.delete({ where: { id } });
  }

  // ---- helpers privados ----

  private async asegurarExiste(id: number): Promise<void> {
    const existe = await this.prisma.receta.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Receta no encontrada.');
    }
  }

  /** Cada ingrediente debe existir, estar activo y su unidad ser del mismo tipo. */
  private async validarIngredientes(
    ingredientes: IngredienteInput[],
  ): Promise<void> {
    for (const ing of ingredientes) {
      const insumo = await this.prisma.insumo.findUnique({
        where: { id: ing.insumoId },
      });
      if (!insumo) {
        throw new NotFoundException(`Insumo ${ing.insumoId} no encontrado.`);
      }
      if (!insumo.activo) {
        throw new BadRequestException(
          `El insumo "${insumo.nombre}" está inactivo.`,
        );
      }
      const unidad = await this.conversion.obtenerUnidad(ing.unidadId);
      if (unidad.tipo !== insumo.tipo) {
        throw new BadRequestException(
          `La unidad de "${insumo.nombre}" no corresponde a su tipo (${insumo.tipo}).`,
        );
      }
    }
  }
}
