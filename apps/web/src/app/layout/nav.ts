import type { RolUsuario } from '@pane/shared';

/**
 * Un ítem de navegación de la app. Única fuente de verdad: tanto la sidebar de
 * escritorio como los paneles de móvil (bottom-bar y "Más") leen de aquí.
 * Las features futuras solo añaden su entrada a NAV_ITEMS.
 */
export interface NavItem {
  label: string;
  /** Clase de primeicons (un solo set de iconos en toda la app). */
  icon: string;
  route: string;
  /** Si está, solo se muestra a usuarios con alguno de estos roles. */
  roles?: RolUsuario[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', icon: 'pi pi-home', route: '/' },
  // Productos: visible a todos los roles (el vendedor lo ve en consulta).
  { label: 'Productos', icon: 'pi pi-box', route: '/productos' },
  // Clientes: visible a todos los roles (el vendedor también los gestiona).
  { label: 'Clientes', icon: 'pi pi-id-card', route: '/clientes' },
  // Insumos: visible a todos (el vendedor ve el inventario en consulta).
  { label: 'Insumos', icon: 'pi pi-inbox', route: '/insumos' },
  // Inventario: consulta para todos (existencias, kardex, cobertura, alertas).
  { label: 'Inventario', icon: 'pi pi-chart-bar', route: '/inventario' },
  // Compras: operación de costo, solo admin/super_admin.
  { label: 'Compras', icon: 'pi pi-shopping-cart', route: '/compras', roles: ['admin', 'super_admin'] },
  // Proveedores: catálogo para las compras, solo admin/super_admin.
  { label: 'Proveedores', icon: 'pi pi-truck', route: '/proveedores', roles: ['admin', 'super_admin'] },
  // Recetas: gestión del negocio, solo admin/super_admin.
  { label: 'Recetas', icon: 'pi pi-book', route: '/recetas', roles: ['admin', 'super_admin'] },
  // Producción: operación del negocio, solo admin/super_admin.
  { label: 'Producción', icon: 'pi pi-cog', route: '/produccion', roles: ['admin', 'super_admin'] },
  // Facturas: venta; la usan los tres roles (el vendedor incluido).
  { label: 'Facturas', icon: 'pi pi-receipt', route: '/facturas' },
  // Caja / Arqueo: la operan los tres roles (el vendedor es el cajero).
  { label: 'Caja', icon: 'pi pi-wallet', route: '/caja' },
  // Reportes: gestión/ganancias, solo admin/super_admin.
  { label: 'Reportes', icon: 'pi pi-chart-line', route: '/reportes', roles: ['admin', 'super_admin'] },
  // Costos indirectos: afectan el costo por bolsa; solo admin/super_admin.
  { label: 'Costos indirectos', icon: 'pi pi-sliders-h', route: '/costos-indirectos', roles: ['admin', 'super_admin'] },
  { label: 'Usuarios', icon: 'pi pi-users', route: '/usuarios', roles: ['super_admin'] },
];
