import { InventarioService } from './inventario.service';
import { CostoPromedioPonderadoStrategy } from '../costeo/costo-promedio-ponderado.strategy';

/**
 * Verifica la SALIDA de inventario: descuenta el stock, valora al costo
 * promedio vigente y asienta el movimiento. La estrategia de costeo es real
 * (su matemática se prueba aparte); el `tx` se simula.
 */
describe('InventarioService.registrarSalida', () => {
  function crearTx(existencia: { cantidadBase: number; costoPromedio: number } | null) {
    return {
      capturado: {} as { updateData?: { cantidadBase: number; costoPromedio: number }; movData?: Record<string, unknown> },
      existencia: {
        findUnique: jest.fn().mockResolvedValue(existencia),
        update: jest.fn().mockImplementation((a: { data: { cantidadBase: number; costoPromedio: number } }) => {
          // se captura abajo
          return Promise.resolve(a);
        }),
      },
      movimientoInventario: {
        create: jest.fn().mockImplementation((a: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 99, ...a.data }),
        ),
      },
    };
  }

  it('descuenta el stock, valora al promedio vigente y crea el movimiento SALIDA', async () => {
    const tx = crearTx({ cantidadBase: 90718.4, costoPromedio: 0.066138 });
    const service = new InventarioService(new CostoPromedioPonderadoStrategy());

    const res = await service.registrarSalida(
      tx as never,
      { insumoId: 1, sucursalId: 1, cantidadBase: 45359.2, ordenProduccionId: 7 },
      'Harina',
    );

    // costo = 45359.2 * 0.066138
    expect(res.costoUnitario).toBeCloseTo(0.066138, 6);
    expect(res.costo).toBeCloseTo(45359.2 * 0.066138, 4);

    // existencia baja en cantidad; el promedio se conserva
    const updateData = tx.existencia.update.mock.calls[0][0].data;
    expect(updateData.cantidadBase).toBeCloseTo(45359.2, 4);
    expect(updateData.costoPromedio).toBeCloseTo(0.066138, 6);

    // se asienta un movimiento de SALIDA con origen = la orden
    const movData = tx.movimientoInventario.create.mock.calls[0][0].data;
    expect(movData.tipo).toBe('SALIDA');
    expect(movData.ordenProduccionId).toBe(7);
    expect(Number(movData.cantidadBase)).toBeCloseTo(45359.2, 4);
  });

  it('rechaza si no hay stock suficiente (incl. sin existencia)', async () => {
    const tx = crearTx(null); // sin existencia -> saldo 0
    const service = new InventarioService(new CostoPromedioPonderadoStrategy());

    await expect(
      service.registrarSalida(
        tx as never,
        { insumoId: 1, sucursalId: 1, cantidadBase: 100, ordenProduccionId: 7 },
        'Harina',
      ),
    ).rejects.toThrow(/insuficiente/i);
    expect(tx.movimientoInventario.create).not.toHaveBeenCalled();
  });
});

/**
 * Ajuste manual de stock: suma o resta al costo promedio vigente (el promedio
 * NO cambia) y asienta un AJUSTE con motivo y dirección.
 */
describe('InventarioService.registrarAjuste', () => {
  function crearTx(existencia: { cantidadBase: number; costoPromedio: number } | null) {
    return {
      existencia: {
        findUnique: jest.fn().mockResolvedValue(existencia),
        upsert: jest.fn().mockResolvedValue({}),
      },
      movimientoInventario: {
        create: jest.fn().mockImplementation((a: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 99, ...a.data }),
        ),
      },
    };
  }

  it('aumento: sube la cantidad y conserva el promedio; asienta AJUSTE +', async () => {
    const tx = crearTx({ cantidadBase: 1000, costoPromedio: 5 });
    const service = new InventarioService(new CostoPromedioPonderadoStrategy());

    const res = await service.registrarAjuste(tx as never, {
      insumoId: 1,
      sucursalId: 1,
      incrementa: true,
      cantidadBase: 500,
      motivo: 'conteo físico',
    });

    const updateData = tx.existencia.upsert.mock.calls[0][0].update;
    expect(updateData.cantidadBase).toBeCloseTo(1500, 4);
    expect(updateData.costoPromedio).toBeCloseTo(5, 6); // promedio NO cambia
    const movData = tx.movimientoInventario.create.mock.calls[0][0].data;
    expect(movData.tipo).toBe('AJUSTE');
    expect(movData.incrementa).toBe(true);
    expect(movData.motivo).toBe('conteo físico');
    expect(res.saldoBase).toBeCloseTo(1500, 4);
  });

  it('disminución: baja la cantidad y conserva el promedio; asienta AJUSTE −', async () => {
    const tx = crearTx({ cantidadBase: 1000, costoPromedio: 5 });
    const service = new InventarioService(new CostoPromedioPonderadoStrategy());

    const res = await service.registrarAjuste(tx as never, {
      insumoId: 1,
      sucursalId: 1,
      incrementa: false,
      cantidadBase: 300,
      motivo: 'merma',
    });

    const updateData = tx.existencia.upsert.mock.calls[0][0].update;
    expect(updateData.cantidadBase).toBeCloseTo(700, 4);
    expect(updateData.costoPromedio).toBeCloseTo(5, 6);
    const movData = tx.movimientoInventario.create.mock.calls[0][0].data;
    expect(movData.incrementa).toBe(false);
    expect(res.saldoBase).toBeCloseTo(700, 4);
  });

  it('rechaza una disminución que dejaría el stock negativo', async () => {
    const tx = crearTx({ cantidadBase: 100, costoPromedio: 5 });
    const service = new InventarioService(new CostoPromedioPonderadoStrategy());

    await expect(
      service.registrarAjuste(tx as never, {
        insumoId: 1,
        sucursalId: 1,
        incrementa: false,
        cantidadBase: 300,
        motivo: 'merma',
      }),
    ).rejects.toThrow(/insuficiente/i);
    expect(tx.movimientoInventario.create).not.toHaveBeenCalled();
  });
});
