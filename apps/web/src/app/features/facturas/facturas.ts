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
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  ESTADO_FACTURA_LABEL,
  ESTADO_PAGO_LABEL,
  METODOS_ABONO,
  TIPO_PAGO_LABEL,
  type ClienteDto,
  type ConfiguracionDto,
  type EstadoFactura,
  type EstadoPago,
  type FacturaDto,
  type FacturaResumenDto,
  type LineaFacturaInput,
  type ProductoDto,
} from '@pane/shared';
import { ProductosService } from '../productos/productos.service';
import { ClientesService } from '../clientes/clientes.service';
import { FacturasService } from './facturas.service';

const dinero = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' });
const fecha = new Intl.DateTimeFormat('es-HN', { dateStyle: 'medium' });

const SEV_ESTADO: Record<EstadoFactura, 'info' | 'success' | 'danger'> = {
  BORRADOR: 'info',
  EMITIDA: 'success',
  ANULADA: 'danger',
};
const SEV_PAGO: Record<EstadoPago, 'danger' | 'warn' | 'success'> = {
  PENDIENTE: 'danger',
  PARCIAL: 'warn',
  PAGADA: 'success',
};

/**
 * Facturación (componente "smart"). Lista, crea/edita borradores, emite, anula
 * con motivo, registra abonos e imprime. App ZONELESS: las filas del FormArray
 * se enlazan con [formGroup]="$any(grupo)" y los totales en vivo se apoyan en un
 * signal del form. Cualquier rol gestiona facturas (el vendedor incluido).
 */
@Component({
  selector: 'app-facturas',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './facturas.html',
})
export class FacturasPage implements OnInit {
  private readonly service = inject(FacturasService);
  private readonly productosService = inject(ProductosService);
  private readonly clientesService = inject(ClientesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly facturas = signal<FacturaResumenDto[]>([]);
  protected readonly productos = signal<ProductoDto[]>([]);
  protected readonly clientes = signal<ClienteDto[]>([]);
  protected readonly config = signal<ConfiguracionDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  protected readonly tiposPago = [
    { label: TIPO_PAGO_LABEL.CONTADO, value: 'CONTADO' },
    { label: TIPO_PAGO_LABEL.CREDITO, value: 'CREDITO' },
  ];
  protected readonly metodosAbono = METODOS_ABONO.map((m) => ({ label: m, value: m }));

  // --- editor borrador / editar ---
  protected readonly formVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly editandoEstado = signal<EstadoFactura | null>(null);
  protected readonly form = this.fb.group({
    clienteIdentidad: [null as string | null],
    tipoPago: ['CONTADO' as 'CONTADO' | 'CREDITO', [Validators.required]],
    motivo: [''],
    items: this.fb.array([this.grupoLinea()]),
  });
  private readonly formValor = toSignal(this.form.valueChanges);

  // --- detalle / imprimir ---
  protected readonly detalleVisible = signal(false);
  protected readonly detalle = signal<FacturaDto | null>(null);

  // --- anular ---
  protected readonly anularVisible = signal(false);
  protected readonly anularId = signal<number | null>(null);
  protected readonly formAnular = this.fb.group({
    motivo: ['', [Validators.required, Validators.minLength(3)]],
  });

  // --- abono ---
  protected readonly abonoVisible = signal(false);
  protected readonly abonoFactura = signal<FacturaDto | null>(null);
  protected readonly formAbono = this.fb.group({
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    metodo: ['Efectivo', [Validators.required]],
  });

  protected readonly productosActivos = computed(() =>
    this.productos().filter((p) => p.activo && p.precioVigente !== null),
  );
  protected readonly clientesOpciones = computed(() =>
    this.clientes()
      .filter((c) => c.activo)
      .map((c) => ({ label: `${c.nombre} ${c.apellido}`, value: c.identidad })),
  );

  /** Totales en vivo del editor (recalcula al cambiar el form). */
  protected readonly totales = computed(() => {
    this.formValor();
    const items = this.form.getRawValue().items;
    let subtotal = 0;
    let impuesto = 0;
    for (const it of items) {
      const precio = this.precioDe(it.productoId);
      if (!precio || !it.cantidad) {
        continue;
      }
      const base = precio * it.cantidad;
      subtotal += base;
      impuesto += base * (it.tasaImpuesto ?? 0);
    }
    return { subtotal, impuesto, total: subtotal + impuesto };
  });

  ngOnInit(): void {
    this.cargar();
    this.productosService.listar().subscribe({
      next: (p) => this.productos.set(p),
      error: () => this.error('No se pudieron cargar los productos.'),
    });
    this.clientesService.listar().subscribe({
      next: (c) => this.clientes.set(c),
      error: () => this.error('No se pudieron cargar los clientes.'),
    });
    this.service.configuracion().subscribe({
      next: (c) => this.config.set(c),
      error: () => undefined,
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: (data) => {
        this.facturas.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error('No se pudieron cargar las facturas.');
      },
    });
  }

  // ---- FormArray de líneas ----

  get items(): FormArray {
    return this.form.controls.items;
  }

  private grupoLinea() {
    const tasa = this.tasaDefault();
    return this.fb.group({
      productoId: [null as number | null, [Validators.required]],
      cantidad: [1 as number | null, [Validators.required, Validators.min(0.01)]],
      tasaImpuesto: [tasa as number | null],
    });
  }

  private tasaDefault(): number {
    const c = this.config();
    return c?.isvActivo ? Number(c.tasaIsv) : 0;
  }

  agregarLinea(): void {
    this.items.push(this.grupoLinea());
  }

  quitarLinea(i: number): void {
    this.items.removeAt(i);
  }

  precioDe(productoId: number | null): number {
    const p = this.productos().find((x) => x.id === productoId);
    return p?.precioVigente ? Number(p.precioVigente) : 0;
  }

  // ---- abrir editor ----

  abrirNueva(): void {
    this.editandoId.set(null);
    this.editandoEstado.set(null);
    this.items.clear();
    this.items.push(this.grupoLinea());
    this.form.reset({ clienteIdentidad: null, tipoPago: 'CONTADO', motivo: '' });
    this.formVisible.set(true);
  }

  abrirEdicion(r: FacturaResumenDto): void {
    this.service.obtener(r.id).subscribe({
      next: (f) => {
        if (f.estado === 'ANULADA') {
          this.error('Una factura anulada no se edita.');
          return;
        }
        this.editandoId.set(f.id);
        this.editandoEstado.set(f.estado);
        this.items.clear();
        for (const d of f.detalles) {
          const g = this.grupoLinea();
          g.setValue({
            productoId: d.productoId,
            cantidad: Number(d.cantidad),
            tasaImpuesto: Number(d.tasaImpuesto),
          });
          this.items.push(g);
        }
        this.form.reset({
          clienteIdentidad: f.clienteIdentidad,
          tipoPago: f.tipoPago,
          motivo: '',
        });
        this.formVisible.set(true);
      },
      error: () => this.error('No se pudo cargar la factura.'),
    });
  }

  /** En el editor, ¿la factura ya está emitida? (exige motivo). */
  protected readonly editandoEmitida = computed(() => this.editandoEstado() === 'EMITIDA');

  guardar(): void {
    if (this.form.invalid || this.items.length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const items: LineaFacturaInput[] = v.items.map((it) => ({
      productoId: it.productoId as number,
      cantidad: it.cantidad as number,
      tasaImpuesto: it.tasaImpuesto ?? 0,
    }));
    const id = this.editandoId();

    if (this.editandoEmitida() && !v.motivo.trim()) {
      this.error('Editar una factura emitida exige un motivo.');
      return;
    }

    this.guardando.set(true);
    if (id === null) {
      this.service
        .crear({ clienteIdentidad: v.clienteIdentidad, tipoPago: v.tipoPago, items })
        .subscribe({
          next: () => this.alGuardar('Borrador creado.'),
          error: (e) => this.alFallar(e),
        });
    } else {
      this.service
        .actualizar(id, {
          clienteIdentidad: v.clienteIdentidad,
          tipoPago: v.tipoPago,
          items,
          motivo: v.motivo.trim() || undefined,
        })
        .subscribe({
          next: () => this.alGuardar('Factura actualizada.'),
          error: (e) => this.alFallar(e),
        });
    }
  }

  // ---- emitir ----

  emitir(r: FacturaResumenDto): void {
    this.confirm.confirm({
      header: 'Emitir factura',
      message: 'Una vez emitida ya no se reescribe (se edita con motivo o se anula). ¿Emitir?',
      acceptLabel: 'Emitir',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.service.emitir(r.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Factura emitida', life: 2500 });
            this.cargar();
          },
          error: (e) => this.error(e?.error?.message ?? 'No se pudo emitir.'),
        });
      },
    });
  }

  // ---- anular ----

  abrirAnular(r: FacturaResumenDto): void {
    this.anularId.set(r.id);
    this.formAnular.reset({ motivo: '' });
    this.anularVisible.set(true);
  }

  guardarAnular(): void {
    const id = this.anularId();
    if (id === null || this.formAnular.invalid) {
      this.formAnular.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.service.anular(id, { motivo: this.formAnular.getRawValue().motivo }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.anularVisible.set(false);
        this.toast.add({ severity: 'success', summary: 'Factura anulada', life: 2500 });
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.error(e?.error?.message ?? 'No se pudo anular.');
      },
    });
  }

  // ---- abonos ----

  abrirAbono(r: FacturaResumenDto): void {
    this.service.obtener(r.id).subscribe({
      next: (f) => {
        this.abonoFactura.set(f);
        this.formAbono.reset({ monto: null, metodo: 'Efectivo' });
        this.abonoVisible.set(true);
      },
      error: () => this.error('No se pudo cargar la factura.'),
    });
  }

  guardarAbono(): void {
    const f = this.abonoFactura();
    if (!f || this.formAbono.invalid) {
      this.formAbono.markAllAsTouched();
      return;
    }
    const v = this.formAbono.getRawValue();
    this.guardando.set(true);
    this.service
      .registrarAbono(f.id, { monto: v.monto as number, metodo: v.metodo })
      .subscribe({
        next: (act) => {
          this.guardando.set(false);
          this.abonoFactura.set(act);
          this.formAbono.reset({ monto: null, metodo: 'Efectivo' });
          this.toast.add({ severity: 'success', summary: 'Abono registrado', life: 2500 });
          this.cargar();
        },
        error: (e) => {
          this.guardando.set(false);
          this.error(e?.error?.message ?? 'No se pudo registrar el abono.');
        },
      });
  }

  // ---- detalle / imprimir ----

  verDetalle(r: FacturaResumenDto): void {
    this.detalle.set(null);
    this.detalleVisible.set(true);
    this.service.obtener(r.id).subscribe({
      next: (f) => this.detalle.set(f),
      error: () => this.error('No se pudo cargar el detalle.'),
    });
  }

  imprimir(f: FacturaDto): void {
    const filas = f.detalles
      .map(
        (d) =>
          `<tr><td>${d.nombreProducto}</td><td style="text-align:right">${d.cantidad}</td>` +
          `<td style="text-align:right">${dinero.format(Number(d.precioUnitario))}</td>` +
          `<td style="text-align:right">${dinero.format(Number(d.totalLinea))}</td></tr>`,
      )
      .join('');
    const cliente = f.clienteNombre ?? 'Consumidor final';
    const numero = f.numero ?? String(f.id);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Factura ${numero}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#1f2937}
      h1{color:#ea580c;margin:0 0 4px} table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:14px}
      th{text-align:left;color:#6b7280} .tot{text-align:right;margin-top:12px;font-size:14px}
      .tot strong{font-size:16px}</style></head><body>
      <h1>🥖 Panadería</h1>
      <div>Factura <strong>${numero}</strong> · ${fecha.format(new Date(f.fecha))}</div>
      <div>Cliente: ${cliente}</div>
      <div>Tipo de pago: ${TIPO_PAGO_LABEL[f.tipoPago]} · Estado: ${ESTADO_FACTURA_LABEL[f.estado]}</div>
      <table><thead><tr><th>Producto</th><th style="text-align:right">Cant.</th>
      <th style="text-align:right">P. unit.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${filas}</tbody></table>
      <div class="tot">Subtotal: ${dinero.format(Number(f.subtotal))}</div>
      <div class="tot">Impuesto: ${dinero.format(Number(f.impuesto))}</div>
      <div class="tot"><strong>Total: ${dinero.format(Number(f.total))}</strong></div>
      <div class="tot">Saldo pendiente: ${dinero.format(Number(f.saldoPendiente))}</div>
      </body></html>`;
    const win = window.open('', '_blank', 'width=720,height=900');
    if (!win) {
      this.error('Habilita las ventanas emergentes para imprimir.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  // ---- helpers de presentación ----

  estadoLabel(e: EstadoFactura): string {
    return ESTADO_FACTURA_LABEL[e];
  }
  sevEstado(e: EstadoFactura) {
    return SEV_ESTADO[e];
  }
  pagoLabel(e: EstadoPago): string {
    return ESTADO_PAGO_LABEL[e];
  }
  sevPago(e: EstadoPago) {
    return SEV_PAGO[e];
  }
  tipoPagoLabel(t: 'CONTADO' | 'CREDITO'): string {
    return TIPO_PAGO_LABEL[t];
  }
  dineroTexto(valor: string | number): string {
    return dinero.format(Number(valor));
  }
  fechaTexto(iso: string): string {
    return fecha.format(new Date(iso));
  }
  nombreProducto(productoId: number | null): string {
    return this.productos().find((p) => p.id === productoId)?.nombre ?? '';
  }

  private alGuardar(mensaje: string): void {
    this.guardando.set(false);
    this.formVisible.set(false);
    this.toast.add({ severity: 'success', summary: mensaje, life: 2500 });
    this.cargar();
  }
  private alFallar(e: { error?: { message?: string } }): void {
    this.guardando.set(false);
    this.error(e?.error?.message ?? 'No se pudo guardar la factura.');
  }
  private error(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
