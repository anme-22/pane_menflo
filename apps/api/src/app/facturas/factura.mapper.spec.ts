import { toFacturaDto } from './factura.mapper';

/** El mapeo de cortesía: la línea no cobra y se reporta el valor regalado. */
describe('factura.mapper — cortesía', () => {
  const d = new Date('2026-06-25T12:00:00.000Z');
  const factura = {
    id: 1,
    numero: null,
    clienteIdentidad: null,
    usuarioId: 1,
    estado: 'EMITIDA',
    tipoPago: 'CONTADO',
    metodoPago: 'Efectivo',
    fecha: d,
    subtotal: 15,
    impuesto: 0,
    total: 15,
    motivoCortesia: 'el cliente tuvo un problema',
    cai: null,
    caiRango: null,
    caiFechaLimite: null,
    motivoAnulacion: null,
    emitidaEn: d,
    creadoEn: d,
    usuario: { nombre: 'Vendedor' },
    cliente: null,
    abonos: [],
    bitacora: [],
    detalles: [
      { id: 1, productoId: 1, nombreProducto: 'Pan', precioUnitario: 7.5, cantidad: 2, tasaImpuesto: 0, esCortesia: false },
      { id: 2, productoId: 1, nombreProducto: 'Pan', precioUnitario: 7.5, cantidad: 1, tasaImpuesto: 0, esCortesia: true },
    ],
  };

  it('la línea de cortesía no cobra (totalLinea 0) y conserva el snapshot', () => {
    const dto = toFacturaDto(factura as never);
    const cortesia = dto.detalles.find((l) => l.esCortesia)!;
    expect(cortesia.precioUnitario).toBe('7.5'); // snapshot conservado
    expect(cortesia.subtotalLinea).toBe('0');
    expect(cortesia.totalLinea).toBe('0');
  });

  it('totalCortesia = valor regalado (7.5) y expone el motivo', () => {
    const dto = toFacturaDto(factura as never);
    expect(dto.totalCortesia).toBe('7.5');
    expect(dto.motivoCortesia).toBe('el cliente tuvo un problema');
    // El total de la factura solo cuenta la línea cobrable (15).
    expect(dto.total).toBe('15');
  });
});
