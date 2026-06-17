import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import {
  ABREVIATURA_BASE,
  TIPOS_UNIDAD,
  TIPO_LABEL,
  type ActualizarInsumoRequest,
  type CrearInsumoRequest,
  type InsumoDto,
  type TipoUnidad,
} from '@pane/shared';
import { AuthService } from '../../core/auth/auth.service';
import { InsumosService } from './insumos.service';

const cantidad = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 4 });
const dineroFino = new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL',
  maximumFractionDigits: 4,
});

/**
 * Insumos (componente "smart"). Lista con su stock (en unidad base) y costo
 * promedio, crea/edita y activa/desactiva. La GESTIÓN solo se muestra a admin/
 * super_admin; el vendedor ve el inventario en consulta. El stock entra por
 * compras (no se edita aquí).
 */
@Component({
  selector: 'app-insumos',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './insumos.html',
})
export class InsumosPage implements OnInit {
  private readonly service = inject(InsumosService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(MessageService);

  protected readonly puedeGestionar = computed(() =>
    this.auth.tieneRol('admin', 'super_admin'),
  );

  protected readonly opcionesTipo = TIPOS_UNIDAD.map((tipo) => ({
    label: TIPO_LABEL[tipo],
    value: tipo,
  }));

  protected readonly insumos = signal<InsumoDto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  protected readonly formVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    tipo: ['peso' as TipoUnidad, [Validators.required]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: (data) => {
        this.insumos.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error('No se pudo cargar la lista de insumos.');
      },
    });
  }

  abrirNuevo(): void {
    this.editandoId.set(null);
    this.form.reset({ nombre: '', tipo: 'peso' });
    this.form.controls.tipo.enable();
    this.formVisible.set(true);
  }

  abrirEdicion(i: InsumoDto): void {
    this.editandoId.set(i.id);
    this.form.reset({ nombre: i.nombre, tipo: i.tipo });
    // El tipo define la unidad base del stock guardado: no se cambia.
    this.form.controls.tipo.disable();
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
      const data: CrearInsumoRequest = { nombre: v.nombre, tipo: v.tipo };
      this.service.crear(data).subscribe({
        next: () => this.alGuardar('Insumo creado.'),
        error: (e) => this.alFallar(e),
      });
    } else {
      const data: ActualizarInsumoRequest = { nombre: v.nombre };
      this.service.actualizar(id, data).subscribe({
        next: () => this.alGuardar('Insumo actualizado.'),
        error: (e) => this.alFallar(e),
      });
    }
  }

  alternarEstado(i: InsumoDto): void {
    this.service.cambiarEstado(i.id, !i.activo).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: i.activo ? 'Insumo desactivado' : 'Insumo activado',
          life: 2500,
        });
        this.cargar();
      },
      error: (e) => this.error(e?.error?.message ?? 'No se pudo cambiar el estado.'),
    });
  }

  // ---- helpers de presentación ----

  tipoTexto(tipo: TipoUnidad): string {
    return TIPO_LABEL[tipo];
  }

  stockTexto(i: InsumoDto): string {
    return `${cantidad.format(Number(i.existencia.cantidadBase))} ${ABREVIATURA_BASE[i.tipo]}`;
  }

  costoTexto(i: InsumoDto): string {
    const c = Number(i.existencia.costoPromedio);
    return c > 0 ? `${dineroFino.format(c)} / ${ABREVIATURA_BASE[i.tipo]}` : '—';
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
    this.error(e?.error?.message ?? 'No se pudo guardar el insumo.');
  }

  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
