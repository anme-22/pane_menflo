import type { Proveedor } from '@prisma/client';
import type { ProveedorDto } from '@pane/shared';

/** Mapea un proveedor de Prisma a su DTO. */
export function toProveedorDto(p: Proveedor): ProveedorDto {
  return {
    id: p.id,
    nombre: p.nombre,
    telefono: p.telefono ?? null,
    activo: p.activo,
    creadoEn: p.creadoEn.toISOString(),
    actualizadoEn: p.actualizadoEn.toISOString(),
  };
}
