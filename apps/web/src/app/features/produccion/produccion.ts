import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  ESTADO_PRODUCCION_LABEL,
  type EstadoProduccion,
  type OrdenProduccionDto,
  type OrdenProduccionResumenDto,
  type RecetaResumenDto,
} from '@pane/shared';
import { RecetasService } from '../recetas/recetas.service';
import { ProduccionService } from './produccion.service';

const dinero = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' });
const cantidad = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 2 });
const fecha = new Intl.DateTimeFormat('es-HN', { dateStyle: 'medium' });

/** Severidad del Tag de PrimeNG según el estado de la orden. */
const SEVERIDAD_ESTADO: Record<EstadoProduccion, 'info' | 'success' | 'danger'> = {
  BORRADOR: 'info',
  CONFIRMADA: 'success',
  ANULADA: 'danger',
};

/**
 * Órdenes de producción (componente "smart"). Lista las órdenes con su estado y
 * permite crear una (producto con receta + sacos → bolsas esperadas en vivo),
 * confirmarla (descuenta inventario), capturar las bolsas reales (merma) y
 * anularla con motivo. App ZONELESS: la reactividad del cálculo de bolsas
 * esperadas se apoya en un signal del formulario. Solo admin/super_admin.
 */
@Component({
  selector: 'app-produccion',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './produccion.html',
})
export class ProduccionPage implements OnInit {
  private readonly service = inject(ProduccionService);
  private readonly recetasService = inject(RecetasService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly ordenes = signal<OrdenProduccionResumenDto[]>([]);
  protected readonly recetas = signal<RecetaResumenDto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  // --- crear ---
  protected readonly formVisible = signal(false);
  protected readonly form = this.fb.group({
    productoId: [null as number | null, [Validators.required]],
    sacos: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });
  private readonly formValor = toSignal(this.form.valueChanges);

  // --- capturar bolsas reales ---
  protected readonly realesVisible = signal(false);
  protected readonly realesOrden = signal<OrdenProduccionResumenDto | null>(null);
  protected readonly formReales = this.fb.group({
    bolsasReales: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  // --- anular ---
  protected readonly anularVisible = signal(false);
  protected readonly anularOrden = signal<OrdenProduccionResumenDto | null>(null);
  protected readonly formAnular = this.fb.group({
    motivo: ['', [Validators.required, Validators.minLength(3)]],
  });

  // --- detalle (consumos) ---
  protected readonly detalleVisible = signal(false);
  protected readonly detalle = signal<OrdenProduccionDto | null>(null);

  /** Recetas como opciones del selector de producto (solo productos con receta). */
  protected readonly opcionesProducto = computed(() =>
    this.recetas().map((r) => ({
      productoId: r.productoId,
      etiqueta: `${r.productoNombre} (${r.rendimiento}/${r.unidadLote})`,
    })),
  );

  /** Bolsas esperadas en vivo = round(sacos × rendimiento de la receta elegida). */
  protected readonly bolsasEsperadas = computed<number | null>(() => {
    this.formValor(); // dependencia del valor del form (zoneless)
    const v = this.form.getRawValue();
    const receta = this.recetas().find((r) => r.productoId === v.productoId);
    if (!receta || !v.sacos || v.sacos <= 0) {
      return null;
    }
    return Math.round(v.sacos * receta.rendimiento);
  });

  ngOnInit(): void {
    this.cargar();
    this.recetasService.listar().subscribe({
      next: (r) => this.recetas.set(r),
      error: () => this.error('No se pudieron cargar las recetas.'),
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: (data) => {
        this.ordenes.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error('No se pudieron cargar las órdenes.');
      },
    });
  }

  // ---- crear ----

  abrirNueva(): void {
    this.form.reset({ productoId: null, sacos: null });
    this.formVisible.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.service
      .crear({ productoId: v.productoId as number, sacos: v.sacos as number })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.formVisible.set(false);
          this.toast.add({ severity: 'success', summary: 'Orden creada.', life: 2500 });
          this.cargar();
        },
        error: (e) => {
          this.guardando.set(false);
          this.error(e?.error?.message ?? 'No se pudo crear la orden.');
        },
      });
  }

  // ---- confirmar ----

  confirmarOrden(o: OrdenProduccionResumenDto): void {
    this.confirm.confirm({
      header: 'Confirmar producción',
      message: `Al confirmar se descontará el inventario de la receta de "${o.productoNombre}". ¿Continuar?`,
      acceptLabel: 'Confirmar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.service.confirmar(o.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Producción confirmada', life: 2500 });
            this.cargar();
          },
          error: (e) => this.error(e?.error?.message ?? 'No se pudo confirmar.'),
        });
      },
    });
  }

  // ---- capturar bolsas reales ----

  abrirReales(o: OrdenProduccionResumenDto): void {
    this.realesOrden.set(o);
    this.formReales.reset({ bolsasReales: o.bolsasReales });
    this.realesVisible.set(true);
  }

  guardarReales(): void {
    const orden = this.realesOrden();
    if (!orden || this.formReales.invalid) {
      this.formReales.markAllAsTouched();
      return;
    }
    const bolsasReales = this.formReales.getRawValue().bolsasReales as number;
    this.guardando.set(true);
    this.service.capturarBolsasReales(orden.id, { bolsasReales }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.realesVisible.set(false);
        this.toast.add({ severity: 'success', summary: 'Bolsas reales guardadas.', life: 2500 });
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.error(e?.error?.message ?? 'No se pudo guardar.');
      },
    });
  }

  // ---- anular ----

  abrirAnular(o: OrdenProduccionResumenDto): void {
    this.anularOrden.set(o);
    this.formAnular.reset({ motivo: '' });
    this.anularVisible.set(true);
  }

  guardarAnular(): void {
    const orden = this.anularOrden();
    if (!orden || this.formAnular.invalid) {
      this.formAnular.markAllAsTouched();
      return;
    }
    const motivo = this.formAnular.getRawValue().motivo;
    this.guardando.set(true);
    this.service.anular(orden.id, { motivo }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.anularVisible.set(false);
        this.toast.add({ severity: 'success', summary: 'Orden anulada', life: 2500 });
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.error(e?.error?.message ?? 'No se pudo anular.');
      },
    });
  }

  // ---- detalle ----

  verDetalle(o: OrdenProduccionResumenDto): void {
    this.detalle.set(null);
    this.detalleVisible.set(true);
    this.service.obtener(o.id).subscribe({
      next: (d) => this.detalle.set(d),
      error: () => this.error('No se pudo cargar el detalle.'),
    });
  }

  // ---- helpers de presentación ----

  severidad(estado: EstadoProduccion) {
    return SEVERIDAD_ESTADO[estado];
  }

  estadoTexto(estado: EstadoProduccion): string {
    return ESTADO_PRODUCCION_LABEL[estado];
  }

  dineroTexto(valor: string): string {
    return dinero.format(Number(valor));
  }

  cantidadTexto(valor: string | number): string {
    return cantidad.format(Number(valor));
  }

  fechaTexto(iso: string): string {
    return fecha.format(new Date(iso));
  }

  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
