import type { CostoIndirecto } from '@prisma/client';
import type { CostoIndirectoDto } from '@pane/shared';

/** Mapea un costo indirecto a su DTO. */
export function toCostoIndirectoDto(c: CostoIndirecto): CostoIndirectoDto {
  return {
    id: c.id,
    nombre: c.nombre,
    monto: c.monto.toString(),
    tipo: c.tipo,
    activo: c.activo,
  };
}
