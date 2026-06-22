import { CajaService } from './caja.service';

/**
 * Fórmula del efectivo esperado y reglas de estado, con prisma mockeado.
 * El flujo completo (abrir→vender→cerrar contra BD) se prueba e2e.
 */
describe('CajaService', () => {
  function prismaMock() {
    return {
      cajaSesion: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      factura: {
        aggregate: jest.fn(({ where }: { where: { metodoPago: unknown } }) =>
          // Efectivo -> 500; otros métodos ({not:'Efectivo'}) -> 200.
          Promise.resolve({
            _sum: { total: where.metodoPago === 'Efectivo' ? 500 : 200 },
          }),
        ),
      },
      abono: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { monto: 100 } }),
      },
      movimientoCaja: {
        aggregate: jest.fn(({ where }: { where: { tipo: string } }) =>
          // Ingresos 50, egresos 30.
          Promise.resolve({ _sum: { monto: where.tipo === 'INGRESO' ? 50 : 30 } }),
        ),
        create: jest.fn(),
      },
    };
  }

  function servicio(prisma: unknown, sucursalId = 1) {
    return new CajaService(prisma as never, {
      obtenerDefaultId: jest.fn().mockResolvedValue(sucursalId),
    } as never);
  }

  const sesionAbierta = {
    id: 1,
    estado: 'ABIERTA',
    sucursalId: 1,
    montoInicial: 100,
    abiertaEn: new Date('2026-06-22T08:00:00Z'),
    cerradaEn: null,
    montoContado: null,
    montoEsperado: null,
    diferencia: null,
    observacion: null,
    usuarioApertura: { nombre: 'Cajero' },
    usuarioCierre: null,
    movimientos: [],
  };

  it('efectivo esperado = inicial + ventas efectivo + abonos + ingresos − egresos', async () => {
    const prisma = prismaMock();
    prisma.cajaSesion.findFirst.mockResolvedValue(sesionAbierta);
    const dto = await servicio(prisma).obtenerActual();
    // 100 + 500 + 100 + 50 − 30 = 720
    expect(dto?.resumen.efectivoEsperado).toBe('720');
    expect(dto?.resumen.ventasContadoEfectivo).toBe('500');
    expect(dto?.resumen.abonosEfectivo).toBe('100');
    expect(dto?.resumen.ventasOtrosMetodos).toBe('200');
  });

  it('no hay caja abierta -> obtenerActual devuelve null', async () => {
    const prisma = prismaMock();
    prisma.cajaSesion.findFirst.mockResolvedValue(null);
    expect(await servicio(prisma).obtenerActual()).toBeNull();
  });

  it('abrir con una caja ya ABIERTA -> 409', async () => {
    const prisma = prismaMock();
    prisma.cajaSesion.findFirst.mockResolvedValue({ id: 9 });
    await expect(
      servicio(prisma).abrir({ montoInicial: 0 }, 1),
    ).rejects.toThrow(/abierta/i);
  });

  it('cerrar una caja ya CERRADA -> 400', async () => {
    const prisma = prismaMock();
    prisma.cajaSesion.findUnique.mockResolvedValue({ id: 1, estado: 'CERRADA' });
    await expect(
      servicio(prisma).cerrar(1, { montoContado: 0 }, 1),
    ).rejects.toThrow(/cerrada/i);
  });
});
