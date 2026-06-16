import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../core/auth/auth.service';
import { ThemeService } from '../theme/theme.service';

/**
 * Layout principal de la app autenticada: barra superior con navegación (los
 * enlaces se muestran según el rol), usuario actual, toggle de tema y logout.
 * El contenido de cada ruta hija se pinta en el `<router-outlet>`.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
}
