import { Component, inject, OnInit, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import {
  ROL_LABEL,
  ROLES,
  type ActualizarUsuarioRequest,
  type CrearUsuarioRequest,
  type UsuarioDto,
} from '@pane/shared';
import { UsuariosService } from './usuarios.service';

/**
 * Gestión de usuarios (solo super_admin). Componente "smart": carga la lista,
 * abre el diálogo de alta/edición y delega las operaciones en UsuariosService.
 * No hay borrado: los usuarios se activan/desactivan.
 */
@Component({
  selector: 'app-usuarios',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './usuarios.html',
})
export class UsuariosPage implements OnInit {
  private readonly service = inject(UsuariosService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(MessageService);

  /** Etiqueta legible de un rol (las filas de la tabla llegan como `any`). */
  protected etiquetaRol(rol: UsuarioDto['rol']): string {
    return ROL_LABEL[rol];
  }

  protected readonly opcionesRol = ROLES.map((rol) => ({
    label: ROL_LABEL[rol],
    value: rol,
  }));

  protected readonly usuarios = signal<UsuarioDto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly dialogVisible = signal(false);
  /** id en edición, o null cuando se está creando. */
  protected readonly editandoId = signal<number | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    // Identidad opcional; si se escribe, deben ser 13 dígitos (pattern admite vacío).
    identidad: ['', [Validators.pattern(/^\d{13}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['vendedor' as UsuarioDto['rol'], [Validators.required]],
  });

  // --- restablecer contraseña ---
  protected readonly resetVisible = signal(false);
  protected readonly reseteando = signal(false);
  protected readonly resetUsuario = signal<UsuarioDto | null>(null);
  /** Contraseña temporal generada (se muestra una sola vez). */
  protected readonly resetPassword = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error('No se pudo cargar la lista de usuarios.');
      },
    });
  }

  abrirNuevo(): void {
    this.editandoId.set(null);
    this.form.reset({ nombre: '', email: '', identidad: '', password: '', rol: 'vendedor' });
    this.ajustarValidadorPassword(true);
    this.dialogVisible.set(true);
  }

  abrirEdicion(u: UsuarioDto): void {
    this.editandoId.set(u.id);
    this.form.reset({
      nombre: u.nombre,
      email: u.email,
      identidad: u.identidad ?? '',
      password: '',
      rol: u.rol,
    });
    // Al editar, la contraseña es opcional (solo se cambia si se escribe).
    this.ajustarValidadorPassword(false);
    this.dialogVisible.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const id = this.editandoId();
    const valor = this.form.getRawValue();

    // Identidad: vacío → null (no enviar cadena vacía).
    const identidad = valor.identidad.trim() || null;

    if (id === null) {
      const data: CrearUsuarioRequest = {
        nombre: valor.nombre,
        email: valor.email,
        identidad,
        password: valor.password,
        rol: valor.rol,
      };
      this.service.crear(data).subscribe({
        next: () => this.alGuardar('Usuario creado.'),
        error: (e) => this.alFallarGuardado(e),
      });
    } else {
      // No enviamos password si quedó vacío.
      const data: ActualizarUsuarioRequest = {
        nombre: valor.nombre,
        email: valor.email,
        identidad,
        rol: valor.rol,
        ...(valor.password ? { password: valor.password } : {}),
      };
      this.service.actualizar(id, data).subscribe({
        next: () => this.alGuardar('Usuario actualizado.'),
        error: (e) => this.alFallarGuardado(e),
      });
    }
  }

  alternarEstado(u: UsuarioDto): void {
    this.service.cambiarEstado(u.id, !u.activo).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: u.activo ? 'Usuario desactivado' : 'Usuario activado',
          life: 2500,
        });
        this.cargar();
      },
      error: (e) =>
        this.error(e?.error?.message ?? 'No se pudo cambiar el estado.'),
    });
  }

  /** Restablece la contraseña: pide una temporal y la muestra una sola vez. */
  abrirReset(u: UsuarioDto): void {
    this.resetUsuario.set(u);
    this.resetPassword.set(null);
    this.reseteando.set(true);
    this.resetVisible.set(true);
    this.service.restablecerPassword(u.id).subscribe({
      next: (res) => {
        this.reseteando.set(false);
        this.resetPassword.set(res.password);
      },
      error: (e) => {
        this.reseteando.set(false);
        this.resetVisible.set(false);
        this.error(e?.error?.message ?? 'No se pudo restablecer la contraseña.');
      },
    });
  }

  /** Copia la contraseña temporal al portapapeles. */
  copiarPassword(): void {
    const pass = this.resetPassword();
    if (!pass) {
      return;
    }
    void navigator.clipboard?.writeText(pass).then(
      () => this.toast.add({ severity: 'success', summary: 'Copiada', life: 1500 }),
      () => undefined,
    );
  }

  private alGuardar(mensaje: string): void {
    this.guardando.set(false);
    this.dialogVisible.set(false);
    this.toast.add({ severity: 'success', summary: mensaje, life: 2500 });
    this.cargar();
  }

  private alFallarGuardado(e: { error?: { message?: string } }): void {
    this.guardando.set(false);
    this.error(e?.error?.message ?? 'No se pudo guardar el usuario.');
  }

  private ajustarValidadorPassword(requerido: boolean): void {
    const ctrl = this.form.controls.password;
    ctrl.setValidators(
      requerido
        ? [Validators.required, Validators.minLength(8)]
        : [Validators.minLength(8)],
    );
    ctrl.updateValueAndValidity();
  }

  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
