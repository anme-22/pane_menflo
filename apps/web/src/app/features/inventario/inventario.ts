import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import type {
  AlertaStockDto,
  CoberturaResultadoDto,
  KardexDto,
  RecetaResumenDto,
  StockDto,
  UnidadMedida,
} from '@pane/shared';
import { AuthService } from '../../core/auth/auth.service';
import { RecetasService } from '../recetas/recetas.service';
import { UnidadesService } from '../insumos/unidades.service';
import { InventarioService } from './inventario.service';

const numero = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 2 });
const cantidad = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 4 });
const dinero = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' });
const dineroFino = new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL',
  maximumFractionDigits: 4,
});
const fecha = new Intl.DateTimeFormat('es-HN', { dateStyle: 'medium' });

/**
 * Inventario (componente "smart", solo lectura). Reúne las 4 vistas de la
 * Feature 8: existencias, panel de alertas, kardex por insumo y calculadora de
 * cobertura. Cualquier rol consulta (el vendedor en modo lectura). App zoneless:
 * estado por signals; los datos llegan por servicios y se guardan en signals.
 */
@Component({
  selector: 'app-inventario',
  imports: [
    FormsModule,
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
  templateUrl: './inventario.html',
})
export class InventarioPage implements OnInit {
  private readonly service = inject(InventarioService);
  private readonly recetasService = inject(RecetasService);
  private readonly unidadesService = inject(UnidadesService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);

  /** Solo admin/super_admin ajustan stock; el resto consulta. */
  protected readonly puedeGestionar = computed(() =>
    this.auth.tieneRol('admin', 'super_admin'),
  );

  protected readonly existencias = signal<StockDto[]>([]);
  protected readonly alertas = signal<AlertaStockDto[]>([]);
  protected readonly unidades = signal<UnidadMedida[]>([]);
  protected readonly cargando = signal(false);

  // --- ajuste manual de stock ---
  protected readonly ajusteVisible = signal(false);
  protected readonly ajusteInsumo = signal<StockDto | null>(null);
  protected readonly ajusteIncrementa = signal(true);
  protected readonly ajusteCantidad = signal<number | null>(null);
  protected readonly ajusteUnidadId = signal<number | null>(null);
  protected readonly ajusteMotivo = signal('');
  protected readonly guardandoAjuste = signal(false);

  protected readonly opcionesDireccion = [
    { label: 'Aumentar (+)', value: true },
    { label: 'Disminuir (−)', value: false },
  ];

  /** Unidades del mismo tipo que el insumo del ajuste. */
  protected readonly unidadesAjuste = computed(() => {
    const ins = this.ajusteInsumo();
    return ins ? this.unidades().filter((u) => u.tipo === ins.tipo) : [];
  });

  // --- kardex ---
  protected readonly insumoKardexId = signal<number | null>(null);
  protected readonly kardex = signal<KardexDto | null>(null);
  protected readonly cargandoKardex = signal(false);

  /** Opciones del selector de insumo para el kardex (de las existencias). */
  protected readonly opcionesInsumo = computed(() =>
    this.existencias().map((s) => ({ id: s.insumoId, nombre: s.insumoNombre })),
  );

  // --- cobertura ---
  protected readonly recetas = signal<RecetaResumenDto[]>([]);
  protected readonly coberturaProductoId = signal<number | null>(null);
  protected readonly coberturaSacos = signal<number | null>(null);
  protected readonly cobertura = signal<CoberturaResultadoDto | null>(null);
  protected readonly calculandoCobertura = signal(false);

  protected readonly opcionesProducto = computed(() =>
    this.recetas().map((r) => ({
      productoId: r.productoId,
      etiqueta: `${r.productoNombre} (${r.rendimiento}/${r.unidadLote})`,
    })),
  );

  ngOnInit(): void {
    this.cargar();
    this.recetasService.listar().subscribe({
      next: (r) => this.recetas.set(r),
      error: () => this.error('No se pudieron cargar las recetas.'),
    });
    if (this.puedeGestionar()) {
      this.unidadesService.listar().subscribe({
        next: (u) => this.unidades.set(u),
        error: () => this.error('No se pudieron cargar las unidades.'),
      });
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.existencias().subscribe({
      next: (data) => {
        this.existencias.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error('No se pudieron cargar las existencias.');
      },
    });
    this.service.alertas().subscribe({
      next: (a) => this.alertas.set(a),
      error: () => this.error('No se pudieron cargar las alertas.'),
    });
  }

  // ---- kardex ----

  verKardex(insumoId: number | null): void {
    this.insumoKardexId.set(insumoId);
    this.kardex.set(null);
    if (insumoId === null) {
      return;
    }
    this.cargandoKardex.set(true);
    this.service.kardex(insumoId).subscribe({
      next: (k) => {
        this.kardex.set(k);
        this.cargandoKardex.set(false);
      },
      error: () => {
        this.cargandoKardex.set(false);
        this.error('No se pudo cargar el kardex.');
      },
    });
  }

  // ---- ajuste manual de stock ----

  abrirAjuste(s: StockDto): void {
    this.ajusteInsumo.set(s);
    this.ajusteIncrementa.set(true);
    this.ajusteCantidad.set(null);
    this.ajusteMotivo.set('');
    // Unidad por defecto: la base del tipo (factor 1).
    const base = this.unidades().find(
      (u) => u.tipo === s.tipo && Number(u.factorABase) === 1,
    );
    this.ajusteUnidadId.set(base ? base.id : null);
    this.ajusteVisible.set(true);
  }

  guardarAjuste(): void {
    const ins = this.ajusteInsumo();
    const cant = this.ajusteCantidad();
    const unidadId = this.ajusteUnidadId();
    const motivo = this.ajusteMotivo().trim();
    if (!ins || !cant || cant <= 0 || unidadId === null || motivo.length < 3) {
      this.error('Completa cantidad, unidad y un motivo (mínimo 3 caracteres).');
      return;
    }
    this.guardandoAjuste.set(true);
    this.service
      .ajustar({
        insumoId: ins.insumoId,
        incrementa: this.ajusteIncrementa(),
        cantidad: cant,
        unidadId,
        motivo,
      })
      .subscribe({
        next: () => {
          this.guardandoAjuste.set(false);
          this.ajusteVisible.set(false);
          this.toast.add({ severity: 'success', summary: 'Stock ajustado', life: 2500 });
          this.cargar();
          // Si el kardex de este insumo está abierto, refrescarlo.
          if (this.insumoKardexId() === ins.insumoId) {
            this.verKardex(ins.insumoId);
          }
        },
        error: (e) => {
          this.guardandoAjuste.set(false);
          this.error(e?.error?.message ?? 'No se pudo ajustar el stock.');
        },
      });
  }

  // ---- cobertura ----

  calcularCobertura(): void {
    const productoId = this.coberturaProductoId();
    const sacos = this.coberturaSacos();
    if (productoId === null || !sacos || sacos <= 0) {
      this.error('Elige un producto y los sacos por día.');
      return;
    }
    this.calculandoCobertura.set(true);
    this.service.cobertura({ productoId, sacosPorDia: sacos }).subscribe({
      next: (r) => {
        this.cobertura.set(r);
        this.calculandoCobertura.set(false);
      },
      error: (e) => {
        this.calculandoCobertura.set(false);
        this.error(e?.error?.message ?? 'No se pudo calcular la cobertura.');
      },
    });
  }

  // ---- helpers de presentación ----

  diasTexto(dias: number | null): string {
    if (dias === null) {
      return '—';
    }
    return `${numero.format(dias)} día${dias === 1 ? '' : 's'}`;
  }

  cantidadTexto(valor: string | number, abrev = ''): string {
    return `${cantidad.format(Number(valor))}${abrev ? ' ' + abrev : ''}`;
  }

  dineroTexto(valor: string): string {
    return dinero.format(Number(valor));
  }

  dineroFinoTexto(valor: string, abrev = ''): string {
    const c = Number(valor);
    return c > 0 ? `${dineroFino.format(c)}${abrev ? ' / ' + abrev : ''}` : '—';
  }

  fechaTexto(iso: string): string {
    return fecha.format(new Date(iso));
  }

  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
