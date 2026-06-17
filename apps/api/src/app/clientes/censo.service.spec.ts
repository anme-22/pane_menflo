import { CensoService } from './censo.service';

/**
 * Verifica el lookup del censo (Feature 4): composición de nombres, caso "no
 * encontrado" y la TOLERANCIA de códigos de sexo (0/9/desconocidos no rompen).
 */
describe('CensoService.buscarPorIdentidad', () => {
  function crearServicio(registro: unknown) {
    const findUnique = jest.fn().mockResolvedValue(registro);
    const prisma = { censoNacional: { findUnique } } as never;
    return { service: new CensoService(prisma), findUnique };
  }

  it('compone nombre y apellido y devuelve el sexo del censo', async () => {
    const { service, findUnique } = crearServicio({
      identidad: '0801199012345',
      primerNombre: 'JUAN',
      segundoNombre: 'CARLOS',
      primerApellido: 'PEREZ',
      segundoApellido: 'LOPEZ',
      codSexo: 1,
      fechaNacimiento: null,
    });

    const res = await service.buscarPorIdentidad('0801199012345');

    expect(findUnique).toHaveBeenCalledWith({
      where: { identidad: '0801199012345' },
    });
    expect(res.encontrado).toBe(true);
    expect(res.datos?.nombre).toBe('JUAN CARLOS');
    expect(res.datos?.apellido).toBe('PEREZ LOPEZ');
    expect(res.datos?.sexo).toBe(1);
  });

  it('omite las partes nulas al componer (sin espacios sobrantes)', async () => {
    const { service } = crearServicio({
      identidad: '0801199099999',
      primerNombre: 'MARIA',
      segundoNombre: null,
      primerApellido: 'FLORES',
      segundoApellido: null,
      codSexo: 2,
      fechaNacimiento: null,
    });

    const res = await service.buscarPorIdentidad('0801199099999');

    expect(res.datos?.nombre).toBe('MARIA');
    expect(res.datos?.apellido).toBe('FLORES');
    expect(res.datos?.sexo).toBe(2);
  });

  it('devuelve encontrado=false cuando la identidad no está en el censo', async () => {
    const { service } = crearServicio(null);

    const res = await service.buscarPorIdentidad('9999999999999');

    expect(res.encontrado).toBe(false);
    expect(res.datos).toBeNull();
  });

  it('tolera códigos de sexo desconocidos (0/9): los devuelve sin romper', async () => {
    for (const cod of [0, 9, 7]) {
      const { service } = crearServicio({
        identidad: '0801199000000',
        primerNombre: 'ALEX',
        segundoNombre: null,
        primerApellido: 'GOMEZ',
        segundoApellido: null,
        codSexo: cod,
        fechaNacimiento: null,
      });

      const res = await service.buscarPorIdentidad('0801199000000');

      expect(res.encontrado).toBe(true);
      expect(res.datos?.sexo).toBe(cod);
    }
  });
});
