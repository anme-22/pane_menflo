import type { UnidadMedida as UnidadPrisma } from '@prisma/client';
import type { UnidadMedida } from '@pane/shared';

/** Mapea una unidad de medida a su DTO (Decimal factorABase → number). */
export function toUnidadDto(u: UnidadPrisma): UnidadMedida {
  return {
    id: u.id,
    nombre: u.nombre,
    abreviatura: u.abreviatura,
    tipo: u.tipo,
    factorABase: Number(u.factorABase),
  };
}
