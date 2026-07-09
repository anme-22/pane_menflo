import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import {
  FormArray,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  ESTADO_FACTURA_LABEL,
  ESTADO_PAGO_LABEL,
  METODOS_ABONO,
  METODOS_PAGO,
  PAGE_SIZE_DEFAULT,
  TIPO_PAGO_LABEL,
  type ClienteDto,
  type ConfiguracionDto,
  type EstadoFactura,
  type EstadoPago,
  type FacturaDto,
  type FacturaResumenDto,
  type LineaFacturaInput,
  type NegocioDto,
  type ProductoDto,
  type TipoPago,
} from '@pane/shared';
import { ProductosService } from '../productos/productos.service';
import { ClientesService } from '../clientes/clientes.service';
import { FacturasService } from './facturas.service';

const dinero = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' });
const fecha = new Intl.DateTimeFormat('es-HN', { dateStyle: 'medium' });
const fechaHora = new Intl.DateTimeFormat('es-HN', { dateStyle: 'short', timeStyle: 'short' });

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
    FormsModule,
    TableModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
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

  /** Expuesto para la plantilla (comparar importes string > 0). */
  protected readonly Number = Number;

  protected readonly facturas = signal<FacturaResumenDto[]>([]);
  protected readonly productos = signal<ProductoDto[]>([]);
  protected readonly clientes = signal<ClienteDto[]>([]);
  protected readonly config = signal<ConfiguracionDto | null>(null);
  protected readonly negocio = signal<NegocioDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  protected readonly tiposPago = [
    { label: TIPO_PAGO_LABEL.CONTADO, value: 'CONTADO' },
    { label: TIPO_PAGO_LABEL.CREDITO, value: 'CREDITO' },
  ];
  protected readonly metodosAbono = METODOS_ABONO.map((m) => ({ label: m, value: m }));
  protected readonly metodosPago = METODOS_PAGO.map((m) => ({ label: m, value: m }));

  // --- paginación + filtros (servidor) ---
  protected readonly total = signal(0);
  protected readonly first = signal(0);
  protected readonly rows = signal(PAGE_SIZE_DEFAULT);
  protected readonly buscar = signal('');
  protected readonly filtroEstado = signal<EstadoFactura | null>(null);
  protected readonly filtroTipoPago = signal<TipoPago | null>(null);
  protected readonly filtroDesde = signal('');
  protected readonly filtroHasta = signal('');
  protected readonly opcionesEstadoFiltro = [
    { label: 'Todos los estados', value: null },
    { label: ESTADO_FACTURA_LABEL.BORRADOR, value: 'BORRADOR' },
    { label: ESTADO_FACTURA_LABEL.EMITIDA, value: 'EMITIDA' },
    { label: ESTADO_FACTURA_LABEL.ANULADA, value: 'ANULADA' },
  ];
  protected readonly opcionesPagoFiltro = [
    { label: 'Contado y crédito', value: null },
    { label: TIPO_PAGO_LABEL.CONTADO, value: 'CONTADO' },
    { label: TIPO_PAGO_LABEL.CREDITO, value: 'CREDITO' },
  ];
  private readonly buscarInput = new Subject<string>();

  // --- editor borrador / editar ---
  protected readonly formVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly editandoEstado = signal<EstadoFactura | null>(null);
  protected readonly form = this.fb.group({
    clienteIdentidad: [null as string | null],
    tipoPago: ['CONTADO' as 'CONTADO' | 'CREDITO', [Validators.required]],
    metodoPago: ['Efectivo' as string],
    motivoCortesia: [''],
    motivo: [''],
    items: this.fb.array([this.grupoLinea()]),
  });
  private readonly formValor = toSignal(this.form.valueChanges);

  /** En el editor, ¿la venta es de contado? (muestra el método de pago). */
  protected readonly esContado = computed(() => {
    this.formValor();
    return this.form.controls.tipoPago.value === 'CONTADO';
  });

  /** ¿Hay alguna línea marcada como cortesía? (exige motivo). */
  protected readonly hayCortesia = computed(() => {
    this.formValor();
    return this.form.getRawValue().items.some((it) => it.esCortesia);
  });

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

  /** Totales en vivo del editor (recalcula al cambiar el form). Las líneas de
   * cortesía no cobran: no suman al total, pero su valor se reporta aparte. */
  protected readonly totales = computed(() => {
    this.formValor();
    const items = this.form.getRawValue().items;
    let subtotal = 0;
    let impuesto = 0;
    let cortesia = 0;
    for (const it of items) {
      const precio = this.precioDe(it.productoId);
      if (!precio || !it.cantidad) {
        continue;
      }
      const base = precio * it.cantidad;
      if (it.esCortesia) {
        cortesia += base;
        continue;
      }
      subtotal += base;
      impuesto += base * (it.tasaImpuesto ?? 0);
    }
    return { subtotal, impuesto, total: subtotal + impuesto, cortesia };
  });

  constructor() {
    // Búsqueda con debounce: al teclear, recarga desde la primera página.
    this.buscarInput
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.aplicarFiltros());
  }

  ngOnInit(): void {
    // El listado lo dispara la tabla (lazy) al iniciar; aquí solo las opciones.
    this.productosService.listar().subscribe({
      next: (p) => this.productos.set(p),
      error: () => this.error('No se pudieron cargar los productos.'),
    });
    // Clientes para el desplegable del editor: activos (hasta 100; el bakery
    // tiene pocos clientes registrados —el resto son consumidor final—).
    this.clientesService.listar({ pageSize: 100, activo: true }).subscribe({
      next: (res) => this.clientes.set(res.items),
      error: () => this.error('No se pudieron cargar los clientes.'),
    });
    this.service.configuracion().subscribe({
      next: (c) => this.config.set(c),
      error: () => undefined,
    });
    this.service.negocio().subscribe({
      next: (n) => this.negocio.set(n),
      error: () => undefined,
    });
  }

  /** Recarga la página actual desde el servidor con los filtros vigentes. */
  cargar(): void {
    this.cargando.set(true);
    this.service
      .listar({
        page: Math.floor(this.first() / this.rows()) + 1,
        pageSize: this.rows(),
        estado: this.filtroEstado() ?? undefined,
        tipoPago: this.filtroTipoPago() ?? undefined,
        desde: this.filtroDesde() || undefined,
        hasta: this.filtroHasta() || undefined,
        buscar: this.buscar().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.facturas.set(res.items);
          this.total.set(res.total);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.error('No se pudieron cargar las facturas.');
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

  onBuscar(valor: string): void {
    this.buscar.set(valor);
    this.buscarInput.next(valor);
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
      esCortesia: [false],
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
    // Resetear los escalares ANTES de tocar el FormArray (form.reset también
    // resetea `items`); las líneas se (re)construyen al final.
    this.form.reset({
      clienteIdentidad: null,
      tipoPago: 'CONTADO',
      metodoPago: 'Efectivo',
      motivoCortesia: '',
      motivo: '',
    });
    this.items.clear();
    this.items.push(this.grupoLinea());
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
        // Primero los escalares (form.reset también limpia el FormArray)...
        this.form.reset({
          clienteIdentidad: f.clienteIdentidad,
          tipoPago: f.tipoPago,
          metodoPago: f.metodoPago ?? 'Efectivo',
          motivoCortesia: f.motivoCortesia ?? '',
          motivo: '',
        });
        // ...y DESPUÉS se reconstruyen las líneas con sus valores.
        this.items.clear();
        for (const d of f.detalles) {
          const g = this.grupoLinea();
          g.setValue({
            productoId: d.productoId,
            cantidad: Number(d.cantidad),
            tasaImpuesto: Number(d.tasaImpuesto),
            esCortesia: d.esCortesia,
          });
          this.items.push(g);
        }
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
      esCortesia: it.esCortesia,
    }));
    const id = this.editandoId();

    if (this.editandoEmitida() && !v.motivo.trim()) {
      this.error('Editar una factura emitida exige un motivo.');
      return;
    }

    // El método de pago solo aplica a contado (el crédito lo lleva por abono).
    const metodoPago = v.tipoPago === 'CONTADO' ? v.metodoPago : undefined;

    // Si hay cortesías, el motivo es obligatorio.
    const hayCortesia = items.some((it) => it.esCortesia);
    const motivoCortesia = v.motivoCortesia.trim();
    if (hayCortesia && !motivoCortesia) {
      this.error('Una cortesía requiere indicar el motivo.');
      return;
    }

    this.guardando.set(true);
    if (id === null) {
      this.service
        .crear({
          clienteIdentidad: v.clienteIdentidad,
          tipoPago: v.tipoPago,
          metodoPago,
          motivoCortesia: hayCortesia ? motivoCortesia : undefined,
          items,
        })
        .subscribe({
          next: () => this.alGuardar('Borrador creado.'),
          error: (e) => this.alFallar(e),
        });
    } else {
      this.service
        .actualizar(id, {
          clienteIdentidad: v.clienteIdentidad,
          tipoPago: v.tipoPago,
          metodoPago,
          motivoCortesia: hayCortesia ? motivoCortesia : undefined,
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

  /**
   * Imprime la factura como TICKET de 80mm (impresora térmica instalada como
   * impresora de Windows). Usa `window.open` + CSS de 80mm (@page 80mm auto,
   * monoespaciada, sin bordes) y dispara el diálogo de impresión del navegador.
   * Los datos del negocio salen de /configuracion/negocio (variables de entorno).
   */
  imprimir(f: FacturaDto): void {
    const n = this.negocio();
    const esc = (s: string): string =>
      s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
    const money = (v: string | number): string => dinero.format(Number(v));
    const row = (izq: string, der: string, clase = ''): string =>
      `<div class="row ${clase}"><span>${izq}</span><span>${der}</span></div>`;

    // Encabezado del negocio (nombre + datos opcionales).
    const nombre = n?.nombre ?? 'Panadería';
    const cab = [
      `<div class="center bold big">${esc(nombre)}</div>`,
      n?.direccion ? `<div class="center">${esc(n.direccion)}</div>` : '',
      n?.telefono ? `<div class="center">Tel: ${esc(n.telefono)}</div>` : '',
      n?.rtn ? `<div class="center">RTN: ${esc(n.rtn)}</div>` : '',
    ].join('');

    // Datos de la factura: número, fecha/hora, vendedor, cliente, estado.
    const numero = f.numero ?? String(f.id);
    const cliente = f.clienteNombre ?? 'Consumidor final';
    const meta = [
      `<div>Factura: <b>${esc(numero)}</b></div>`,
      `<div>Fecha: ${fechaHora.format(new Date(f.fecha))}</div>`,
      `<div>Vendedor: ${esc(f.usuarioNombre)}</div>`,
      `<div>Cliente: ${esc(cliente)}</div>`,
      f.estado !== 'EMITIDA'
        ? `<div class="bold">** ${esc(ESTADO_FACTURA_LABEL[f.estado].toUpperCase())} **</div>`
        : '',
    ].join('');

    // Líneas de producto: nombre y, debajo, "cant x precio ....... total".
    const filas = f.detalles
      .map((d) => {
        const titulo = `${esc(d.nombreProducto)}${d.esCortesia ? ' (cortesía)' : ''}`;
        const izq = `${d.cantidad} x ${money(d.precioUnitario)}`;
        const der = d.esCortesia ? 'GRATIS' : money(d.totalLinea);
        return `<div class="bold">${titulo}</div>${row(izq, der)}`;
      })
      .join('');

    // Totales (impuesto y cortesía solo si aplican).
    const totales = [
      row('Subtotal', money(f.subtotal)),
      Number(f.impuesto) > 0 ? row('Impuesto', money(f.impuesto)) : '',
      Number(f.totalCortesia) > 0 ? row('Cortesía (valor)', `-${money(f.totalCortesia)}`) : '',
      row('TOTAL', money(f.total), 'bold big'),
    ].join('');
    const cortesiaMotivo =
      Number(f.totalCortesia) > 0 && f.motivoCortesia
        ? `<div>Cortesía: ${esc(f.motivoCortesia)}</div>`
        : '';

    // Desglose de pago / saldo.
    const pago =
      f.tipoPago === 'CONTADO'
        ? `<div>Pago: ${TIPO_PAGO_LABEL.CONTADO}${f.metodoPago ? ` · ${esc(f.metodoPago)}` : ''}</div>`
        : [
            `<div>Pago: ${TIPO_PAGO_LABEL.CREDITO} (${ESTADO_PAGO_LABEL[f.estadoPago]})</div>`,
            row('Abonado', money(f.totalAbonado)),
            row('Saldo pendiente', money(f.saldoPendiente), 'bold'),
          ].join('');

    const pie = n?.mensajePie
      ? `<div class="sep"></div><div class="center">${esc(n.mensajePie)}</div>`
      : '';

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Factura ${esc(numero)}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { width: 80mm; background: #fff; }
        .tk { width: 72mm; margin: 0 auto; padding: 3mm 0 6mm;
              font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.35; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: 700; }
        .big { font-size: 14px; }
        .sep { border-top: 1px dashed #000; margin: 5px 0; }
        .row { display: flex; justify-content: space-between; gap: 8px; }
        .row span:last-child { text-align: right; white-space: nowrap; }
      </style></head><body>
      <div class="tk">
        ${cab}
        <div class="sep"></div>
        ${meta}
        <div class="sep"></div>
        ${filas}
        <div class="sep"></div>
        ${totales}
        ${cortesiaMotivo}
        <div class="sep"></div>
        ${pago}
        ${pie}
      </div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=380,height=640');
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
