import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { RolUsuario } from '@pane/shared';
import { AuthService } from './auth.service';

/** Permite la ruta solo si hay sesión; si no, manda al login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

/**
 * Permite la ruta solo si el usuario tiene alguno de los roles indicados.
 * Si no, lo devuelve al inicio. Uso: `canActivate: [rolGuard('super_admin')]`.
 */
export const rolGuard =
  (...roles: RolUsuario[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.isAuthenticated() && auth.tieneRol(...roles)
      ? true
      : router.createUrlTree(['/']);
  };
