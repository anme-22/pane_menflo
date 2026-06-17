import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import type {
  ActualizarProductoRequest,
  CrearProductoRequest,
  PrecioDto,
  ProductoDto,
} from '@pane/shared';
import { AuthService } from '../../core/auth/auth.service';
import { ProductosService } from './productos.service';

const dinero = new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL',
});
const fecha = new Intl.DateTimeFormat('es-HN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Catálogo de productos (componente "smart"). Lista, crea/edita, cambia el
 * precio (con su historial) y activa/desactiva. La GESTIÓN solo se muestra a
 * admin/super_admin; el vendedor ve el catálogo y el historial en consulta.
 */
@Component({
  selector: 'app-productos',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    DrawerModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './productos.html',
})
export class ProductosPage implements OnInit {
  private readonly service = inject(ProductosService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(MessageService);

  /** Solo admin/super_admin gestionan; el resto es consulta. */
  protected readonly puedeGestionar = computed(() =>
    this.auth.tieneRol('admin', 'super_admin'),
  );

  protected readonly productos = signal<ProductoDto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  // Diálogo crear/editar producto.
  protected readonly formVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0.01)]],
  });

  // Diálogo cambiar precio.
  protected readonly precioVisible = signal(false);
  protected readonly precioProducto = signal<ProductoDto | null>(null);
  protected readonly formPrecio = this.fb.group({
    precio: [0, [Validators.required, Validators.min(0.01)]],
  });

  // Drawer de historial.
  protected readonly historialVisible = signal(false);
  protected readonly historialProducto = signal<ProductoDto | null>(null);
  protected readonly historial = signal<PrecioDto[]>([]);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: (data) => {
        this.productos.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error('No se pudo cargar el catálogo.');
      },
    });
  }

  // ---- crear / editar ----

  abrirNuevo(): void {
    this.editandoId.set(null);
    this.form.reset({ nombre: '', descripcion: '', precio: 0 });
    this.form.controls.precio.enable();
    this.formVisible.set(true);
  }

  abrirEdicion(p: ProductoDto): void {
    this.editandoId.set(p.id);
    this.form.reset({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      precio: 0,
    });
    // Al editar no se toca el precio (tiene su propia acción).
    this.form.controls.precio.disable();
    this.formVisible.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const id = this.editandoId();
    const v = this.form.getRawValue();

    if (id === null) {
      const data: CrearProductoRequest = {
        nombre: v.nombre,
        descripcion: v.descripcion || null,
        precio: v.precio,
      };
      this.service.crear(data).subscribe({
        next: () => this.alGuardar('Producto creado.'),
        error: (e) => this.alFallar(e),
      });
    } else {
      const data: ActualizarProductoRequest = {
        nombre: v.nombre,
        descripcion: v.descripcion || null,
      };
      this.service.actualizar(id, data).subscribe({
        next: () => this.alGuardar('Producto actualizado.'),
        error: (e) => this.alFallar(e),
      });
    }
  }

  // ---- cambiar precio ----

  abrirCambioPrecio(p: ProductoDto): void {
    this.precioProducto.set(p);
    this.formPrecio.reset({ precio: p.precioVigente ? Number(p.precioVigente) : 0 });
    this.precioVisible.set(true);
  }

  guardarPrecio(): void {
    const p = this.precioProducto();
    if (!p || this.formPrecio.invalid) {
      this.formPrecio.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.service.cambiarPrecio(p.id, this.formPrecio.getRawValue().precio).subscribe({
      next: () => {
        this.guardando.set(false);
        this.precioVisible.set(false);
        this.toast.add({ severity: 'success', summary: 'Precio actualizado.', life: 2500 });
        this.cargar();
      },
      error: (e) => this.alFallar(e),
    });
  }

  // ---- historial ----

  abrirHistorial(p: ProductoDto): void {
    this.historialProducto.set(p);
    this.historial.set([]);
    this.historialVisible.set(true);
    this.service.historial(p.id).subscribe({
      next: (h) => this.historial.set(h),
      error: () => this.error('No se pudo cargar el historial.'),
    });
  }

  // ---- estado ----

  alternarEstado(p: ProductoDto): void {
    this.service.cambiarEstado(p.id, !p.activo).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: p.activo ? 'Producto desactivado' : 'Producto activado',
          life: 2500,
        });
        this.cargar();
      },
      error: (e) => this.error(e?.error?.message ?? 'No se pudo cambiar el estado.'),
    });
  }

  // ---- helpers de presentación ----

  precioTexto(valor: string | null): string {
    return valor === null ? '—' : dinero.format(Number(valor));
  }

  fechaTexto(iso: string | null): string {
    return iso ? fecha.format(new Date(iso)) : 'Actual';
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
    this.error(e?.error?.message ?? 'No se pudo completar la operación.');
  }

  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
