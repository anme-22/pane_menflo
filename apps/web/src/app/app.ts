import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  // Inyectar el ThemeService aquí garantiza que se instancie al arrancar y
  // aplique el tema (claro/oscuro) en toda la app.
  protected readonly theme = inject(ThemeService);
}
