import { SetMetadata } from '@nestjs/common';
import type { RolUsuario } from '@pane/shared';

/** Clave de metadatos donde se guardan los roles permitidos de una ruta. */
export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta (o controlador) a los roles indicados.
 * Se evalúa en `RolesGuard`. Ejemplo: `@Roles('super_admin')`.
 */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
