import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Adjunta el token `Bearer` a cada petición y, ante un 401, cierra la sesión y
 * redirige al login. Se salta el manejo del 401 en el propio login (ahí el
 * error lo muestra la pantalla, no debe forzar un logout/redirect).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      const esLogin = req.url.includes('/auth/login');
      if (error?.status === 401 && !esLogin) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};
