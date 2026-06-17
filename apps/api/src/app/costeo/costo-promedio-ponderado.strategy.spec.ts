import { CostoPromedioPonderadoStrategy } from './costo-promedio-ponderado.strategy';

describe('CostoPromedioPonderadoStrategy', () => {
  const estrategia = new CostoPromedioPonderadoStrategy();

  it('primera entrada: el promedio = costo_total / cantidad', () => {
    const r = estrategia.aplicarEntrada(
      { cantidadBase: 0, costoPromedio: 0 },
      { cantidadBase: 1000, costoTotal: 2000 },
    );
    expect(r.cantidadBase).toBe(1000);
    expect(r.costoPromedio).toBeCloseTo(2, 6); // 2000 / 1000
  });

  it('segunda entrada: pondera por cantidad y valor', () => {
    // Saldo: 1000 u a costo 2 (valor 2000). Entra 1000 u por 4000 (costo 4).
    // Nuevo: 2000 u, valor 6000 -> promedio 3.
    const r = estrategia.aplicarEntrada(
      { cantidadBase: 1000, costoPromedio: 2 },
      { cantidadBase: 1000, costoTotal: 4000 },
    );
    expect(r.cantidadBase).toBe(2000);
    expect(r.costoPromedio).toBeCloseTo(3, 6);
  });

  it('cantidades distintas se ponderan correctamente', () => {
    // 90718.4 g (2 qq) por 6000 -> promedio 0.066138...
    const r = estrategia.aplicarEntrada(
      { cantidadBase: 0, costoPromedio: 0 },
      { cantidadBase: 90718.4, costoTotal: 6000 },
    );
    expect(r.costoPromedio).toBeCloseTo(6000 / 90718.4, 6);
  });
});
