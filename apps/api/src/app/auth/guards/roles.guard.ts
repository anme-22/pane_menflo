import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RolUsuario } from '@pane/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Autoriza por rol. Lee los roles permitidos puestos con `@Roles(...)` y los
 * compara con el rol del usuario autenticado. Debe ir DESPUÉS de `JwtAuthGuard`
 * (necesita `request.user`). Si la ruta no declara roles, deja pasar.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rolesPermitidos || rolesPermitidos.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !rolesPermitidos.includes(user.rol)) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    return true;
  }
}
