import { ComprasService } from './compras.service';
import { InventarioService } from '../inventario/inventario.service';
import { CostoPromedioPonderadoStrategy } from '../costeo/costo-promedio-ponderado.strategy';

/**
 * Verifica el cálculo del costo por unidad base y que la compra delega la
 * entrada en InventarioService (existencia con promedio ponderado + movimiento
 * ENTRADA). La conversión se mockea (su lógica se prueba en ConversionService);
 * InventarioService es real para cubrir la integración.
 */
describe('ComprasService.crear', () => {
  it('convierte a base, calcula costo/u base y registra la entrada al stock', async () => {
    const insumo = { id: 1, nombre: 'Harina', tipo: 'peso', activo: true };

    const conversion = {
      obtenerUnidad: jest.fn().mockResolvedValue({ id: 4, tipo: 'peso' }),
      // 2 quintales -> 90718.4 g
      convertirABase: jest.fn().mockResolvedValue({ cantidadBase: 90718.4, tipo: 'peso' }),
    };
    const sucursales = { obtenerDefaultId: jest.fn().mockResolvedValue(1) };

    const tx = {
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
      existencia: {
        findUnique: jest.fn().mockResolvedValue(null), // primera compra
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      movimientoInventario: {
        create: jest.fn().mockImplementation((a) => Promise.resolve({ id: 99, ...a.data })),
      },
    };
    const prisma = {
      insumo: { findUnique: jest.fn().mockResolvedValue(insumo) },
      $transaction: (cb: (t: typeof tx) => unknown) => cb(tx),
    };

    const inventario = new InventarioService(new CostoPromedioPonderadoStrategy());
    const service = new ComprasService(
      prisma as never,
      conversion as never,
      sucursales as never,
      inventario,
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
    const upsertArgs = tx.existencia.upsert.mock.calls[0][0];
    expect(Number(upsertArgs.create.cantidadBase)).toBeCloseTo(90718.4, 4);
    expect(Number(upsertArgs.create.costoPromedio)).toBeCloseTo(6000 / 90718.4, 6);

    // se asienta un movimiento de ENTRADA con origen = la compra
    const movData = tx.movimientoInventario.create.mock.calls[0][0].data;
    expect(movData.tipo).toBe('ENTRADA');
    expect(movData.compraId).toBe(10);
    expect(Number(movData.cantidadBase)).toBeCloseTo(90718.4, 4);
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
      new InventarioService(new CostoPromedioPonderadoStrategy()),
    );

    await expect(
      service.crear({ insumoId: 1, unidadCompraId: 6, cantidad: 2, costo: 6000 } as never),
    ).rejects.toThrow();
  });
});
