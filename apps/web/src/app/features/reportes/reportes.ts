import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  TIPO_PAGO_LABEL,
  type ConsumoInsumosReporteDto,
  type CuentasPorCobrarReporteDto,
  type GananciaReporteDto,
  type TipoPago,
  type VentasDetalladasReporteDto,
  type VentasReporteDto,
} from '@pane/shared';
import { ReportesService } from './reportes.service';

const dinero = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' });
const cantidad = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 2 });
const fecha = new Intl.DateTimeFormat('es-HN', { dateStyle: 'medium' });
const hora = new Intl.DateTimeFormat('es-HN', { timeStyle: 'short' });

/** Fecha local en formato YYYY-MM-DD para los inputs de tipo date. */
function iso(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/**
 * Reportes (componente "smart", solo lectura). Un filtro de periodo común genera
 * ventas, ganancia por producto y consumo de insumos; las cuentas por cobrar son
 * el saldo vivo (sin periodo). Solo admin/super_admin (ruta y nav lo restringen).
 */
@Component({
  selector: 'app-reportes',
  imports: [FormsModule, TableModule, ButtonModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './reportes.html',
})
export class ReportesPage implements OnInit {
  private readonly service = inject(ReportesService);
  private readonly toast = inject(MessageService);

  protected desde = signal('');
  protected hasta = signal('');
  protected readonly generando = signal(false);

  protected readonly ventas = signal<VentasReporteDto | null>(null);
  protected readonly ventasDetalle = signal<VentasDetalladasReporteDto | null>(null);
  protected readonly ganancia = signal<GananciaReporteDto | null>(null);
  protected readonly consumo = signal<ConsumoInsumosReporteDto | null>(null);
  protected readonly cuentas = signal<CuentasPorCobrarReporteDto | null>(null);

  ngOnInit(): void {
    const hoy = new Date();
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.desde.set(iso(primero));
    this.hasta.set(iso(hoy));
    this.generar();
    this.cargarCuentas();
  }

  generar(): void {
    const d = this.desde();
    const h = this.hasta();
    if (!d || !h) {
      this.error('Indica el periodo (desde y hasta).');
      return;
    }
    this.generando.set(true);
    let pendientes = 4;
    const listo = () => {
      if (--pendientes === 0) {
        this.generando.set(false);
      }
    };
    this.service.ventas(d, h).subscribe({
      next: (r) => { this.ventas.set(r); listo(); },
      error: (e) => { this.fallar(e); listo(); },
    });
    this.service.ventasDetalle(d, h).subscribe({
      next: (r) => { this.ventasDetalle.set(r); listo(); },
      error: (e) => { this.fallar(e); listo(); },
    });
    this.service.gananciaPorProducto(d, h).subscribe({
      next: (r) => { this.ganancia.set(r); listo(); },
      error: (e) => { this.fallar(e); listo(); },
    });
    this.service.consumoInsumos(d, h).subscribe({
      next: (r) => { this.consumo.set(r); listo(); },
      error: (e) => { this.fallar(e); listo(); },
    });
  }

  private cargarCuentas(): void {
    this.service.cuentasPorCobrar().subscribe({
      next: (r) => this.cuentas.set(r),
      error: (e) => this.fallar(e),
    });
  }

  // ---- helpers de presentación ----

  dineroTexto(v: string | number): string {
    return dinero.format(Number(v));
  }
  cantidadTexto(v: string | number, abrev = ''): string {
    return `${cantidad.format(Number(v))}${abrev ? ' ' + abrev : ''}`;
  }
  fechaTexto(iso: string): string {
    return fecha.format(new Date(iso));
  }
  fechaDiaTexto(yyyymmdd: string): string {
    return fecha.format(new Date(`${yyyymmdd}T00:00:00`));
  }
  horaTexto(iso: string): string {
    return hora.format(new Date(iso));
  }
  tipoPagoTexto(t: TipoPago): string {
    return TIPO_PAGO_LABEL[t];
  }
  gananciaPositiva(v: string): boolean {
    return Number(v) >= 0;
  }

  private fallar(e: { error?: { message?: string } }): void {
    this.error(e?.error?.message ?? 'No se pudo generar el reporte.');
  }
  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
