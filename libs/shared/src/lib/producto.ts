/**
 * Contratos compartidos de Productos y Precios (Feature 3).
 * Única fuente de verdad entre la API (NestJS) y la web (Angular).
 *
 * Los importes (`precio`) viajan como STRING para no perder precisión decimal
 * (Prisma serializa Decimal como string; el front formatea para mostrar).
 */

/** Un registro de precio con su ventana de vigencia. */
export interface PrecioDto {
  id: number;
  precio: string;
  /** ISO. Desde cuándo rige este precio. */
  vigenteDesde: string;
  /** ISO o null. null = es el precio vigente actualmente. */
  vigenteHasta: string | null;
}

/** Producto del catálogo, con su precio vigente (o null si aún no tiene). */
export interface ProductoDto {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  /** Precio vigente actual; null si el producto no tiene precio abierto. */
  precioVigente: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

/** Crear producto: el precio inicial es obligatorio (nace con vigencia abierta). */
export interface CrearProductoRequest {
  nombre: string;
  descripcion?: string | null;
  precio: number;
}

/** Actualizar datos del producto (NO el precio; eso va por su endpoint). */
export interface ActualizarProductoRequest {
  nombre?: string;
  descripcion?: string | null;
}

/** Cambiar el precio: cierra el vigente y abre uno nuevo. */
export interface CambiarPrecioRequest {
  precio: number;
}
