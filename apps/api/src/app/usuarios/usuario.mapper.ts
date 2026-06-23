import type { Usuario } from '@prisma/client';
import type { UsuarioDto } from '@pane/shared';

/**
 * Convierte la entidad de Prisma a su DTO público.
 * CLAVE: nunca expone `passwordHash` hacia el cliente.
 */
export function toUsuarioDto(usuario: Usuario): UsuarioDto {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    identidad: usuario.identidad ? usuario.identidad.trim() : null,
    rol: usuario.rol,
    activo: usuario.activo,
    creadoEn: usuario.creadoEn.toISOString(),
    actualizadoEn: usuario.actualizadoEn.toISOString(),
  };
}
