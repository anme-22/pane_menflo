import { Component, inject, OnInit, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  TIPOS_COSTO_INDIRECTO,
  TIPO_COSTO_INDIRECTO_LABEL,
  type CostoIndirectoDto,
  type CrearCostoIndirectoRequest,
  type TipoCostoIndirecto,
} from '@pane/shared';
import { CostosIndirectosService } from './costos-indirectos.service';

const dinero = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' });

/**
 * Costos indirectos (componente "smart"). CRUD + activar/desactivar y el
 * parámetro de prorrateo (quintales/mes). Afectan el costo por bolsa de las
 * recetas. Solo admin/super_admin (ruta y nav lo restringen). App zoneless.
 */
@Component({
  selector: 'app-costos-indirectos',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './costos-indirectos.html',
})
export class CostosIndirectosPage implements OnInit {
  private readonly service = inject(CostosIndirectosService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(MessageService);

  protected readonly items = signal<CostoIndirectoDto[]>([]);
  protected readonly quintalesPorMes = signal(0);
  protected readonly indirectoPorLote = signal('0');
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  protected readonly opcionesTipo = TIPOS_COSTO_INDIRECTO.map((t) => ({
    label: TIPO_COSTO_INDIRECTO_LABEL[t],
    value: t,
  }));

  // alta / edición
  protected readonly formVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    tipo: ['POR_QUINTAL' as TipoCostoIndirecto, [Validators.required]],
  });

  // parámetro
  protected readonly formParam = this.fb.group({
    quintalesPorMes: [100 as number | null, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: (r) => this.aplicar(r),
      error: () => {
        this.cargando.set(false);
        this.error('No se pudieron cargar los costos indirectos.');
      },
    });
  }

  private aplicar(r: { items: CostoIndirectoDto[]; quintalesPorMes: number; indirectoPorLote: string }): void {
    this.items.set(r.items);
    this.quintalesPorMes.set(r.quintalesPorMes);
    this.indirectoPorLote.set(r.indirectoPorLote);
    this.formParam.reset({ quintalesPorMes: r.quintalesPorMes });
    this.cargando.set(false);
  }

  // ---- alta / edición ----

  abrirNuevo(): void {
    this.editandoId.set(null);
    this.form.reset({ nombre: '', monto: null, tipo: 'POR_QUINTAL' });
    this.formVisible.set(true);
  }

  abrirEdicion(c: CostoIndirectoDto): void {
    this.editandoId.set(c.id);
    this.form.reset({ nombre: c.nombre, monto: Number(c.monto), tipo: c.tipo });
    this.formVisible.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const data: CrearCostoIndirectoRequest = {
      nombre: v.nombre,
      monto: v.monto as number,
      tipo: v.tipo,
    };
    this.guardando.set(true);
    const id = this.editandoId();
    const obs = id === null ? this.service.crear(data) : this.service.actualizar(id, data);
    obs.subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.formVisible.set(false);
        this.toast.add({ severity: 'success', summary: id === null ? 'Costo creado.' : 'Costo actualizado.', life: 2500 });
        this.aplicar(r);
      },
      error: (e) => {
        this.guardando.set(false);
        this.error(e?.error?.message ?? 'No se pudo guardar.');
      },
    });
  }

  alternarEstado(c: CostoIndirectoDto): void {
    this.service.cambiarEstado(c.id, !c.activo).subscribe({
      next: (r) => {
        this.toast.add({ severity: 'success', summary: c.activo ? 'Desactivado' : 'Activado', life: 2000 });
        this.aplicar(r);
      },
      error: (e) => this.error(e?.error?.message ?? 'No se pudo cambiar el estado.'),
    });
  }

  // ---- parámetro ----

  guardarParametro(): void {
    if (this.formParam.invalid) {
      this.formParam.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.service
      .actualizarParametros({ quintalesPorMes: this.formParam.getRawValue().quintalesPorMes as number })
      .subscribe({
        next: (r) => {
          this.guardando.set(false);
          this.toast.add({ severity: 'success', summary: 'Parámetro actualizado.', life: 2500 });
          this.aplicar(r);
        },
        error: (e) => {
          this.guardando.set(false);
          this.error(e?.error?.message ?? 'No se pudo actualizar.');
        },
      });
  }

  // ---- helpers ----

  tipoLabel(t: TipoCostoIndirecto): string {
    return TIPO_COSTO_INDIRECTO_LABEL[t];
  }
  dineroTexto(v: string | number): string {
    return dinero.format(Number(v));
  }
  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
