import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  ESTADO_CAJA_LABEL,
  TIPO_MOVIMIENTO_CAJA_LABEL,
  type CajaSesionDto,
  type CajaSesionResumenDto,
  type EstadoCaja,
  type TipoMovimientoCaja,
} from '@pane/shared';
import { CajaService } from './caja.service';

const dinero = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' });
const fechaHora = new Intl.DateTimeFormat('es-HN', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Caja / Arqueo (componente "smart"). Muestra la sesión abierta con su desglose
 * de efectivo en vivo, permite abrir, registrar ingresos/egresos y cerrar
 * contando el efectivo físico (con la diferencia). Abajo, el histórico de cierres.
 * App ZONELESS: estado en signals + ngModel; el preview de la diferencia es un
 * computed. Los tres roles operan la caja.
 */
@Component({
  selector: 'app-caja',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './caja.html',
})
export class CajaPage implements OnInit {
  private readonly service = inject(CajaService);
  private readonly toast = inject(MessageService);

  /** Expuesto para la plantilla (comparar importes string > 0). */
  protected readonly Number = Number;

  protected readonly sesion = signal<CajaSesionDto | null>(null);
  protected readonly historico = signal<CajaSesionResumenDto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  protected readonly tiposMovimiento = [
    { label: TIPO_MOVIMIENTO_CAJA_LABEL.INGRESO, value: 'INGRESO' as TipoMovimientoCaja },
    { label: TIPO_MOVIMIENTO_CAJA_LABEL.EGRESO, value: 'EGRESO' as TipoMovimientoCaja },
  ];

  // --- abrir ---
  protected readonly abrirVisible = signal(false);
  protected readonly montoInicial = signal<number | null>(0);

  // --- movimiento ---
  protected readonly movVisible = signal(false);
  protected readonly movTipo = signal<TipoMovimientoCaja>('INGRESO');
  protected readonly movMonto = signal<number | null>(null);
  protected readonly movConcepto = signal('');

  // --- cerrar ---
  protected readonly cerrarVisible = signal(false);
  protected readonly montoContado = signal<number | null>(null);
  protected readonly observacion = signal('');

  /** Diferencia en vivo del cierre = contado − esperado. */
  protected readonly diferenciaPreview = computed(() => {
    const s = this.sesion();
    const contado = this.montoContado();
    if (!s || contado === null) {
      return null;
    }
    return contado - Number(s.resumen.efectivoEsperado);
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.actual().subscribe({
      next: (s) => {
        this.sesion.set(s);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error('No se pudo cargar la caja.');
      },
    });
    this.service.listar().subscribe({
      next: (h) => this.historico.set(h),
      error: () => undefined,
    });
  }

  // ---- abrir ----

  abrirCaja(): void {
    this.montoInicial.set(0);
    this.abrirVisible.set(true);
  }

  guardarAbrir(): void {
    const monto = this.montoInicial();
    if (monto === null || monto < 0) {
      this.error('El monto inicial no puede ser negativo.');
      return;
    }
    this.guardando.set(true);
    this.service.abrir({ montoInicial: monto }).subscribe({
      next: (s) => {
        this.guardando.set(false);
        this.abrirVisible.set(false);
        this.sesion.set(s);
        this.toast.add({ severity: 'success', summary: 'Caja abierta', life: 2500 });
      },
      error: (e) => this.fallar(e, 'No se pudo abrir la caja.'),
    });
  }

  // ---- movimiento ----

  abrirMovimiento(tipo: TipoMovimientoCaja): void {
    this.movTipo.set(tipo);
    this.movMonto.set(null);
    this.movConcepto.set('');
    this.movVisible.set(true);
  }

  guardarMovimiento(): void {
    const s = this.sesion();
    const monto = this.movMonto();
    const concepto = this.movConcepto().trim();
    if (!s) {
      return;
    }
    if (monto === null || monto <= 0) {
      this.error('El monto debe ser mayor que cero.');
      return;
    }
    if (concepto.length < 3) {
      this.error('Escribe un concepto.');
      return;
    }
    this.guardando.set(true);
    this.service
      .registrarMovimiento(s.id, { tipo: this.movTipo(), monto, concepto })
      .subscribe({
        next: (act) => {
          this.guardando.set(false);
          this.movVisible.set(false);
          this.sesion.set(act);
          this.toast.add({ severity: 'success', summary: 'Movimiento registrado', life: 2500 });
        },
        error: (e) => this.fallar(e, 'No se pudo registrar el movimiento.'),
      });
  }

  // ---- cerrar ----

  abrirCerrar(): void {
    this.montoContado.set(null);
    this.observacion.set('');
    this.cerrarVisible.set(true);
  }

  guardarCerrar(): void {
    const s = this.sesion();
    const contado = this.montoContado();
    if (!s) {
      return;
    }
    if (contado === null || contado < 0) {
      this.error('Ingresa el efectivo contado (no negativo).');
      return;
    }
    this.guardando.set(true);
    this.service
      .cerrar(s.id, { montoContado: contado, observacion: this.observacion().trim() || undefined })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarVisible.set(false);
          this.sesion.set(null);
          this.toast.add({ severity: 'success', summary: 'Caja cerrada', life: 2500 });
          this.cargar();
        },
        error: (e) => this.fallar(e, 'No se pudo cerrar la caja.'),
      });
  }

  // ---- helpers de presentación ----

  estadoLabel(e: EstadoCaja): string {
    return ESTADO_CAJA_LABEL[e];
  }
  tipoMovLabel(t: TipoMovimientoCaja): string {
    return TIPO_MOVIMIENTO_CAJA_LABEL[t];
  }
  dineroTexto(valor: string | number | null): string {
    return valor === null ? '—' : dinero.format(Number(valor));
  }
  fechaTexto(iso: string | null): string {
    return iso ? fechaHora.format(new Date(iso)) : '—';
  }
  /** Severidad del Tag de diferencia: 0 = ok, falta = danger, sobra = warn. */
  sevDiferencia(dif: number | string | null): 'success' | 'danger' | 'warn' {
    const n = Number(dif ?? 0);
    if (n === 0) return 'success';
    return n < 0 ? 'danger' : 'warn';
  }

  private fallar(e: { error?: { message?: string } }, fallback: string): void {
    this.guardando.set(false);
    this.error(e?.error?.message ?? fallback);
  }
  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
