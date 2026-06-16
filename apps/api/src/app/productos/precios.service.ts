import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrecioDto } from '@pane/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toPrecioDto } from './producto.mapper';

/**
 * Lógica de precios con historial de vigencia (SOLID-S: una sola
 * responsabilidad). La regla "cerrar el anterior, abrir el nuevo" vive aquí,
 * aislada y reutilizable, sin `if` gigantes: son dos pasos atómicos.
 *
 * Invariante (garantizado además por un índice único parcial en la BD):
 * un producto tiene como mucho UN precio vigente (`vigenteHasta = null`).
 */
@Injectable()
export class PreciosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Abre un nuevo precio vigente para el producto. Reutilizable tanto al crear
   * el producto como al cambiar el precio. Opera dentro de la transacción dada.
   */
  abrirPrecio(
    tx: Prisma.TransactionClient,
    productoId: number,
    precio: number,
    desde: Date,
  ) {
    return tx.precioProducto.create({
      data: { productoId, precio, vigenteDesde: desde },
    });
  }

  /** Cierra el precio vigente (si lo hay) fijando su `vigenteHasta`. */
  private cerrarVigente(
    tx: Prisma.TransactionClient,
    productoId: number,
    fecha: Date,
  ) {
    return tx.precioProducto.updateMany({
      where: { productoId, vigenteHasta: null },
      data: { vigenteHasta: fecha },
    });
  }

  /**
   * Cambia el precio: cierra el vigente y abre el nuevo en una transacción.
   * La misma fecha cierra el anterior y abre el siguiente (sin huecos).
   */
  async cambiarPrecio(productoId: number, precio: number): Promise<PrecioDto> {
    const nuevo = await this.prisma.$transaction(async (tx) => {
      const ahora = new Date();
      await this.cerrarVigente(tx, productoId, ahora);
      return this.abrirPrecio(tx, productoId, precio, ahora);
    });
    return toPrecioDto(nuevo);
  }

  /** Historial completo de precios del producto (más reciente primero). */
  async historial(productoId: number): Promise<PrecioDto[]> {
    const precios = await this.prisma.precioProducto.findMany({
      where: { productoId },
      orderBy: { vigenteDesde: 'desc' },
    });
    return precios.map(toPrecioDto);
  }
}
