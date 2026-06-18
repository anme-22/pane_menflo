import { ReportesService } from './reportes.service';

const dec = (n: number) => ({ toString: () => String(n) });
const FECHA = { toISOString: () => '2026-06-15T10:00:00.000Z' } as Date;

describe('ReportesService', () => {
  it('ganancia: ingreso por snapshot − costo por bolsa actual', async () => {
    const prisma = {
      facturaDetalle: {
        findMany: jest.fn().mockResolvedValue([
          { productoId: 1, nombreProducto: 'Pan', precioUnitario: dec(10), cantidad: dec(5) },
        ]),
      },
      receta: {
        findUnique: jest.fn().mockResolvedValue({ rendimiento: 200, ingredientes: [] }),
      },
    };
    const costoReceta = { calcular: jest.fn().mockResolvedValue({ costoPorBolsa: 2 }) };
    const service = new ReportesService(prisma as never, costoReceta as never);

    const r = await service.gananciaPorProducto('2026-06-01', '2026-06-30');
    expect(r.productos[0].ingreso).toBe('50'); // 10 × 5 (snapshot)
    expect(r.productos[0].costoUnitario).toBe('2');
    expect(r.productos[0].costoTotal).toBe('10'); // 2 × 5
    expect(r.productos[0].ganancia).toBe('40'); // 50 − 10
    expect(r.productos[0].conCosteo).toBe(true);
  });

  it('ganancia: producto sin receta queda sin costeo (ganancia = ingreso)', async () => {
    const prisma = {
      facturaDetalle: {
        findMany: jest.fn().mockResolvedValue([
          { productoId: 9, nombreProducto: 'Especial', precioUnitario: dec(20), cantidad: dec(3) },
        ]),
      },
      receta: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new ReportesService(prisma as never, { calcular: jest.fn() } as never);
    const r = await service.gananciaPorProducto('2026-06-01', '2026-06-30');
    expect(r.productos[0].conCosteo).toBe(false);
    expect(r.productos[0].costoUnitario).toBeNull();
    expect(r.productos[0].ganancia).toBe('60'); // 20 × 3, sin costo
  });

  it('consumo: agrega por insumo (cantidad y costo) las salidas del periodo', async () => {
    const prisma = {
      movimientoInventario: {
        findMany: jest.fn().mockResolvedValue([
          { insumoId: 1, cantidadBase: dec(1000), costoUnitario: dec(2), insumo: { nombre: 'Harina', tipo: 'peso' } },
          { insumoId: 1, cantidadBase: dec(500), costoUnitario: dec(2), insumo: { nombre: 'Harina', tipo: 'peso' } },
        ]),
      },
    };
    const service = new ReportesService(prisma as never, {} as never);
    const r = await service.consumoInsumos('2026-06-01', '2026-06-30');
    expect(r.insumos[0].cantidadBase).toBe('1500');
    expect(r.insumos[0].costo).toBe('3000'); // 1500 × 2
    expect(r.insumos[0].unidadBaseAbrev).toBe('g');
    expect(r.costoTotal).toBe('3000');
  });

  it('cuentas por cobrar: saldo = total − abonos, omite las pagadas', async () => {
    const prisma = {
      factura: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, numero: null, fecha: FECHA, total: dec(1000), cliente: { nombre: 'Ana', apellido: 'P' }, abonos: [{ monto: dec(300) }] },
          { id: 2, numero: null, fecha: FECHA, total: dec(500), cliente: null, abonos: [{ monto: dec(500) }] }, // pagada -> fuera
        ]),
      },
    };
    const service = new ReportesService(prisma as never, {} as never);
    const r = await service.cuentasPorCobrar();
    expect(r.cuentas.length).toBe(1);
    expect(r.cuentas[0].saldo).toBe('700');
    expect(r.totalPorCobrar).toBe('700');
  });

  it('rango inválido -> 400', async () => {
    const service = new ReportesService({} as never, {} as never);
    await expect(service.ventas('xx', '2026-06-30')).rejects.toThrow();
  });
});
