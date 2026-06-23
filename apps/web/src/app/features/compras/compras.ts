import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import {
  ABREVIATURA_BASE,
  PAGE_SIZE_DEFAULT,
  type CompraDto,
  type CrearCompraRequest,
  type InsumoDto,
  type ProveedorDto,
  type UnidadMedida,
} from '@pane/shared';
import { InsumosService } from '../insumos/insumos.service';
import { UnidadesService } from '../insumos/unidades.service';
import { ProveedoresService } from '../proveedores/proveedores.service';
import { ComprasService } from './compras.service';

const cantidadFmt = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 4 });
const dinero = new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL',
});
const dineroFino = new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL',
  maximumFractionDigits: 4,
});
const fecha = new Intl.DateTimeFormat('es-HN', { dateStyle: 'medium' });

/**
 * Registro de compras (componente "smart"). Lista los lotes y permite registrar
 * uno nuevo: al elegir el insumo, el selector de unidad se filtra a las del
 * mismo tipo, y se muestra en vivo el costo por unidad base. Solo admin/
 * super_admin (la ruta y el nav ya lo restringen).
 */
@Component({
  selector: 'app-compras',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    SelectModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './compras.html',
})
export class ComprasPage implements OnInit {
  private readonly service = inject(ComprasService);
  private readonly insumosService = inject(InsumosService);
  private readonly unidadesService = inject(UnidadesService);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(MessageService);

  protected readonly compras = signal<CompraDto[]>([]);
  protected readonly insumos = signal<InsumoDto[]>([]);
  protected readonly unidades = signal<UnidadMedida[]>([]);
  protected readonly proveedores = signal<ProveedorDto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  // --- paginación + filtros (servidor) ---
  protected readonly total = signal(0);
  protected readonly first = signal(0);
  protected readonly rows = signal(PAGE_SIZE_DEFAULT);
  protected readonly filtroInsumoId = signal<number | null>(null);
  protected readonly filtroProveedorId = signal<number | null>(null);
  protected readonly filtroDesde = signal('');
  protected readonly filtroHasta = signal('');

  protected readonly formVisible = signal(false);
  /** Insumo seleccionado (para filtrar unidades y el preview). */
  protected readonly insumoSeleccionado = signal<InsumoDto | null>(null);

  protected readonly form = this.fb.group({
    insumoId: [null as number | null, [Validators.required]],
    unidadCompraId: [null as number | null, [Validators.required]],
    cantidad: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    costo: [null as number | null, [Validators.required, Validators.min(0.01)]],
    proveedorId: [null as number | null],
  });

  /** Solo insumos activos pueden comprarse. */
  protected readonly insumosActivos = computed(() =>
    this.insumos().filter((i) => i.activo),
  );

  /** Solo proveedores activos para el selector. */
  protected readonly proveedoresActivos = computed(() =>
    this.proveedores().filter((p) => p.activo),
  );

  /** Unidades del mismo tipo que el insumo seleccionado. */
  protected readonly unidadesFiltradas = computed(() => {
    const ins = this.insumoSeleccionado();
    return ins ? this.unidades().filter((u) => u.tipo === ins.tipo) : [];
  });

  ngOnInit(): void {
    // El listado lo dispara la tabla (lazy); aquí, las opciones de los selects.
    this.unidadesService.listar().subscribe({
      next: (u) => this.unidades.set(u),
      error: () => this.error('No se pudieron cargar las unidades.'),
    });
    this.insumosService.listar().subscribe({
      next: (i) => this.insumos.set(i),
      error: () => this.error('No se pudieron cargar los insumos.'),
    });
    this.proveedoresService.listar().subscribe({
      next: (p) => this.proveedores.set(p),
      error: () => this.error('No se pudieron cargar los proveedores.'),
    });
  }

  /** Recarga la página actual desde el servidor con los filtros vigentes. */
  cargar(): void {
    this.cargando.set(true);
    this.service
      .listar({
        page: Math.floor(this.first() / this.rows()) + 1,
        pageSize: this.rows(),
        insumoId: this.filtroInsumoId() ?? undefined,
        proveedorId: this.filtroProveedorId() ?? undefined,
        desde: this.filtroDesde() || undefined,
        hasta: this.filtroHasta() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.compras.set(res.items);
          this.total.set(res.total);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.error('No se pudieron cargar las compras.');
        },
      });
  }

  /** La tabla (lazy) dispara esto al iniciar y al cambiar de página. */
  onLazy(e: TableLazyLoadEvent): void {
    this.first.set(e.first ?? 0);
    this.rows.set(e.rows ?? PAGE_SIZE_DEFAULT);
    this.cargar();
  }

  /** Reinicia a la primera página y recarga (al cambiar un filtro). */
  aplicarFiltros(): void {
    this.first.set(0);
    this.cargar();
  }

  abrirNueva(): void {
    this.insumoSeleccionado.set(null);
    this.form.reset({
      insumoId: null,
      unidadCompraId: null,
      cantidad: null,
      costo: null,
      proveedorId: null,
    });
    this.formVisible.set(true);
  }

  alCambiarInsumo(insumoId: number): void {
    const ins = this.insumos().find((i) => i.id === insumoId) ?? null;
    this.insumoSeleccionado.set(ins);
    // Al cambiar de insumo, la unidad anterior puede no aplicar: se limpia.
    this.form.controls.unidadCompraId.setValue(null);
  }

  /** Vista previa del costo por unidad base (o null si faltan datos). */
  vistaPrevia(): string | null {
    const ins = this.insumoSeleccionado();
    const v = this.form.getRawValue();
    const unidad = this.unidades().find((u) => u.id === v.unidadCompraId);
    if (!ins || !unidad || !v.cantidad || !v.costo) {
      return null;
    }
    // La unidad base tiene factor 1, así que base = cantidad * factor_compra.
    const cantidadBase = v.cantidad * unidad.factorABase;
    if (cantidadBase <= 0) {
      return null;
    }
    const abrev = ABREVIATURA_BASE[ins.tipo];
    const costoBase = v.costo / cantidadBase;
    return `${cantidadFmt.format(cantidadBase)} ${abrev} · ${dineroFino.format(costoBase)}/${abrev}`;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const data: CrearCompraRequest = {
      insumoId: v.insumoId as number,
      unidadCompraId: v.unidadCompraId as number,
      cantidad: v.cantidad as number,
      costo: v.costo as number,
      proveedorId: v.proveedorId ?? undefined,
    };
    this.guardando.set(true);
    this.service.crear(data).subscribe({
      next: () => {
        this.guardando.set(false);
        this.formVisible.set(false);
        this.toast.add({ severity: 'success', summary: 'Compra registrada.', life: 2500 });
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.error(e?.error?.message ?? 'No se pudo registrar la compra.');
      },
    });
  }

  // ---- helpers de presentación ----

  dineroTexto(valor: string): string {
    return dinero.format(Number(valor));
  }

  dineroFinoTexto(valor: string): string {
    return dineroFino.format(Number(valor));
  }

  cantidadTexto(valor: string): string {
    return cantidadFmt.format(Number(valor));
  }

  fechaTexto(iso: string): string {
    return fecha.format(new Date(iso));
  }

  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
