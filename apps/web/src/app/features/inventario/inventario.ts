import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
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
} from '@pane/shared';
import { RecetasService } from '../recetas/recetas.service';
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
    InputNumberModule,
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
  private readonly toast = inject(MessageService);

  protected readonly existencias = signal<StockDto[]>([]);
  protected readonly alertas = signal<AlertaStockDto[]>([]);
  protected readonly cargando = signal(false);

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
