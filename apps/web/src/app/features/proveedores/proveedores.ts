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
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import type {
  ActualizarProveedorRequest,
  CrearProveedorRequest,
  ProveedorDto,
} from '@pane/shared';
import { ProveedoresService } from './proveedores.service';

/**
 * Catálogo de proveedores (componente "smart"). CRUD sin borrado: se activan/
 * desactivan. Solo admin/super_admin (ruta y nav lo restringen). App zoneless.
 */
@Component({
  selector: 'app-proveedores',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './proveedores.html',
})
export class ProveedoresPage implements OnInit {
  private readonly service = inject(ProveedoresService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(MessageService);

  protected readonly proveedores = signal<ProveedorDto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  protected readonly formVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    telefono: [''],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: (data) => {
        this.proveedores.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error('No se pudieron cargar los proveedores.');
      },
    });
  }

  abrirNuevo(): void {
    this.editandoId.set(null);
    this.form.reset({ nombre: '', telefono: '' });
    this.formVisible.set(true);
  }

  abrirEdicion(p: ProveedorDto): void {
    this.editandoId.set(p.id);
    this.form.reset({ nombre: p.nombre, telefono: p.telefono ?? '' });
    this.formVisible.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const telefono = v.telefono.trim();
    this.guardando.set(true);
    const id = this.editandoId();

    if (id === null) {
      const data: CrearProveedorRequest = {
        nombre: v.nombre.trim(),
        telefono: telefono || undefined,
      };
      this.service.crear(data).subscribe({
        next: () => this.alGuardar('Proveedor creado.'),
        error: (e) => this.alFallar(e),
      });
    } else {
      const data: ActualizarProveedorRequest = {
        nombre: v.nombre.trim(),
        telefono,
      };
      this.service.actualizar(id, data).subscribe({
        next: () => this.alGuardar('Proveedor actualizado.'),
        error: (e) => this.alFallar(e),
      });
    }
  }

  cambiarEstado(p: ProveedorDto): void {
    this.service.cambiarEstado(p.id, !p.activo).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: p.activo ? 'Proveedor desactivado' : 'Proveedor activado',
          life: 2500,
        });
        this.cargar();
      },
      error: (e) => this.error(e?.error?.message ?? 'No se pudo cambiar el estado.'),
    });
  }

  // ---- helpers privados ----

  private alGuardar(mensaje: string): void {
    this.guardando.set(false);
    this.formVisible.set(false);
    this.toast.add({ severity: 'success', summary: mensaje, life: 2500 });
    this.cargar();
  }

  private alFallar(e: { error?: { message?: string } }): void {
    this.guardando.set(false);
    this.error(e?.error?.message ?? 'No se pudo guardar el proveedor.');
  }

  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
