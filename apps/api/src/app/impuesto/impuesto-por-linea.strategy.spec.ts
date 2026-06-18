import { ImpuestoPorLineaStrategy } from './impuesto-por-linea.strategy';

describe('ImpuestoPorLineaStrategy', () => {
  const estrategia = new ImpuestoPorLineaStrategy();

  it('tasa 0: impuesto 0 y total = subtotal', () => {
    const r = estrategia.calcular([
      { precioUnitario: 2, cantidad: 100, tasaImpuesto: 0 },
      { precioUnitario: 3, cantidad: 50, tasaImpuesto: 0 },
    ]);
    expect(r.subtotal).toBeCloseTo(350, 2); // 200 + 150
    expect(r.impuesto).toBeCloseTo(0, 2);
    expect(r.total).toBeCloseTo(350, 2);
  });

  it('impuesto por línea: solo grava la línea con tasa', () => {
    // 200 (sin ISV) + 100 con 15% = 15 -> impuesto 15, total 315
    const r = estrategia.calcular([
      { precioUnitario: 2, cantidad: 100, tasaImpuesto: 0 },
      { precioUnitario: 10, cantidad: 10, tasaImpuesto: 0.15 },
    ]);
    expect(r.subtotal).toBeCloseTo(300, 2);
    expect(r.impuesto).toBeCloseTo(15, 2);
    expect(r.total).toBeCloseTo(315, 2);
    expect(r.porLinea[1].impuesto).toBeCloseTo(15, 2);
  });
});
