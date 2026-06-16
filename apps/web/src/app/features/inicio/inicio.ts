import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

/** Pantalla de inicio tras autenticarse (placeholder de las próximas features). */
@Component({
  selector: 'app-inicio',
  template: `
    <section
      class="mx-auto max-w-2xl rounded-xl border p-6 shadow-sm"
      style="background-color: var(--surface-card); border-color: var(--surface-border)"
    >
      <h1 class="text-2xl font-bold text-primary-600">
        Bienvenido, {{ auth.usuario()?.nombre }}
      </h1>
      <p class="mt-2 text-muted">
        Sesión iniciada como <strong>{{ auth.usuario()?.rol }}</strong>. Desde
        aquí se irán habilitando los módulos del sistema (productos, clientes,
        inventario, facturación…).
      </p>
      @if (auth.esSuperAdmin()) {
        <p class="mt-4 text-sm text-muted">
          Como super administrador puedes gestionar los usuarios en la sección
          <strong>Usuarios</strong>.
        </p>
      }
    </section>
  `,
})
export class InicioPage {
  protected readonly auth = inject(AuthService);
}
