import { FacturasService } from './facturas.service';

/**
 * Reglas de edición/estado que no tocan la BD. El snapshot, los abonos y la
 * bitácora se prueban e2e contra la BD.
 */
describe('FacturasService', () => {
  function servicioCon(facturaMock: unknown) {
    const prisma = {
      factura: { findUnique: jest.fn().mockResolvedValue(facturaMock) },
    };
    return new FacturasService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  }

  it('editar una factura EMITIDA sin motivo -> 400', async () => {
    const service = servicioCon({ id: 1, estado: 'EMITIDA', tipoPago: 'CONTADO', detalles: [] });
    await expect(
      service.actualizar(1, { tipoPago: 'CREDITO' } as never, 1),
    ).rejects.toThrow(/motivo/i);
  });

  it('editar una factura ANULADA -> 400', async () => {
    const service = servicioCon({ id: 1, estado: 'ANULADA', tipoPago: 'CONTADO', detalles: [] });
    await expect(
      service.actualizar(1, { motivo: 'x' } as never, 1),
    ).rejects.toThrow(/anulada/i);
  });

  it('emitir algo que no es BORRADOR -> 400', async () => {
    const service = servicioCon({ id: 1, estado: 'EMITIDA', detalles: [{ id: 1 }] });
    await expect(service.emitir(1, 1)).rejects.toThrow(/borrador/i);
  });
});
