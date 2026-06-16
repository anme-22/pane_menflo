import { Route } from '@angular/router';
import { authGuard, rolGuard } from './core/auth/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.LoginPage),
  },
  {
    // Zona autenticada: el shell envuelve a las rutas hijas.
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/inicio/inicio').then((m) => m.InicioPage),
      },
      {
        path: 'productos',
        // Visible a cualquier autenticado; la gestión se controla en la UI/API.
        loadComponent: () =>
          import('./features/productos/productos').then((m) => m.ProductosPage),
      },
      {
        path: 'usuarios',
        // Solo super_admin (además de ocultarse en la UI).
        canActivate: [rolGuard('super_admin')],
        loadComponent: () =>
          import('./features/usuarios/usuarios').then((m) => m.UsuariosPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
