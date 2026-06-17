import { ConversionService } from './conversion.service';

/**
 * Verifica la conversión basada en la tabla `unidad_medida`:
 *   cantidad * factor_origen / factor_destino, y solo entre el mismo tipo.
 */
describe('ConversionService', () => {
  const unidades: Record<number, { id: number; tipo: string; factorABase: number }> = {
    1: { id: 1, tipo: 'peso', factorABase: 1 }, // gramo (base)
    2: { id: 2, tipo: 'peso', factorABase: 28.3495 }, // onza
    3: { id: 3, tipo: 'peso', factorABase: 453.592 }, // libra
    4: { id: 4, tipo: 'peso', factorABase: 45359.2 }, // quintal
    6: { id: 6, tipo: 'volumen', factorABase: 1 }, // ml (base)
  };

  function crear() {
    const prisma = {
      unidadMedida: {
        findUnique: jest.fn(({ where: { id } }) =>
          Promise.resolve(unidades[id] ?? null),
        ),
        findFirst: jest.fn(({ where: { tipo } }) =>
          Promise.resolve(
            Object.values(unidades).find(
              (u) => u.tipo === tipo && u.factorABase === 1,
            ) ?? null,
          ),
        ),
      },
    };
    return new ConversionService(prisma as never);
  }

  it('convierte onza → gramo (1 oz = 28.3495 g)', async () => {
    expect(await crear().convertir(1, 2, 1)).toBeCloseTo(28.3495, 4);
  });

  it('convierte libra → onza (1 lb = 16 oz)', async () => {
    expect(await crear().convertir(1, 3, 2)).toBeCloseTo(16, 3);
  });

  it('convertirABase: 2 quintales → gramos (90718.4 g)', async () => {
    const r = await crear().convertirABase(2, 4);
    expect(r.cantidadBase).toBeCloseTo(90718.4, 4);
    expect(r.tipo).toBe('peso');
  });

  it('rechaza convertir entre tipos distintos (peso ↔ volumen)', async () => {
    await expect(crear().convertir(1, 1, 6)).rejects.toThrow();
  });
});
