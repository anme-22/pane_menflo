import type {
  Abono,
  Cliente,
  Factura,
  FacturaBitacora,
  FacturaDetalle,
  Usuario,
} from '@prisma/client';
import type {
  FacturaDetalleDto,
  FacturaDto,
  FacturaResumenDto,
} from '@pane/shared';
import { calcularPago } from './calculo-pago';

const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Factura con relaciones para el DTO completo. */
export type FacturaConRelaciones = Factura & {
  cliente?: Cliente | null;
  usuario?: Usuario | null;
  detalles?: FacturaDetalle[];
  abonos?: Abono[];
  bitacora?: (FacturaBitacora & { usuario?: Usuario | null })[];
};

/** Factura con lo mínimo para el resumen del listado. */
export type FacturaParaResumen = Factura & {
  cliente?: Cliente | null;
  abonos?: Pick<Abono, 'monto'>[];
};

function nombreCliente(cliente?: Cliente | null): string | null {
  return cliente ? `${cliente.nombre} ${cliente.apellido}`.trim() : null;
}

function toDetalleDto(d: FacturaDetalle): FacturaDetalleDto {
  const precio = Number(d.precioUnitario);
  const cantidad = Number(d.cantidad);
  const tasa = Number(d.tasaImpuesto);
  // Cortesía: conserva el snapshot de precio, pero NO cobra (subtotal/impuesto 0).
  const subtotal = d.esCortesia ? 0 : r2(precio * cantidad);
  const impuesto = d.esCortesia ? 0 : r2(subtotal * tasa);
  return {
    id: d.id,
    productoId: d.productoId,
    nombreProducto: d.nombreProducto,
    precioUnitario: d.precioUnitario.toString(),
    cantidad: d.cantidad.toString(),
    tasaImpuesto: d.tasaImpuesto.toString(),
    subtotalLinea: subtotal.toString(),
    impuestoLinea: impuesto.toString(),
    totalLinea: r2(subtotal + impuesto).toString(),
    esCortesia: d.esCortesia,
  };
}

/** Mapea una factura + relaciones al DTO completo (con cálculo de pago). */
export function toFacturaDto(f: FacturaConRelaciones): FacturaDto {
  const abonos = f.abonos ?? [];
  const pago = calcularPago(
    Number(f.total),
    f.tipoPago,
    f.estado,
    abonos.map((a) => Number(a.monto)),
  );
  // Valor regalado en cortesías (informativo): Σ precio×cantidad de esas líneas.
  const totalCortesia = (f.detalles ?? [])
    .filter((d) => d.esCortesia)
    .reduce((s, d) => s + Number(d.precioUnitario) * Number(d.cantidad), 0);
  return {
    id: f.id,
    numero: f.numero,
    clienteIdentidad: f.clienteIdentidad,
    clienteNombre: nombreCliente(f.cliente),
    usuarioId: f.usuarioId,
    usuarioNombre: f.usuario?.nombre ?? '',
    estado: f.estado,
    tipoPago: f.tipoPago,
    metodoPago: f.metodoPago,
    fecha: f.fecha.toISOString(),
    subtotal: f.subtotal.toString(),
    impuesto: f.impuesto.toString(),
    total: f.total.toString(),
    totalCortesia: r2(totalCortesia).toString(),
    motivoCortesia: f.motivoCortesia,
    cai: f.cai,
    caiRango: f.caiRango,
    caiFechaLimite: f.caiFechaLimite?.toISOString() ?? null,
    motivoAnulacion: f.motivoAnulacion,
    emitidaEn: f.emitidaEn?.toISOString() ?? null,
    detalles: (f.detalles ?? []).map(toDetalleDto),
    abonos: abonos.map((a) => ({
      id: a.id,
      monto: a.monto.toString(),
      fecha: a.fecha.toISOString(),
      metodo: a.metodo,
    })),
    bitacora: (f.bitacora ?? []).map((b) => ({
      id: b.id,
      usuarioId: b.usuarioId,
      usuarioNombre: b.usuario?.nombre ?? '',
      cuando: b.cuando.toISOString(),
      campo: b.campo,
      valorAnterior: b.valorAnterior,
      valorNuevo: b.valorNuevo,
      motivo: b.motivo,
    })),
    totalAbonado: pago.totalAbonado.toString(),
    saldoPendiente: pago.saldoPendiente.toString(),
    estadoPago: pago.estadoPago,
    creadoEn: f.creadoEn.toISOString(),
  };
}

/** Mapea una factura al resumen del listado (con saldo/estado de pago). */
export function toFacturaResumenDto(f: FacturaParaResumen): FacturaResumenDto {
  const pago = calcularPago(
    Number(f.total),
    f.tipoPago,
    f.estado,
    (f.abonos ?? []).map((a) => Number(a.monto)),
  );
  return {
    id: f.id,
    numero: f.numero,
    fecha: f.fecha.toISOString(),
    clienteNombre: nombreCliente(f.cliente),
    estado: f.estado,
    tipoPago: f.tipoPago,
    total: f.total.toString(),
    saldoPendiente: pago.saldoPendiente.toString(),
    estadoPago: pago.estadoPago,
  };
}
