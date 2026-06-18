import { calcularPago } from './calculo-pago';

describe('calcularPago', () => {
  it('contado emitida: pagada y saldo 0 (sin abonos)', () => {
    const r = calcularPago(350, 'CONTADO', 'EMITIDA', []);
    expect(r.estadoPago).toBe('PAGADA');
    expect(r.saldoPendiente).toBe(0);
    expect(r.totalAbonado).toBe(350);
  });

  it('crédito sin abonos: pendiente, saldo = total', () => {
    const r = calcularPago(1000, 'CREDITO', 'EMITIDA', []);
    expect(r.estadoPago).toBe('PENDIENTE');
    expect(r.saldoPendiente).toBe(1000);
  });

  it('crédito con abono parcial: parcial y saldo restante', () => {
    const r = calcularPago(1000, 'CREDITO', 'EMITIDA', [300, 200]);
    expect(r.estadoPago).toBe('PARCIAL');
    expect(r.totalAbonado).toBe(500);
    expect(r.saldoPendiente).toBe(500);
  });

  it('crédito saldado: pagada y saldo 0', () => {
    const r = calcularPago(1000, 'CREDITO', 'EMITIDA', [600, 400]);
    expect(r.estadoPago).toBe('PAGADA');
    expect(r.saldoPendiente).toBe(0);
  });
});
