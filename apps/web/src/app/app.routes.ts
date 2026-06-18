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
        path: 'clientes',
        // Visible a cualquier autenticado; los tres roles gestionan clientes.
        loadComponent: () =>
          import('./features/clientes/clientes').then((m) => m.ClientesPage),
      },
      {
        path: 'insumos',
        // Visible a cualquier autenticado; la gestión se controla en la UI/API.
        loadComponent: () =>
          import('./features/insumos/insumos').then((m) => m.InsumosPage),
      },
      {
        path: 'compras',
        // Operación de costo: solo admin/super_admin.
        canActivate: [rolGuard('admin', 'super_admin')],
        loadComponent: () =>
          import('./features/compras/compras').then((m) => m.ComprasPage),
      },
      {
        path: 'recetas',
        // Gestión del negocio: solo admin/super_admin.
        canActivate: [rolGuard('admin', 'super_admin')],
        loadComponent: () =>
          import('./features/recetas/recetas').then((m) => m.RecetasPage),
      },
      {
        path: 'produccion',
        // Operación del negocio: solo admin/super_admin.
        canActivate: [rolGuard('admin', 'super_admin')],
        loadComponent: () =>
          import('./features/produccion/produccion').then((m) => m.ProduccionPage),
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
