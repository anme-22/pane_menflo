import type { PrecioProducto, Producto } from '@prisma/client';
import type { PrecioDto, ProductoDto } from '@pane/shared';

/** Producto con (opcionalmente) sus precios cargados. */
type ProductoConPrecios = Producto & { precios?: PrecioProducto[] };

/** Mapea un registro de precio a su DTO (Decimal → string para no perder precisión). */
export function toPrecioDto(p: PrecioProducto): PrecioDto {
  return {
    id: p.id,
    precio: p.precio.toString(),
    vigenteDesde: p.vigenteDesde.toISOString(),
    vigenteHasta: p.vigenteHasta ? p.vigenteHasta.toISOString() : null,
  };
}

/**
 * Mapea un producto a su DTO. El precio vigente sale del registro con
 * `vigenteHasta = null` (si se incluyó la relación `precios`).
 */
export function toProductoDto(producto: ProductoConPrecios): ProductoDto {
  const vigente = producto.precios?.find((x) => x.vigenteHasta === null);
  return {
    id: producto.id,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    activo: producto.activo,
    precioVigente: vigente ? vigente.precio.toString() : null,
    creadoEn: producto.creadoEn.toISOString(),
    actualizadoEn: producto.actualizadoEn.toISOString(),
  };
}
