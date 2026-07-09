import { ConfiguracionService } from './configuracion.service';

/** Crea el servicio con un ConfigService que devuelve el mapa dado. */
function crear(env: Record<string, string | undefined>): ConfiguracionService {
  const config = { get: (k: string) => env[k] };
  return new ConfiguracionService({} as never, config as never);
}

describe('ConfiguracionService.obtenerNegocio', () => {
  it('toma los datos del negocio de las variables de entorno', () => {
    const service = crear({
      NEGOCIO_NOMBRE: 'Pan del Valle',
      NEGOCIO_DIRECCION: 'Col. Centro',
      NEGOCIO_TELEFONO: '2222-3333',
      NEGOCIO_RTN: '08011999012345',
      NEGOCIO_MENSAJE_PIE: '¡Vuelva pronto!',
    });
    expect(service.obtenerNegocio()).toEqual({
      nombre: 'Pan del Valle',
      direccion: 'Col. Centro',
      telefono: '2222-3333',
      rtn: '08011999012345',
      mensajePie: '¡Vuelva pronto!',
    });
  });

  it('usa defaults para nombre/pie y null en los opcionales ausentes', () => {
    const service = crear({});
    expect(service.obtenerNegocio()).toEqual({
      nombre: 'Panadería',
      direccion: null,
      telefono: null,
      rtn: null,
      mensajePie: '¡Gracias por su compra!',
    });
  });

  it('trata las cadenas vacías/espacios como ausentes', () => {
    const service = crear({ NEGOCIO_NOMBRE: '   ', NEGOCIO_DIRECCION: '' });
    const negocio = service.obtenerNegocio();
    expect(negocio.nombre).toBe('Panadería');
    expect(negocio.direccion).toBeNull();
  });
});
