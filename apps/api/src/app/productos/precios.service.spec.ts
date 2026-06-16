import { PreciosService } from './precios.service';

/**
 * Verifica la regla crítica de la Feature 3: al cambiar el precio se CIERRA el
 * vigente y se ABRE uno nuevo (nunca se edita en sitio), ambos con la misma
 * fecha para que no queden huecos.
 */
describe('PreciosService.cambiarPrecio', () => {
  it('cierra el precio vigente y abre uno nuevo con la misma fecha', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockImplementation((args) =>
      Promise.resolve({
        id: 2,
        productoId: args.data.productoId,
        precio: { toString: () => String(args.data.precio) },
        vigenteDesde: args.data.vigenteDesde,
        vigenteHasta: null,
      }),
    );
    const tx = { precioProducto: { updateMany, create } };
    const prisma = {
      $transaction: (cb: (t: typeof tx) => unknown) => cb(tx),
    } as never;

    const service = new PreciosService(prisma);
    const res = await service.cambiarPrecio(7, 15.5);

    // 1) Cerró el vigente del producto 7 con una fecha.
    expect(updateMany).toHaveBeenCalledTimes(1);
    const cierre = updateMany.mock.calls[0][0];
    expect(cierre.where).toEqual({ productoId: 7, vigenteHasta: null });
    expect(cierre.data.vigenteHasta).toBeInstanceOf(Date);

    // 2) Abrió uno nuevo con la MISMA fecha (sin hueco) y el precio dado.
    expect(create).toHaveBeenCalledTimes(1);
    const apertura = create.mock.calls[0][0];
    expect(apertura.data.productoId).toBe(7);
    expect(apertura.data.precio).toBe(15.5);
    expect(apertura.data.vigenteDesde).toEqual(cierre.data.vigenteHasta);

    // 3) Devuelve el nuevo precio como vigente.
    expect(res.precio).toBe('15.5');
    expect(res.vigenteHasta).toBeNull();
  });
});
