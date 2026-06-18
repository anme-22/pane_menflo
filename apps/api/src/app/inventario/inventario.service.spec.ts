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
