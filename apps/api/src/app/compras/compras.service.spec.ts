import { ComprasService } from './compras.service';
import { CostoPromedioPonderadoStrategy } from '../costeo/costo-promedio-ponderado.strategy';

/**
 * Verifica el cálculo del costo por unidad base y la actualización de la
 * existencia (promedio ponderado) al registrar una compra. La conversión se
 * mockea (su lógica se prueba en ConversionService).
 */
describe('ComprasService.crear', () => {
  it('convierte a base, calcula costo/unidad base y actualiza la existencia', async () => {
    const insumo = { id: 1, nombre: 'Harina', tipo: 'peso', activo: true };

    const conversion = {
      obtenerUnidad: jest.fn().mockResolvedValue({ id: 4, tipo: 'peso' }),
      // 2 quintales -> 90718.4 g
      convertirABase: jest.fn().mockResolvedValue({ cantidadBase: 90718.4, tipo: 'peso' }),
    };
    const sucursales = { obtenerDefaultId: jest.fn().mockResolvedValue(1) };

    let upsertArgs: { create: { cantidadBase: number; costoPromedio: number } };
    const tx = {
      existencia: {
        findUnique: jest.fn().mockResolvedValue(null), // primera compra
        upsert: jest.fn().mockImplementation((a) => {
          upsertArgs = a;
          return Promise.resolve();
        }),
      },
      compra: {
        create: jest.fn().mockImplementation((a) =>
          Promise.resolve({
            id: 10,
            insumoId: a.data.insumoId,
            unidadCompraId: a.data.unidadCompraId,
            fecha: new Date('2026-06-17T00:00:00.000Z'),
            insumo,
            unidadCompra: { abreviatura: 'qq' },
            cantidadCompra: { toString: () => String(a.data.cantidadCompra) },
            costo: { toString: () => String(a.data.costo) },
            cantidadBase: { toString: () => String(a.data.cantidadBase) },
            costoPorUnidadBase: { toString: () => String(a.data.costoPorUnidadBase) },
          }),
        ),
      },
    };
    const prisma = {
      insumo: { findUnique: jest.fn().mockResolvedValue(insumo) },
      $transaction: (cb: (t: typeof tx) => unknown) => cb(tx),
    };

    const service = new ComprasService(
      prisma as never,
      conversion as never,
      sucursales as never,
      new CostoPromedioPonderadoStrategy(),
    );

    const res = await service.crear({
      insumoId: 1,
      unidadCompraId: 4,
      cantidad: 2,
      costo: 6000,
    } as never);

    // costo por unidad base = 6000 / 90718.4
    expect(Number(res.cantidadBase)).toBeCloseTo(90718.4, 4);
    expect(Number(res.costoPorUnidadBase)).toBeCloseTo(6000 / 90718.4, 6);

    // existencia: primera compra -> cantidad y promedio del lote
    expect(Number(upsertArgs.create.cantidadBase)).toBeCloseTo(90718.4, 4);
    expect(Number(upsertArgs.create.costoPromedio)).toBeCloseTo(6000 / 90718.4, 6);
  });

  it('rechaza si la unidad de compra no es del tipo del insumo', async () => {
    const insumo = { id: 1, nombre: 'Harina', tipo: 'peso', activo: true };
    const conversion = {
      obtenerUnidad: jest.fn().mockResolvedValue({ id: 6, tipo: 'volumen' }),
      convertirABase: jest.fn(),
    };
    const prisma = { insumo: { findUnique: jest.fn().mockResolvedValue(insumo) } };
    const service = new ComprasService(
      prisma as never,
      conversion as never,
      { obtenerDefaultId: jest.fn() } as never,
      new CostoPromedioPonderadoStrategy(),
    );

    await expect(
      service.crear({ insumoId: 1, unidadCompraId: 6, cantidad: 2, costo: 6000 } as never),
    ).rejects.toThrow();
  });
});
