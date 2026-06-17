import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrecioDto, ProductoDto } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { PreciosService } from './precios.service';
import { toProductoDto } from './producto.mapper';

/** Incluye solo el precio vigente (vigenteHasta = null) junto al producto. */
const CON_PRECIO_VIGENTE = {
  precios: { where: { vigenteHasta: null }, take: 1 },
} as const;

/**
 * Gestión del catálogo de productos (SOLID-S). La lógica de precios se delega
 * en PreciosService por DI (SOLID-D). Los productos NO se borran: se desactivan.
 */
@Injectable()
export class ProductosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly precios: PreciosService,
  ) {}

  /** Lista productos con su precio vigente (ordenados por nombre). */
  async listar(): Promise<ProductoDto[]> {
    const productos = await this.prisma.producto.findMany({
      orderBy: { nombre: 'asc' },
      include: CON_PRECIO_VIGENTE,
    });
    return productos.map(toProductoDto);
  }

  /** Obtiene un producto con su precio vigente o lanza 404. */
  async obtener(id: number): Promise<ProductoDto> {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: CON_PRECIO_VIGENTE,
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado.');
    }
    return toProductoDto(producto);
  }

  /**
   * Crea el producto y abre su precio inicial en una sola transacción
   * (el precio es obligatorio: el producto nace con una vigencia abierta).
   */
  async crear(dto: CrearProductoDto): Promise<ProductoDto> {
    const creado = await this.prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: { nombre: dto.nombre, descripcion: dto.descripcion ?? null },
      });
      await this.precios.abrirPrecio(tx, producto.id, dto.precio, new Date());
      return producto;
    });
    return this.obtener(creado.id);
  }

  /** Actualiza datos del producto (no el precio). */
  async actualizar(id: number, dto: ActualizarProductoDto): Promise<ProductoDto> {
    await this.asegurarExiste(id);
    await this.prisma.producto.update({
      where: { id },
      data: { nombre: dto.nombre, descripcion: dto.descripcion },
    });
    return this.obtener(id);
  }

  /** Activa/desactiva el producto (no se borra). */
  async cambiarEstado(id: number, activo: boolean): Promise<ProductoDto> {
    await this.asegurarExiste(id);
    await this.prisma.producto.update({ where: { id }, data: { activo } });
    return this.obtener(id);
  }

  /** Cambia el precio del producto (delega la regla de vigencia). */
  async cambiarPrecio(id: number, precio: number): Promise<PrecioDto> {
    await this.asegurarExiste(id);
    return this.precios.cambiarPrecio(id, precio);
  }

  /** Historial de precios del producto. */
  async historial(id: number): Promise<PrecioDto[]> {
    await this.asegurarExiste(id);
    return this.precios.historial(id);
  }

  private async asegurarExiste(id: number): Promise<void> {
    const existe = await this.prisma.producto.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Producto no encontrado.');
    }
  }
}
