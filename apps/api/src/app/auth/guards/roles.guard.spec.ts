import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RolUsuario } from '@pane/shared';
import { RolesGuard } from './roles.guard';

/** Crea un ExecutionContext falso con un usuario del rol indicado. */
function contextoCon(rol?: RolUsuario): ExecutionContext {
  const request = { user: rol ? { rol } : undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function guardCon(rolesPermitidos: RolUsuario[] | undefined): RolesGuard {
  const reflector = {
    getAllAndOverride: () => rolesPermitidos,
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('deja pasar si la ruta no declara roles', () => {
    expect(guardCon(undefined).canActivate(contextoCon('vendedor'))).toBe(true);
  });

  it('deja pasar si el rol del usuario está permitido', () => {
    const guard = guardCon(['super_admin']);
    expect(guard.canActivate(contextoCon('super_admin'))).toBe(true);
  });

  it('lanza 403 si el rol no está permitido', () => {
    const guard = guardCon(['super_admin']);
    expect(() => guard.canActivate(contextoCon('vendedor'))).toThrow(
      ForbiddenException,
    );
  });

  it('lanza 403 si no hay usuario', () => {
    const guard = guardCon(['admin']);
    expect(() => guard.canActivate(contextoCon())).toThrow(ForbiddenException);
  });
});
