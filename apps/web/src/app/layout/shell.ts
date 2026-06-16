import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { AuthService } from '../core/auth/auth.service';
import { ThemeService } from '../theme/theme.service';
import { NAV_ITEMS, type NavItem } from './nav';

/**
 * Layout principal de la app autenticada.
 * - Escritorio (lg+): sidebar fija a la izquierda con todos los ítems y, al pie,
 *   usuario + tema + Salir.
 * - Móvil (<lg): bottom-bar con Inicio · Perfil · ⋯ Más. "Perfil" abre el panel
 *   de cuenta (usuario/tema/salir) y "Más" la navegación secundaria.
 * Los ítems se filtran por rol desde una única fuente (NAV_ITEMS).
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, DrawerModule],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  /** Paneles inferiores de móvil. */
  protected readonly perfilAbierto = signal(false);
  protected readonly masAbierto = signal(false);

  /** Ítems visibles según el rol del usuario actual. */
  protected readonly items = computed<NavItem[]>(() =>
    NAV_ITEMS.filter((i) => !i.roles || this.auth.tieneRol(...i.roles)),
  );

  /** Navegación secundaria para el panel "Más" (todo menos Inicio). */
  protected readonly itemsSecundarios = computed(() =>
    this.items().filter((i) => i.route !== '/'),
  );

  esExacta(item: NavItem): boolean {
    return item.route === '/';
  }

  cerrarPaneles(): void {
    this.perfilAbierto.set(false);
    this.masAbierto.set(false);
  }
}
