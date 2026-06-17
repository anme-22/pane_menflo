import type { CensoNacional, Cliente } from '@prisma/client';
import type { CensoLookupDto, ClienteDto } from '@pane/shared';

/** Une "PRIMER SEGUNDO" omitiendo las partes vacías/nulas. */
function componer(a: string, b: string | null): string {
  return [a, b]
    .map((x) => (x ? x.trim() : ''))
    .filter((x) => x.length > 0)
    .join(' ');
}

/** Mapea un cliente a su DTO. */
export function toClienteDto(c: Cliente): ClienteDto {
  return {
    // identidad es CHAR(13): trim por si llegara con padding.
    identidad: c.identidad.trim(),
    nombre: c.nombre,
    apellido: c.apellido,
    telefono: c.telefono,
    sexo: c.sexo,
    activo: c.activo,
    creadoEn: c.creadoEn.toISOString(),
    actualizadoEn: c.actualizadoEn.toISOString(),
  };
}

/**
 * Mapea un registro del censo al DTO de lookup, dejando `nombre`/`apellido` ya
 * compuestos para el formulario y conservando las piezas originales.
 */
export function toCensoLookupDto(censo: CensoNacional): CensoLookupDto {
  return {
    identidad: censo.identidad.trim(),
    primerNombre: censo.primerNombre,
    segundoNombre: censo.segundoNombre,
    primerApellido: censo.primerApellido,
    segundoApellido: censo.segundoApellido,
    sexo: censo.codSexo,
    nombre: componer(censo.primerNombre, censo.segundoNombre),
    apellido: componer(censo.primerApellido, censo.segundoApellido),
  };
}
