import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { CensoLookupResponse, ClienteDto } from '@pane/shared';
import { ClientesService } from './clientes.service';

describe('ClientesService', () => {
  let service: ClientesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar sin filtros hace GET a /clientes', () => {
    service.listar().subscribe();
    const req = http.expectOne('/api/clientes');
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, page: 1, pageSize: 10 });
  });

  it('listar pasa page/pageSize/buscar/activo como query params', () => {
    service.listar({ page: 2, pageSize: 25, buscar: 'ana', activo: true }).subscribe();
    const req = http.expectOne(
      (r) => r.url === '/api/clientes' && r.params.get('buscar') === 'ana',
    );
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('25');
    expect(req.request.params.get('activo')).toBe('true');
    req.flush({ items: [], total: 0, page: 2, pageSize: 25 });
  });

  it('lookupCenso hace GET a /clientes/censo/:identidad', () => {
    const respuesta: CensoLookupResponse = {
      encontrado: true,
      datos: {
        identidad: '0801199012345',
        primerNombre: 'JUAN',
        segundoNombre: 'CARLOS',
        primerApellido: 'PEREZ',
        segundoApellido: 'LOPEZ',
        sexo: 1,
        nombre: 'JUAN CARLOS',
        apellido: 'PEREZ LOPEZ',
      },
    };
    service
      .lookupCenso('0801199012345')
      .subscribe((r) => expect(r).toEqual(respuesta));

    const req = http.expectOne('/api/clientes/censo/0801199012345');
    expect(req.request.method).toBe('GET');
    req.flush(respuesta);
  });

  it('crear hace POST a /clientes con el cuerpo del cliente', () => {
    const cuerpo = {
      identidad: '0801199012345',
      nombre: 'JUAN CARLOS',
      apellido: 'PEREZ LOPEZ',
      telefono: null,
      sexo: 1,
    };
    const creado: ClienteDto = {
      ...cuerpo,
      activo: true,
      creadoEn: '2026-01-01T00:00:00.000Z',
      actualizadoEn: '2026-01-01T00:00:00.000Z',
    };
    service.crear(cuerpo).subscribe((r) => expect(r).toEqual(creado));

    const req = http.expectOne('/api/clientes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cuerpo);
    req.flush(creado);
  });
});
