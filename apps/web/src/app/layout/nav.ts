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
  { label: 'Usuarios', icon: 'pi pi-users', route: '/usuarios', roles: ['super_admin'] },
];
