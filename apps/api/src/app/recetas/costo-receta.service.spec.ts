import { CostoRecetaService } from './costo-receta.service';

/**
 * Verifica el costeo de receta (insumos al costo del momento, promedio
 * ponderado) y el costo por bolsa = costo receta ÷ rendimiento.
 */
describe('CostoRecetaService.calcular', () => {
  // convertirABase: simulamos factores por unidad (qq=45359.2, L=1000).
  const cantidadBasePorUnidad: Record<number, number> = { 5: 45359.2, 7: 1000 };

  function crear(
    existencias: { insumoId: number; costoPromedio: number }[],
    indirectos: { monto: number; tipo: 'POR_QUINTAL' | 'POR_MES' }[] = [],
    quintalesPorMes = 100,
  ) {
    const conversion = {
      convertirABase: jest.fn((cantidad: number, unidadId: number) =>
        Promise.resolve({ cantidadBase: cantidad * cantidadBasePorUnidad[unidadId], tipo: 'peso' }),
      ),
    };
    const prisma = {
      existencia: { findMany: jest.fn().mockResolvedValue(existencias) },
      costoIndirecto: { findMany: jest.fn().mockResolvedValue(indirectos) },
    };
    const sucursales = { obtenerDefaultId: jest.fn().mockResolvedValue(1) };
    const configuracion = { obtener: jest.fn().mockResolvedValue({ quintalesPorMes }) };
    return new CostoRecetaService(
      prisma as never,
      conversion as never,
      sucursales as never,
      configuracion as never,
    );
  }

  it('suma el costo de los ingredientes y divide por el rendimiento', async () => {
    // Harina (insumo 10): 1 qq = 45359.2 g a 0.07 -> 3175.144
    // Agua (insumo 11): 2 L = 2000 ml a 0.001 -> 2
    const service = crear([
      { insumoId: 10, costoPromedio: 0.07 },
      { insumoId: 11, costoPromedio: 0.001 },
    ]);
    const receta = {
      rendimiento: 223,
      ingredientes: [
        { id: 1, insumoId: 10, cantidad: 1, unidadId: 5 },
        { id: 2, insumoId: 11, cantidad: 2, unidadId: 7 },
      ],
    };

    const r = await service.calcular(receta);

    expect(r.costoReceta).toBeCloseTo(3175.144 + 2, 4);
    expect(r.costoPorBolsa).toBeCloseTo((3175.144 + 2) / 223, 6);
    expect(r.porIngrediente.get(1)?.costo).toBeCloseTo(3175.144, 4);
    expect(r.porIngrediente.get(1)?.cantidadBase).toBeCloseTo(45359.2, 4);
  });

  it('un insumo sin existencia aporta costo 0 (no rompe)', async () => {
    const service = crear([]); // ninguna existencia
    const receta = {
      rendimiento: 100,
      ingredientes: [{ id: 1, insumoId: 99, cantidad: 1, unidadId: 5 }],
    };

    const r = await service.calcular(receta);

    expect(r.costoReceta).toBe(0);
    expect(r.costoPorBolsa).toBe(0);
    expect(r.porIngrediente.get(1)?.costoUnitario).toBe(0);
  });

  it('suma los costos indirectos por lote (POR_QUINTAL + POR_MES/quintalesPorMes)', async () => {
    // Materiales: 1 qq (45359.2 g) a 0.02 = 907.184
    // Indirecto/lote: 350 (POR_QUINTAL) + 22000/100 (POR_MES) = 570
    const service = crear(
      [{ insumoId: 10, costoPromedio: 0.02 }],
      [
        { monto: 350, tipo: 'POR_QUINTAL' },
        { monto: 22000, tipo: 'POR_MES' },
      ],
      100,
    );
    const receta = {
      rendimiento: 350,
      ingredientes: [{ id: 1, insumoId: 10, cantidad: 1, unidadId: 5 }],
    };

    const r = await service.calcular(receta);
    expect(r.costoMateriales).toBeCloseTo(907.184, 3);
    expect(r.costoIndirecto).toBeCloseTo(570, 6);
    expect(r.costoReceta).toBeCloseTo(907.184 + 570, 3);
    expect(r.costoPorBolsa).toBeCloseTo((907.184 + 570) / 350, 6);
  });
});
