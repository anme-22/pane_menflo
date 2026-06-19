import { ProduccionService } from './produccion.service';

/**
 * Pruebas de la lógica de órdenes que no toca la BD: el congelado de
 * `bolsasEsperadas` al crear y la IDEMPOTENCIA de confirmar. El descuento real
 * del inventario se prueba e2e contra la BD.
 */
describe('ProduccionService', () => {
  it('crear congela bolsasEsperadas = round(sacos × rendimiento)', async () => {
    const ordenCreada = {
      id: 1,
      fecha: new Date('2026-06-18T00:00:00.000Z'),
      productoId: 3,
      recetaId: 5,
      sacos: { toString: () => '2.5' },
      bolsasEsperadas: 500,
      bolsasReales: null,
      costoDelMomento: { toString: () => '0' },
      estado: 'BORRADOR',
      motivoAnulacion: null,
      confirmadaEn: null,
      producto: { nombre: 'Pan' },
      receta: { unidadLote: 'quintal', rendimiento: 200 },
      movimientos: [],
    };
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const prisma = {
      receta: { findUnique: jest.fn().mockResolvedValue({ id: 5, rendimiento: 200 }) },
      ordenProduccion: {
        create,
        findUnique: jest.fn().mockResolvedValue(ordenCreada),
      },
    };
    const sucursales = { obtenerDefaultId: jest.fn().mockResolvedValue(1) };
    const service = new ProduccionService(
      prisma as never,
      {} as never,
      sucursales as never,
      {} as never,
    );

    const dto = await service.crear({ productoId: 3, sacos: 2.5 } as never);

    // 2.5 × 200 = 500
    expect(create.mock.calls[0][0].data.bolsasEsperadas).toBe(500);
    expect(dto.bolsasEsperadas).toBe(500);
  });

  it('crear rechaza un producto sin receta', async () => {
    const prisma = { receta: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new ProduccionService(
      prisma as never,
      {} as never,
      { obtenerDefaultId: jest.fn() } as never,
      {} as never,
    );
    await expect(
      service.crear({ productoId: 9, sacos: 1 } as never),
    ).rejects.toThrow(/receta/i);
  });

  it('confirmar es idempotente: una orden CONFIRMADA no vuelve a descontar', async () => {
    const orden = {
      id: 1,
      estado: 'CONFIRMADA',
      sacos: { toString: () => '1' },
      sucursalId: 1,
      bolsasEsperadas: 200,
      bolsasReales: null,
      fecha: new Date('2026-06-18T00:00:00.000Z'),
      productoId: 3,
      recetaId: 5,
      costoDelMomento: { toString: () => '1000' },
      motivoAnulacion: null,
      confirmadaEn: new Date('2026-06-18T01:00:00.000Z'),
      producto: { nombre: 'Pan' },
      receta: { unidadLote: 'quintal', rendimiento: 200, ingredientes: [] },
      movimientos: [],
    };
    const inventario = { registrarSalida: jest.fn() };
    const prisma = {
      ordenProduccion: { findUnique: jest.fn().mockResolvedValue(orden) },
      $transaction: jest.fn(),
    };
    const service = new ProduccionService(
      prisma as never,
      {} as never,
      {} as never,
      inventario as never,
    );

    const dto = await service.confirmar(1);

    expect(dto.estado).toBe('CONFIRMADA');
    expect(inventario.registrarSalida).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('anular una orden CONFIRMADA devuelve el inventario consumido', async () => {
    const ordenAnulada = {
      id: 7,
      fecha: new Date('2026-06-19T00:00:00.000Z'),
      productoId: 3,
      recetaId: 5,
      sacos: { toString: () => '1' },
      bolsasEsperadas: 200,
      bolsasReales: null,
      costoDelMomento: { toString: () => '3000' },
      estado: 'ANULADA',
      motivoAnulacion: 'error de receta',
      confirmadaEn: new Date('2026-06-19T01:00:00.000Z'),
      producto: { nombre: 'Pan' },
      receta: { unidadLote: 'quintal', rendimiento: 200 },
      movimientos: [],
    };
    // Una salida asentada al confirmar, que debe revertirse.
    const salidas = [
      { insumoId: 10, sucursalId: 1, cantidadBase: 90718.4, costoUnitario: 0.066 },
    ];
    const txUpdate = jest.fn().mockResolvedValue({});
    const revertirSalida = jest.fn().mockResolvedValue(99);
    const inventario = { revertirSalida, registrarSalida: jest.fn() };
    const prisma = {
      ordenProduccion: {
        findUnique: jest
          .fn()
          // asegurarExiste → estado actual CONFIRMADA
          .mockResolvedValueOnce({ id: 7, estado: 'CONFIRMADA' })
          // obtener() final → orden ya anulada
          .mockResolvedValueOnce(ordenAnulada),
        update: jest.fn(),
      },
      movimientoInventario: { findMany: jest.fn().mockResolvedValue(salidas) },
      $transaction: jest.fn(async (cb) => cb({ ordenProduccion: { update: txUpdate } })),
    };
    const service = new ProduccionService(
      prisma as never,
      {} as never,
      {} as never,
      inventario as never,
    );

    const dto = await service.anular(7, { motivo: 'error de receta' });

    // Una reversión por cada salida, con los mismos datos a los que salió.
    expect(revertirSalida).toHaveBeenCalledTimes(1);
    expect(revertirSalida.mock.calls[0][1]).toMatchObject({
      insumoId: 10,
      cantidadBase: 90718.4,
      costoUnitario: 0.066,
      ordenProduccionId: 7,
    });
    // El cambio de estado va DENTRO de la transacción (atómico con la reversión).
    expect(txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'ANULADA',
          motivoAnulacion: 'error de receta',
        }),
      }),
    );
    expect(dto.estado).toBe('ANULADA');
  });
});
