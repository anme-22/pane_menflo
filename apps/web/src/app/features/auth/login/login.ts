import { Component, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../theme/theme.service';

/**
 * Pantalla de login. Componente "smart": orquesta el formulario y delega la
 * autenticación en AuthService. Responsive y con la paleta naranja en claro y
 * oscuro (lee las variables CSS del tema).
 */
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: './login.html',
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    // Acepta correo O identidad: solo se exige que no esté vacío.
    identificador: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.cargando.set(true);

    const { identificador, password } = this.form.getRawValue();
    this.auth.login(identificador, password).subscribe({
      next: () => {
        this.cargando.set(false);
        void this.router.navigate(['/']);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(
          err?.status === 401
            ? 'Correo/identidad o contraseña incorrectos.'
            : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
        );
      },
    });
  }
}
