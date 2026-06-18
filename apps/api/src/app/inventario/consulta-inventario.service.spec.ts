import { ConsultaInventarioService } from './consulta-inventario.service';
import { toStockDto, equivalenteLegible } from './inventario.mapper';

const dec = (n: number) => ({ toString: () => String(n) });

describe('ConsultaInventarioService', () => {
  it('kardex: acumula el saldo (entrada + salida) y compone el origen', async () => {
    const prisma = {
      insumo: { findUnique: jest.fn().mockResolvedValue({ id: 1, nombre: 'Harina', tipo: 'peso' }) },
      movimientoInventario: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, tipo: 'ENTRADA', cantidadBase: dec(1000), costoUnitario: dec(2), compraId: 5, ordenProduccionId: null, fecha: new Date('2026-06-01') },
          { id: 2, tipo: 'SALIDA', cantidadBase: dec(300), costoUnitario: dec(2), compraId: null, ordenProduccionId: 7, fecha: new Date('2026-06-02') },
        ]),
      },
    };
    const service = new ConsultaInventarioService(
      prisma as never,
      {} as never,
      { obtenerDefaultId: jest.fn().mockResolvedValue(1) } as never,
    );

    const k = await service.kardex(1);
    expect(k.movimientos[0].saldo).toBe('1000');
    expect(k.movimientos[0].origen).toBe('Compra #5');
    expect(k.movimientos[1].saldo).toBe('700'); // 1000 - 300
    expect(k.movimientos[1].origen).toBe('Producción #7');
    expect(k.saldoFinal).toBe('700');
  });

  it('cobertura: días = stock ÷ consumo diario, marca el insumo limitante', async () => {
    const prisma = {
      receta: {
        findUnique: jest.fn().mockResolvedValue({
          producto: { nombre: 'Pan' },
          ingredientes: [
            { insumoId: 1, cantidad: dec(1), unidadId: 4, insumo: { nombre: 'Harina', tipo: 'peso' } },
          ],
        }),
      },
      existencia: {
        findMany: jest.fn().mockResolvedValue([{ insumoId: 1, cantidadBase: dec(68038.8) }]),
      },
    };
    const conversion = {
      // 1 qq × 3 sacos = 3 qq = 136077.6 g/día
      convertirABase: jest.fn().mockResolvedValue({ cantidadBase: 136077.6, tipo: 'peso' }),
    };
    const service = new ConsultaInventarioService(
      prisma as never,
      conversion as never,
      { obtenerDefaultId: jest.fn().mockResolvedValue(1) } as never,
    );

    const r = await service.cobertura({ productoId: 9, sacosPorDia: 3 });
    expect(r.insumos[0].diasCobertura).toBeCloseTo(0.5, 4); // 68038.8 / 136077.6
    expect(r.diasCoberturaMin).toBeCloseTo(0.5, 4);
    expect(r.insumoLimitante).toBe('Harina');
  });

  it('cobertura: 400 si el producto no tiene receta', async () => {
    const prisma = { receta: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new ConsultaInventarioService(
      prisma as never,
      {} as never,
      { obtenerDefaultId: jest.fn() } as never,
    );
    await expect(
      service.cobertura({ productoId: 9, sacosPorDia: 1 }),
    ).rejects.toThrow(/receta/i);
  });
});

describe('inventario.mapper', () => {
  it('equivalente legible: g→kg, ml→L, conteo→u', () => {
    expect(equivalenteLegible(133809.64, 'peso')).toContain('kg');
    expect(equivalenteLegible(500, 'peso')).toContain('g');
    expect(equivalenteLegible(2000, 'volumen')).toContain('L');
    expect(equivalenteLegible(12, 'conteo')).toContain('u');
  });

  it('toStockDto: marca bajoStock solo si stockMinimo > 0 y stock < umbral', () => {
    const base = { id: 1, nombre: 'Harina', tipo: 'peso', activo: true };
    const bajo = toStockDto({ ...base, stockMinimo: dec(20000) } as never, { cantidadBase: 8000, costoPromedio: 1 });
    expect(bajo.bajoStock).toBe(true);
    const sinUmbral = toStockDto({ ...base, stockMinimo: dec(0) } as never, { cantidadBase: 8000, costoPromedio: 1 });
    expect(sinUmbral.bajoStock).toBe(false);
  });
});
