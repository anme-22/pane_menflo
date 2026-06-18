import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import type {
  CrearRecetaRequest,
  InsumoDto,
  ProductoDto,
  RecetaResumenDto,
  UnidadMedida,
} from '@pane/shared';
import { ProductosService } from '../productos/productos.service';
import { InsumosService } from '../insumos/insumos.service';
import { UnidadesService } from '../insumos/unidades.service';
import { RecetasService } from './recetas.service';

const dinero = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' });
const dineroFino = new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL',
  maximumFractionDigits: 4,
});

/**
 * Editor de recetas (componente "smart"). Lista las recetas con su costo por
 * bolsa y permite crear/editar una receta: producto + rendimiento + lote e
 * ingredientes dinámicos (insumo + cantidad + unidad filtrada por tipo). Muestra
 * el costo por bolsa en vivo. Solo admin/super_admin (ruta y nav lo restringen).
 */
@Component({
  selector: 'app-recetas',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './recetas.html',
})
export class RecetasPage implements OnInit {
  private readonly service = inject(RecetasService);
  private readonly productosService = inject(ProductosService);
  private readonly insumosService = inject(InsumosService);
  private readonly unidadesService = inject(UnidadesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly recetas = signal<RecetaResumenDto[]>([]);
  protected readonly productos = signal<ProductoDto[]>([]);
  protected readonly insumos = signal<InsumoDto[]>([]);
  protected readonly unidades = signal<UnidadMedida[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  protected readonly formVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);

  protected readonly form = this.fb.group({
    productoId: [null as number | null, [Validators.required]],
    rendimiento: [null as number | null, [Validators.required, Validators.min(1)]],
    unidadLote: ['quintal', [Validators.required]],
    ingredientes: this.fb.array([this.grupoIngrediente()]),
  });

  /**
   * Signal del valor del form. La app es zoneless: leerlo en la plantilla hace
   * que las expresiones que dependen del form (opciones de unidad por fila,
   * costo en vivo) se re-evalúen al cambiar cualquier control.
   */
  protected readonly formValor = toSignal(this.form.valueChanges);

  /** Costo de la receta en vivo (recalcula al cambiar el form, insumos o unidades). */
  protected readonly costoPreview = computed<{
    receta: number;
    porBolsa: number;
  } | null>(() => {
    this.formValor(); // dependencia del valor del form (zoneless)
    const v = this.form.getRawValue();
    if (!v.ingredientes?.length) {
      return null;
    }
    let total = 0;
    for (const f of v.ingredientes) {
      const ins = this.insumos().find((i) => i.id === f.insumoId);
      const uni = this.unidades().find((u) => u.id === f.unidadId);
      if (!ins || !uni || !f.cantidad) {
        continue;
      }
      // La unidad base tiene factor 1: base = cantidad * factor_unidad.
      total += f.cantidad * uni.factorABase * Number(ins.existencia.costoPromedio);
    }
    const rend = v.rendimiento;
    return { receta: total, porBolsa: rend && rend > 0 ? total / rend : 0 };
  });

  /** Insumos activos para los selectores de ingrediente. */
  protected readonly insumosActivos = computed(() =>
    this.insumos().filter((i) => i.activo),
  );

  /** Productos que se pueden elegir: al crear, activos y sin receta. */
  protected readonly productosParaSelect = computed(() => {
    if (this.editandoId() !== null) {
      return this.productos();
    }
    const conReceta = new Set(this.recetas().map((r) => r.productoId));
    return this.productos().filter((p) => p.activo && !conReceta.has(p.id));
  });

  ngOnInit(): void {
    this.cargar();
    this.productosService.listar().subscribe({
      next: (p) => this.productos.set(p),
      error: () => this.error('No se pudieron cargar los productos.'),
    });
    this.insumosService.listar().subscribe({
      next: (i) => this.insumos.set(i),
      error: () => this.error('No se pudieron cargar los insumos.'),
    });
    this.unidadesService.listar().subscribe({
      next: (u) => this.unidades.set(u),
      error: () => this.error('No se pudieron cargar las unidades.'),
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: (data) => {
        this.recetas.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error('No se pudieron cargar las recetas.');
      },
    });
  }

  // ---- FormArray de ingredientes ----

  get ingredientes(): FormArray {
    return this.form.controls.ingredientes;
  }

  private grupoIngrediente() {
    return this.fb.group({
      insumoId: [null as number | null, [Validators.required]],
      cantidad: [null as number | null, [Validators.required, Validators.min(0.0001)]],
      unidadId: [null as number | null, [Validators.required]],
    });
  }

  agregarIngrediente(): void {
    this.ingredientes.push(this.grupoIngrediente());
  }

  quitarIngrediente(i: number): void {
    this.ingredientes.removeAt(i);
  }

  alCambiarInsumoFila(i: number): void {
    // Al cambiar de insumo, la unidad anterior puede no aplicar: se limpia.
    this.ingredientes.at(i).get('unidadId')?.setValue(null);
  }

  /** Unidades del mismo tipo que el insumo seleccionado en la fila. */
  unidadesParaInsumoId(insumoId: number | null): UnidadMedida[] {
    this.formValor(); // dependencia: re-evaluar al cambiar el insumo de la fila
    const ins = this.insumos().find((i) => i.id === insumoId);
    return ins ? this.unidades().filter((u) => u.tipo === ins.tipo) : [];
  }

  // ---- abrir diálogo ----

  abrirNueva(): void {
    this.editandoId.set(null);
    this.ingredientes.clear();
    this.ingredientes.push(this.grupoIngrediente());
    this.form.reset({ productoId: null, rendimiento: null, unidadLote: 'quintal' });
    this.form.controls.productoId.enable();
    this.formVisible.set(true);
  }

  abrirEdicion(r: RecetaResumenDto): void {
    this.service.obtenerPorProducto(r.productoId).subscribe({
      next: (receta) => {
        if (!receta) {
          this.error('No se encontró la receta.');
          return;
        }
        this.editandoId.set(receta.id);
        this.ingredientes.clear();
        for (const ing of receta.ingredientes) {
          const g = this.grupoIngrediente();
          g.setValue({
            insumoId: ing.insumoId,
            cantidad: Number(ing.cantidad),
            unidadId: ing.unidadId,
          });
          this.ingredientes.push(g);
        }
        this.form.reset({
          productoId: receta.productoId,
          rendimiento: receta.rendimiento,
          unidadLote: receta.unidadLote,
        });
        // El producto de una receta existente no se cambia.
        this.form.controls.productoId.disable();
        this.formVisible.set(true);
      },
      error: () => this.error('No se pudo cargar la receta.'),
    });
  }

  // ---- guardar / eliminar ----

  guardar(): void {
    if (this.form.invalid || this.ingredientes.length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const ingredientes = v.ingredientes.map((f) => ({
      insumoId: f.insumoId as number,
      cantidad: f.cantidad as number,
      unidadId: f.unidadId as number,
    }));
    this.guardando.set(true);
    const id = this.editandoId();

    if (id === null) {
      const data: CrearRecetaRequest = {
        productoId: v.productoId as number,
        rendimiento: v.rendimiento as number,
        unidadLote: v.unidadLote,
        ingredientes,
      };
      this.service.crear(data).subscribe({
        next: () => this.alGuardar('Receta creada.'),
        error: (e) => this.alFallar(e),
      });
    } else {
      this.service
        .actualizar(id, {
          rendimiento: v.rendimiento as number,
          unidadLote: v.unidadLote,
          ingredientes,
        })
        .subscribe({
          next: () => this.alGuardar('Receta actualizada.'),
          error: (e) => this.alFallar(e),
        });
    }
  }

  confirmarEliminar(r: RecetaResumenDto): void {
    this.confirm.confirm({
      header: 'Eliminar receta',
      message: `¿Eliminar la receta de "${r.productoNombre}"? Esta acción no se puede deshacer.`,
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.eliminar(r.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Receta eliminada', life: 2500 });
            this.cargar();
          },
          error: (e) => this.error(e?.error?.message ?? 'No se pudo eliminar.'),
        });
      },
    });
  }

  // ---- helpers de presentación ----

  dineroTexto(valor: string): string {
    return dinero.format(Number(valor));
  }

  dineroFinoTexto(valor: string | number): string {
    return dineroFino.format(Number(valor));
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
    this.error(e?.error?.message ?? 'No se pudo guardar la receta.');
  }

  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
