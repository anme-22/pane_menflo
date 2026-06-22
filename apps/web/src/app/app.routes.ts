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
        path: 'inventario',
        // Consulta visible a cualquier autenticado (el vendedor en modo lectura).
        loadComponent: () =>
          import('./features/inventario/inventario').then((m) => m.InventarioPage),
      },
      {
        path: 'compras',
        // Operación de costo: solo admin/super_admin.
        canActivate: [rolGuard('admin', 'super_admin')],
        loadComponent: () =>
          import('./features/compras/compras').then((m) => m.ComprasPage),
      },
      {
        path: 'proveedores',
        // Catálogo de compras: solo admin/super_admin.
        canActivate: [rolGuard('admin', 'super_admin')],
        loadComponent: () =>
          import('./features/proveedores/proveedores').then((m) => m.ProveedoresPage),
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
        path: 'facturas',
        // Venta: cualquier autenticado (el vendedor incluido).
        loadComponent: () =>
          import('./features/facturas/facturas').then((m) => m.FacturasPage),
      },
      {
        path: 'caja',
        // Caja / Arqueo: cualquier autenticado (el vendedor es el cajero).
        loadComponent: () =>
          import('./features/caja/caja').then((m) => m.CajaPage),
      },
      {
        path: 'reportes',
        // Gestión/ganancias: solo admin/super_admin.
        canActivate: [rolGuard('admin', 'super_admin')],
        loadComponent: () =>
          import('./features/reportes/reportes').then((m) => m.ReportesPage),
      },
      {
        path: 'costos-indirectos',
        // Afectan el costo por bolsa: solo admin/super_admin.
        canActivate: [rolGuard('admin', 'super_admin')],
        loadComponent: () =>
          import('./features/costos-indirectos/costos-indirectos').then((m) => m.CostosIndirectosPage),
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
